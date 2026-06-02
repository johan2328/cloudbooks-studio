import type { VisualAtlasPageData } from "../../lib/visual-atlas-types";
import { IMAGE_MODEL, IMAGE_QUALITY, TEMPLATE_VERSION, TEXT_MODEL } from "../../config/generation";

export const VISUAL_ATLAS_V24_CONTRACT = {
  id: "visual-atlas-v24",
  version: TEMPLATE_VERSION,
  renderRevision: "visual-atlas-2026-06-02-c",
  name: "Visual Atlas v24",
  generation: {
    textModel: TEXT_MODEL,
    imageModel: IMAGE_MODEL,
    imageQuality: IMAGE_QUALITY,
    imageSize: "1536x1024" as const,
    allowHighQuality: false,
    costGuardrail: "high_quality_blocked_gpt_image_2_medium_only" as const,
  },
  page: {
    width: 768,
    height: 1152,
    background: "#edf2f8",
    guideColor: "#0969DA",
    trapColor: "#D92D20",
    gridRows: "34px 170px 42px 872px 34px",
    bodyRows: "690px 1fr",
  },
  chrome: {
    topbar: {
      height: 34,
      background: "#061B49",
      color: "#ffffff",
      paddingX: 26,
      fontSize: 14,
      fontWeight: 750,
      letterSpacing: "0",
      showStatusDot: false,
      showCertificationBadge: false,
      textTransform: "none",
    },
    footer: {
      height: 34,
      background: "#061B49",
      color: "#ffffff",
      paddingX: 28,
      fontSize: 14,
      fontWeight: 750,
      brandText: "AI-200 Visual Study Atlas",
      pageNumberFormat: "plain_fraction",
    },
  },
  zones: {
    htmlOwns: [
      "topbar",
      "page title",
      "context deck",
      "guide question",
      "exam traps",
      "autocheck",
      "footer",
      "page number",
    ],
    imageOwns: [
      "four modular concept cards",
      "technical diagrams",
      "small internal labels",
      "decision flows",
      "maps",
      "role badges",
      "callout chips",
    ],
  },
  upperVisual: {
    slotWidth: 752,
    slotHeight: 520,
    requiredCardCount: 4,
    requiredGrid: "2x2",
    role: "upper_visual_asset_only",
    safeMargin: "keep all important content inside a thin production-safe margin",
    style: [
      "premium editorial technical diagram",
      "white background",
      "quiet separators",
      "flat Azure-like line icon family",
      "navy, Azure blue and teal accents",
      "cards should feel like the approved ACR reference style with clean hierarchy",
      "subtle card boundaries, not heavy comic-like outlines",
      "never use a thick outer frame around the 2x2 set",
      "if a card boundary is needed, keep it hairline and low-contrast",
      "avoid forced two-color alternation between cards",
      "module number badges must use one consistent editorial system across all 4 cards",
      "module number badges: navy fill, white text, same size and same corner radius",
      "do not color-code module numbers per card",
      "restrained orange or red only when semantically useful",
      "no 3D",
      "no glossy app icons",
      "no random mixed illustration styles",
      "fill space by recomposing diagrams, hierarchy and relationships, never by stretching existing elements",
      "the internal content bounding box should occupy at least 85% of the image height and 88% of the image width",
      "use fewer larger labels instead of many tiny labels",
      "every card must include one explanatory mini-diagram plus one short readable takeaway",
    ],
    forbiddenComposition: [
      "full page infographic",
      "global page header",
      "global title banner",
      "book cover",
      "marketing hero",
      "dashboard UI",
      "dark background",
      "dense tiny tables",
      "footer",
      "exam traps section",
      "autocheck section",
      "question block",
      "HTML-generated support notes below the four cards",
      "stretched diagrams or non-proportional scaling",
      "squeezed, horizontally compressed or vertically compressed text",
      "inflated cards that only enlarge empty white interiors",
      "thick enclosing rectangle around all four cards",
      "high-saturation card outlines with inconsistent stroke width",
      "per-card numbering style changes",
    ],
    forbiddenText: [
      "AI-200",
      "Azure Certification Atlas",
      "Visual Study Atlas",
      "CloudBooks",
      "DOMINIO",
      "CERTIFICACION",
      "CERTIFICATION",
      "PAGINA",
      "PAGE",
      "TRAMPAS DEL EXAMEN",
      "VERIFICACION AUTOCHECK",
      "PREGUNTA GUIA",
    ],
  },
  hero: {
    titleFontSize: 33,
    titleLineHeight: 1.02,
    deckFontSize: 14,
    deckLineHeight: 1.28,
    iconWidth: 132,
    iconHeight: 96,
  },
  guide: {
    height: 42,
    fontSize: 11.4,
    markerSize: 24,
    markerIcon: "focus_lens",
  },
  exam: {
    headerPaddingY: 4,
    headerFontSize: 7.8,
    bodyPaddingY: 5,
    bodyGap: 3,
    trapItemGap: 3,
    trapNumberSize: 15,
    trapWrongLabel: "Mito",
    trapCorrectionLabel: "Correccion",
    trapWrongTextDecoration: "none",
    trapWrongFontSize: 7.8,
    trapCorrectionFontSize: 7.5,
    autocheckQuestionFontSize: 8.1,
    optionFontSize: 7.8,
    optionPaddingY: 3,
    explanationFontSize: 7.8,
    discardFontSize: 6.8,
  },
  qa: {
    structuralRequiredScore: 10,
    humanArtScoreToProduce: 9.5,
    requireRealUpperVisualForApproval: true,
  },
} as const;

