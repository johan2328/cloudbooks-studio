import { createHash } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import {
  db,
  editorialContentCutsTable,
  groundingCardsTable,
  sourceSnapshotsTable,
  type SourceSnapshot,
} from "@workspace/db";

import { IMAGE_QUALITY, IMAGE_MODEL, TEMPLATE_VERSION } from "../../config/generation";
import { getSeed } from "../../data/page-seeds";
import type { EditorialCard, EditorialCardDeck, FormatAffinity } from "../../domain/editorial-cards/types";

const CHECK_INTERVAL_DAYS = 7;

const AI200_SOURCE_MAP: Record<string, string[]> = {
  "01": ["https://learn.microsoft.com/en-us/azure/container-registry/container-registry-intro"],
  "02": [
    "https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tutorial-quick-task",
    "https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview",
  ],
  "03": ["https://learn.microsoft.com/en-us/azure/container-registry/container-registry-image-tag-version"],
  "04": [
    "https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication",
    "https://learn.microsoft.com/en-us/azure/container-registry/container-registry-roles",
  ],
  "05": [
    "https://learn.microsoft.com/en-us/azure/container-registry/container-registry-private-link",
    "https://learn.microsoft.com/en-us/azure/container-registry/container-registry-access-selected-networks",
  ],
  "06": ["https://learn.microsoft.com/en-us/azure/container-registry/container-registry-tasks-overview"],
  "07": ["https://learn.microsoft.com/en-us/azure/container-registry/container-registry-geo-replication"],
  "08": ["https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-introduction"],
  "09": ["https://learn.microsoft.com/en-us/azure/container-registry/container-registry-import-images"],
  "10": ["https://learn.microsoft.com/en-us/azure/container-registry/container-registry-retention-policy"],
};

export interface GroundingRunResult {
  pageId: string;
  status: "grounding_ready" | "grounding_candidate" | "grounding_locked";
  checkPolicy: "check_source_change_only";
  sourceChanged: boolean;
  candidateCreated: boolean;
  snapshotStatus: "locked" | "candidate" | "mixed";
  checkedAt: string;
  expiresAt: string | null;
  contentCutId: string | null;
  sourceRefs: string[];
  snapshotIds: number[];
  cards: EditorialCard[];
  deck: EditorialCardDeck | null;
  message: string;
}