function list(values: readonly string[]): string {
  return values.map((value) => `- ${value}`).join("\n");
}

export function buildUpperVisualPrompt(data: VisualAtlasPageData): string {
  const contract = VISUAL_ATLAS_V24_CONTRACT;
  const modulesText = data.visualModules
    .map((m) => {
      const guidance = [
        m.idea ? `idea: ${m.idea}` : null,
        m.recommendedDiagram ? `recommended diagram: ${m.recommendedDiagram}` : null,
        m.maxMicrocopy ? `max microcopy: ${m.maxMicrocopy}` : null,
        m.examSignal ? `exam signal: ${m.examSignal}` : null,
      ].filter(Boolean).join(" | ");
      return `${m.num}. ${m.title}: ${m.description}${guidance ? `\n   ${guidance}` : ""}`;
    })
    .join("\n");
  const dynamicForbiddenText = [
    data.title,
    data.subtitle,
    data.domainLabel,
    `${data.pageNumber}/${data.totalPages}`,
  ].filter(Boolean);

  return `Create ONLY the modular upper visual asset for CloudBooks ${contract.name}.

Role:
- This image is an upper visual asset, not a complete page.
- It will be inserted into a deterministic HTML page that already owns: ${contract.zones.htmlOwns.join(", ")}.
- Do not design the surrounding page. Start directly with the internal concept composition.

Canvas and composition:
- Landscape technical infographic asset.
- Target HTML slot: ${contract.upperVisual.slotWidth}x${contract.upperVisual.slotHeight}px.
- Requested render size: ${contract.generation.imageSize}; keep safe margins because the HTML slot will fit the image with object-fit: contain.
- Reserve only a very thin internal safety edge on all four sides of the image; no important shape, label, arrow or icon may touch the crop edge.
- The four concept cards should visually occupy most of the canvas. Avoid a timid composition floating in too much white space.
- Push the 2x2 card composition close to the available frame. Do not add a generous white moat around the grid.
- The actual diagram/card content must occupy at least 85% of the image height; never leave a blank lower band inside the PNG.
- Fill unused space by changing the internal composition: add clearer flows, larger icons, relationship arrows, decision paths or callout chips.
- Never fill unused space by stretching diagrams, scaling text non-proportionally, squeezing labels, or simply enlarging a sparse card.
- Preserve natural aspect ratios for icons, arrows, people, service symbols, maps and text blocks.
- Use exactly ${contract.upperVisual.requiredCardCount} internal concept cards in a balanced ${contract.upperVisual.requiredGrid} grid.
- Each internal card may have a small number badge (${data.visualModules.map((m) => m.num).join(", ")}) and a short card title.
- No global header above the cards. No book/page title. No footer.
- Do not wrap all four cards inside one extra outer master frame or giant container box. The cards should read as the primary composition themselves.
- Avoid an enclosing poster-like border that makes the 2x2 layout look shrunken inside the asset.
- Keep card strokes light and editorial. Avoid thick dark borders around every card.
- Avoid making cards look like two hard color families split by columns. Keep one coherent Azure editorial palette.
- Internal text must be easy to read after the image is inserted into a ${contract.upperVisual.slotWidth}x${contract.upperVisual.slotHeight}px slot.
- Prefer fewer labels with larger type rather than many tiny labels.
- Never use spreadsheet-like microtext. Aim for bold, editorial microcopy that remains readable when the full page is viewed at normal screen size.
- If a card feels empty, add one meaningful mini-diagram or decision cue; do not duplicate the guide question or autocheck answer.

Forbidden composition:
${list(contract.upperVisual.forbiddenComposition)}

Forbidden text:
${list([...contract.upperVisual.forbiddenText, ...dynamicForbiddenText])}

Visual style:
${list(contract.upperVisual.style)}

Editorial intent:
- Make the learner understand faster, not merely decorate.
- Each card must combine a compact explanation with a useful mini diagram.
- Each card should follow the supplied intent when present: idea, recommended diagram, maximum microcopy and exam signal.
- Prefer arrows, sequence flows, region maps, decision trees, SKU matrices, security boundaries and cause/effect diagrams when appropriate.
- Spanish labels are allowed only inside the cards and only when they clarify the diagram.

Internal card content:
${modulesText}`;
}