interface FetchedSource {
  sourceUrl: string;
  sourceTitle: string;
  sourceLastUpdated: string | null;
  etag: string | null;
  lastModified: string | null;
  rawExtract: string;
  normalizedExtract: string;
  contentHash: string;
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function compact(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  const sentence = normalized.match(/^.{1,260}?[.!?](\s|$)/)?.[0]?.trim();
  const source = sentence && sentence.length <= maxChars ? sentence : normalized;
  return source.slice(0, maxChars).replace(/\s+\S*$/, "").trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeta(html: string, sourceUrl: string): Pick<FetchedSource, "sourceTitle" | "sourceLastUpdated"> {
  const title =
    html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    ?? sourceUrl;
  const sourceLastUpdated =
    html.match(/<meta\s+name=["']ms\.date["']\s+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta\s+name=["']updated_at["']\s+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/Last updated on\s+([0-9]{4}-[0-9]{2}-[0-9]{2})/i)?.[1]
    ?? null;
  return {
    sourceTitle: compact(title, 180),
    sourceLastUpdated,
  };
}

async function fetchSource(sourceUrl: string): Promise<FetchedSource> {
  const res = await fetch(sourceUrl, {
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "User-Agent": "CloudBooks-Studio-Grounding/1.0",
    },
  });
  if (!res.ok) {
    throw new Error(`Microsoft Learn source failed ${res.status}: ${sourceUrl}`);
  }
  const html = await res.text();
  const meta = extractMeta(html, sourceUrl);
  const normalizedExtract = compact(stripHtml(html), 12000);
  const rawExtract = compact(html.replace(/\s+/g, " "), 18000);
  const contentHash = hashText([
    sourceUrl,
    meta.sourceTitle,
    meta.sourceLastUpdated ?? "",
    normalizedExtract,
  ].join("\n"));
  return {
    sourceUrl,
    sourceTitle: meta.sourceTitle,
    sourceLastUpdated: meta.sourceLastUpdated,
    etag: res.headers.get("etag"),
    lastModified: res.headers.get("last-modified"),
    rawExtract,
    normalizedExtract,
    contentHash,
  };
}

async function latestSnapshot(pageId: string, sourceUrl: string, status: "locked" | "candidate"): Promise<SourceSnapshot | null> {
  const [row] = await db
    .select()
    .from(sourceSnapshotsTable)
    .where(and(
      eq(sourceSnapshotsTable.certificationId, "ai-200"),
      eq(sourceSnapshotsTable.pageId, pageId),
      eq(sourceSnapshotsTable.sourceUrl, sourceUrl),
      eq(sourceSnapshotsTable.status, status),
    ))
    .orderBy(desc(sourceSnapshotsTable.snapshotVersion), desc(sourceSnapshotsTable.id))
    .limit(1);
  return row ?? null;
}

async function createSnapshot(pageId: string, fetched: FetchedSource, status: "locked" | "candidate", version: number): Promise<SourceSnapshot> {
  const [created] = await db
    .insert(sourceSnapshotsTable)
    .values({
      certificationId: "ai-200",
      pageId,
      sourceUrl: fetched.sourceUrl,
      sourceTitle: fetched.sourceTitle,
      sourceLastUpdated: fetched.sourceLastUpdated,
      etag: fetched.etag,
      lastModified: fetched.lastModified,
      contentHash: fetched.contentHash,
      rawExtract: fetched.rawExtract,
      normalizedExtract: fetched.normalizedExtract,
      snapshotVersion: version,
      status,
      metadata: {
        provider: "microsoft_learn",
        checkPolicy: "check_source_change_only",
        checkIntervalDays: CHECK_INTERVAL_DAYS,
      },
      acceptedAt: status === "locked" ? new Date() : null,
    })
    .returning();
  return created;
}

async function verifySourceSnapshot(pageId: string, sourceUrl: string): Promise<{
  locked: SourceSnapshot;
  candidate: SourceSnapshot | null;
  sourceChanged: boolean;
  candidateCreated: boolean;
}> {
  const fetched = await fetchSource(sourceUrl);
  const locked = await latestSnapshot(pageId, sourceUrl, "locked");
  if (!locked) {
    const created = await createSnapshot(pageId, fetched, "locked", 1);
    return { locked: created, candidate: null, sourceChanged: false, candidateCreated: false };
  }

  if (locked.contentHash === fetched.contentHash) {
    await db
      .update(sourceSnapshotsTable)
      .set({
        checkedAt: new Date(),
        etag: fetched.etag ?? locked.etag,
        lastModified: fetched.lastModified ?? locked.lastModified,
        sourceLastUpdated: fetched.sourceLastUpdated ?? locked.sourceLastUpdated,
      })
      .where(eq(sourceSnapshotsTable.id, locked.id));
    return { locked, candidate: null, sourceChanged: false, candidateCreated: false };
  }

  const existingCandidate = await latestSnapshot(pageId, sourceUrl, "candidate");
  if (existingCandidate?.contentHash === fetched.contentHash) {
    return { locked, candidate: existingCandidate, sourceChanged: true, candidateCreated: false };
  }

  const candidate = await createSnapshot(pageId, fetched, "candidate", locked.snapshotVersion + 1);
  return { locked, candidate, sourceChanged: true, candidateCreated: true };
}

function cardFromSnapshot(args: {
  snapshot: SourceSnapshot;
  pageId: string;
  id: string;
  role: EditorialCard["role"];
  title: string;
  claim: string;
  explanation: string;
  diagramIntent: string;
  examSignal: string;
  formatAffinity: FormatAffinity[];
  targetZone?: EditorialCard["targetZone"];
  densityScore?: number;
}): EditorialCard {
  return {
    id: args.id,
    pageId: args.pageId,
    sourceSnapshotId: args.snapshot.id,
    role: args.role,
    status: "selected",
    targetZone: args.targetZone ?? "complement",
    title: compact(args.title, 64),
    claim: compact(args.claim, 120),
    explanation: compact(args.explanation, 190),
    diagramIntent: compact(args.diagramIntent, 150),
    examSignal: compact(args.examSignal, 120),
    sourceRefs: [`snapshot:${args.snapshot.id}`, args.snapshot.sourceUrl],
    formatAffinity: args.formatAffinity,
    densityScore: args.densityScore ?? 9.1,
    visualRisk: "low",
  };
}

function buildCardsFromLockedSnapshots(pageId: string, snapshots: SourceSnapshot[]): EditorialCard[] {
  const seed = getSeed(pageId);
  if (!seed.found || snapshots.length === 0) return [];
  const data = seed.data;
  const primary = snapshots[0];
  const secondary = snapshots[1] ?? primary;
  const firstModule = data.visualModules[0];
  const secondModule = data.visualModules[1] ?? firstModule;
  const answer = data.autocheck.options[data.autocheck.correctOption] ?? "respuesta correcta";
  const normalized = primary.normalizedExtract;
  const sourceLead = compact(normalized, 180);

  return [
    cardFromSnapshot({
      snapshot: primary,
      pageId,
      id: `grounding-insight-${pageId}`,
      role: "concept",
      targetZone: "primary",
      title: "Insight tecnico",
      claim: firstModule.idea ?? firstModule.description,
      explanation: sourceLead || data.context,
      diagramIntent: firstModule.recommendedDiagram ?? "mini-diagrama causa-efecto con servicio, decision y resultado",
      examSignal: firstModule.examSignal ?? data.guideQuestion,
      formatAffinity: ["visual_atlas", "master_book", "cheat_sheet", "rapid_review"],
      densityScore: 9.2,
    }),
    cardFromSnapshot({
      snapshot: secondary,
      pageId,
      id: `grounding-exam-example-${pageId}`,
      role: "micro_case",
      title: "Ejemplo de examen",
      claim: `Situacion: ${secondModule.title}. Decision correcta: ${answer}.`,
      explanation: data.autocheck.explanation,
      diagramIntent: "micro-caso con condicion, opcion correcta y consecuencia visible",
      examSignal: data.autocheck.question,
      formatAffinity: ["visual_atlas", "question_bank", "rapid_review"],
      densityScore: 9.0,
    }),
    cardFromSnapshot({
      snapshot: primary,
      pageId,
      id: `grounding-trap-${pageId}`,
      role: "trap",
      targetZone: "rail",
      title: "Trampa fuente",
      claim: data.traps[0]?.wrong ?? data.guideQuestion,
      explanation: data.traps[0]?.correction ?? data.context,
      diagramIntent: "contraste mito versus correccion con una senal de examen",
      examSignal: data.traps[0]?.wrong ?? data.guideQuestion,
      formatAffinity: ["visual_atlas", "exam_traps", "question_bank", "rapid_review"],
      densityScore: 8.9,
    }),
    cardFromSnapshot({
      snapshot: secondary,
      pageId,
      id: `grounding-decision-rule-${pageId}`,
      role: "decision",
      title: "Regla de decision",
      claim: data.guideQuestion,
      explanation: compact(`${answer}: ${data.autocheck.explanation}`, 190),
      diagramIntent: "arbol de decision compacto con senal, restriccion y camino correcto",
      examSignal: answer,
      formatAffinity: ["visual_atlas", "master_book", "cheat_sheet", "rapid_review"],
      densityScore: 9.3,
    }),
    cardFromSnapshot({
      snapshot: primary,
      pageId,
      id: `grounding-causal-${pageId}`,
      role: "flow",
      title: "Relacion causal visual",
      claim: `${firstModule.title} -> ${secondModule.title}`,
      explanation: compact(`${firstModule.description} ${secondModule.description}`, 190),
      diagramIntent: "flujo con flechas que conecta condicion tecnica, permiso/servicio y efecto observable",
      examSignal: data.traps[1]?.wrong ?? data.guideQuestion,
      formatAffinity: ["visual_atlas", "master_book", "exam_traps", "rapid_review"],
      densityScore: 9.1,
    }),
  ];
}

async function persistCards(pageId: string, contentCutId: string, cards: EditorialCard[]): Promise<void> {
  if (cards.length === 0) return;
  await db.delete(groundingCardsTable).where(and(
    eq(groundingCardsTable.certificationId, "ai-200"),
    eq(groundingCardsTable.pageId, pageId),
    eq(groundingCardsTable.contentCutId, contentCutId),
  ));
  await db.insert(groundingCardsTable).values(cards.map((card) => ({
    certificationId: "ai-200",
    pageId,
    sourceSnapshotId: card.sourceSnapshotId ?? 0,
    contentCutId,
    cardId: card.id,
    role: card.role,
    targetZone: card.targetZone,
    title: card.title,
    claim: card.claim,
    explanation: card.explanation,
    diagramIntent: card.diagramIntent,
    examSignal: card.examSignal,
    formatAffinity: card.formatAffinity,
    densityScore: card.densityScore,
    visualRisk: card.visualRisk,
    status: card.status,
  })));
}

async function createContentCut(pageId: string, lockedSnapshots: SourceSnapshot[], cards: EditorialCard[], user?: { id: number | null; displayName: string }): Promise<string> {
  const snapshotIds = lockedSnapshots.map((snapshot) => snapshot.id);
  const deckHash = hashText(JSON.stringify(cards.map((card) => ({
    id: card.id,
    role: card.role,
    title: card.title,
    claim: card.claim,
    explanation: card.explanation,
    sourceSnapshotId: card.sourceSnapshotId,
  }))));
  const snapshotHash = hashText(JSON.stringify(lockedSnapshots.map((snapshot) => ({
    id: snapshot.id,
    hash: snapshot.contentHash,
    version: snapshot.snapshotVersion,
  })))).slice(0, 12);
  const contentCutId = `ai-200-${pageId}-${snapshotHash}-${deckHash.slice(0, 10)}`;
  const [existing] = await db
    .select()
    .from(editorialContentCutsTable)
    .where(eq(editorialContentCutsTable.contentCutId, contentCutId))
    .limit(1);
  if (!existing) {
    await db.insert(editorialContentCutsTable).values({
      certificationId: "ai-200",
      pageId,
      contentCutId,
      snapshotIds,
      sourceStatus: "locked",
      deckHash,
      promptHash: null,
      model: IMAGE_MODEL,
      quality: IMAGE_QUALITY,
      templateVersion: TEMPLATE_VERSION,
      status: "locked",
      createdById: user?.id ?? null,
      createdByName: user?.displayName ?? "Sistema",
      acceptedAt: new Date(),
    });
  }
  await persistCards(pageId, contentCutId, cards);
  return contentCutId;
}

export function sourceUrlsForPage(pageId: string): string[] {
  return AI200_SOURCE_MAP[pageId] ?? AI200_SOURCE_MAP["01"];
}

export async function runSelectiveGroundingWithSnapshots(pageId: string, user?: { id: number | null; displayName: string }): Promise<GroundingRunResult> {
  const urls = sourceUrlsForPage(pageId);
  const checkedAt = new Date().toISOString();
  const verified = await Promise.all(urls.map((url) => verifySourceSnapshot(pageId, url)));
  const lockedSnapshots = verified.map((item) => item.locked);
  const sourceChanged = verified.some((item) => item.sourceChanged);
  const candidateCreated = verified.some((item) => item.candidateCreated);
  const candidates = verified.map((item) => item.candidate).filter((item): item is SourceSnapshot => Boolean(item));
  const cards = buildCardsFromLockedSnapshots(pageId, lockedSnapshots);
  const contentCutId = cards.length > 0
    ? await createContentCut(pageId, lockedSnapshots, cards, user)
    : null;
  const deck: EditorialCardDeck | null = contentCutId ? {
    version: "editorial-card-deck-v1",
    pageId,
    source: sourceChanged ? "grounding_candidate" : "grounding_locked",
    generatedAt: checkedAt,
    contentCutId,
    snapshotIds: lockedSnapshots.map((snapshot) => snapshot.id),
    cards,
    selectedCardIds: cards.map((card) => card.id),
    rejectedCardIds: [],
  } : null;
  return {
    pageId,
    status: sourceChanged ? "grounding_candidate" : "grounding_locked",
    checkPolicy: "check_source_change_only",
    sourceChanged,
    candidateCreated,
    snapshotStatus: sourceChanged ? "mixed" : "locked",
    checkedAt,
    expiresAt: null,
    contentCutId,
    sourceRefs: lockedSnapshots.map((snapshot) => `snapshot:${snapshot.id}:${snapshot.sourceUrl}`),
    snapshotIds: lockedSnapshots.map((snapshot) => snapshot.id),
    cards,
    deck,
    message: sourceChanged
      ? `Fuente cambiada: se creo snapshot candidato (${candidates.map((item) => item.id).join(",") || "existente"}). Produccion sigue usando locked.`
      : "Fuentes verificadas sin cambio; se conserva el corte editorial locked.",
  };
}

export async function acceptLatestCandidateSnapshot(pageId: string, sourceUrl: string): Promise<SourceSnapshot | null> {
  const candidate = await latestSnapshot(pageId, sourceUrl, "candidate");
  if (!candidate) return null;
  await db
    .update(sourceSnapshotsTable)
    .set({ status: "superseded" })
    .where(and(
      eq(sourceSnapshotsTable.certificationId, "ai-200"),
      eq(sourceSnapshotsTable.pageId, pageId),
      eq(sourceSnapshotsTable.sourceUrl, sourceUrl),
      eq(sourceSnapshotsTable.status, "locked"),
    ));
  const [accepted] = await db
    .update(sourceSnapshotsTable)
    .set({ status: "locked", acceptedAt: new Date(), checkedAt: new Date() })
    .where(eq(sourceSnapshotsTable.id, candidate.id))
    .returning();
  return accepted ?? null;
}
