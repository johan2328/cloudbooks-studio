import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from "react";
import type { StudioState, StudioAction, AtlasPage, GenerationRun, QAReport, UserActionLog, ExportAsset, OutputPack, AssetType } from "./types";
import { buildInitialState } from "./demo-data";

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function nextVersion(current: string): string {
  const match = current.match(/^v(\d+)(?:\.(\d+))?$/);
  if (!match) return "v1";
  const major = parseInt(match[1], 10);
  const minor = match[2] !== undefined ? parseInt(match[2], 10) : 0;
  return minor === 0 ? `v${major}.1` : `v${major}.${minor + 1}`;
}

/* ─── Reducer ────────────────────────────────────────────────────────────── */
function reducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {

    case "EXECUTE_GROUNDING": {
      const now = nowISO();
      const pages = state.pages.map(p =>
        p.id === action.pageId
          ? { ...p, status: "grounded" as const, groundingStatus: "verified" as const, groundedAt: now }
          : p
      );
      const log: UserActionLog = {
        id: uid(), actionType: "grounding_executed", pageId: action.pageId,
        pageTitle: state.pages.find(p => p.id === action.pageId)?.title,
        pageNumber: state.pages.find(p => p.id === action.pageId)?.pageNumber,
        userId: action.userId, userName: action.userName,
        result: "Grounding ejecutado y verificado — fuentes Microsoft Learn confirmadas",
        createdAt: now,
      };
      return { ...state, pages, actionLog: [log, ...state.actionLog] };
    }

    case "START_GENERATION": {
      const now = nowISO();
      const page = state.pages.find(p => p.id === action.pageId);
      if (!page) return state;
      const newVersion = nextVersion(page.currentVersion);
      const activeModel = action.model ?? "gpt-4o-mini";
      const run: GenerationRun = {
        id: uid(), pageId: action.pageId, type: "full_generation",
        status: "running", model: activeModel,
        version: newVersion, note: `Generación ${newVersion}`,
        createdAt: now,
      };
      const pages = state.pages.map(p =>
        p.id === action.pageId
          ? { ...p, status: "generating" as const, currentVersion: newVersion }
          : p
      );
      const log: UserActionLog = {
        id: uid(), actionType: "generation_started", pageId: action.pageId,
        pageTitle: page.title, pageNumber: page.pageNumber,
        userId: action.userId, userName: action.userName,
        result: `Run iniciado — modelo ${activeModel} · ${newVersion}`,
        createdAt: now,
      };
      // Auto-complete after 3s via COMPLETE_GENERATION (caller is responsible)
      return { ...state, pages, runs: [run, ...state.runs], actionLog: [log, ...state.actionLog] };
    }

    case "COMPLETE_GENERATION": {
      const now = nowISO();
      const runs = state.runs.map(r =>
        r.id === action.runId
          ? { ...r, status: "completed" as const, completedAt: now, promptTokens: 2100, completionTokens: 950 }
          : r
      );
      const pages = state.pages.map(p =>
        p.id === action.pageId ? { ...p, status: "qa_pending" as const } : p
      );
      const page = state.pages.find(p => p.id === action.pageId);
      const log: UserActionLog = {
        id: uid(), actionType: "generation_completed", pageId: action.pageId,
        pageTitle: page?.title, pageNumber: page?.pageNumber,
        userId: "system", userName: "Sistema",
        result: `Generación completada — página lista para QA`,
        createdAt: now,
      };
      return { ...state, pages, runs, actionLog: [log, ...state.actionLog] };
    }

    case "EXECUTE_QA": {
      const now = nowISO();
      const page = state.pages.find(p => p.id === action.pageId);
      if (!page) return state;
      // Scores deterministas basados en qaScore conocido — sin Math.random
      const base = page.qaScore ?? 90;
      const dims = {
        artDirection:         Math.round(Math.min(100, base * 1.02) * 10) / 10,
        editorialConsistency: Math.round(Math.min(100, base * 0.99) * 10) / 10,
        readability:          Math.round(Math.min(100, base * 1.01) * 10) / 10,
        technicalAccuracy:    Math.round(Math.min(100, base * 1.03) * 10) / 10,
        density:              Math.round(Math.min(100, base * 0.98) * 10) / 10,
        commercialRisk:       Math.round(Math.min(100, base * 1.01) * 10) / 10,
        total: 0,
      };
      dims.total = (dims.artDirection + dims.editorialConsistency + dims.readability + dims.technicalAccuracy + dims.density + dims.commercialRisk) / 6;
      const verdict = dims.total >= 92 ? "approved" as const : "needs_revision" as const;
      const report: QAReport = {
        id: uid(), pageId: action.pageId,
        dimensions: { ...dims, artDirection: Math.round(dims.artDirection * 10)/10, editorialConsistency: Math.round(dims.editorialConsistency * 10)/10, readability: Math.round(dims.readability * 10)/10, technicalAccuracy: Math.round(dims.technicalAccuracy * 10)/10, density: Math.round(dims.density * 10)/10, commercialRisk: Math.round(dims.commercialRisk * 10)/10, total: Math.round(dims.total * 10)/10 },
        observations: verdict === "approved"
          ? ["Composición visual cumple con el contrato Visual Atlas v24", "Terminología técnica alineada con skill outline AI-200"]
          : ["Revisar densidad visual en sección de conceptos", "Verificar coherencia iconográfica entre bloques"],
        redTeamLog: verdict === "approved"
          ? ["✓ Estructura de página cumple contrato v24", "✓ Score red team ≥ 9.2 — aceptable para revisión editorial"]
          : ["⚠ Score red team por debajo del objetivo 9.5", "⚠ Se detectaron observaciones que requieren corrección"],
        defectsFound: verdict === "needs_revision" ? ["empty_gap"] : [],
        verdict, reviewer: action.userName, createdAt: now,
      };
      const newStatus = verdict === "approved" ? "qa_review" as const : "needs_revision" as const;
      const pages = state.pages.map(p =>
        p.id === action.pageId ? { ...p, status: newStatus, qaScore: Math.round(dims.total * 10)/10 } : p
      );
      const log: UserActionLog = {
        id: uid(), actionType: "qa_executed", pageId: action.pageId,
        pageTitle: page.title, pageNumber: page.pageNumber,
        userId: action.userId, userName: action.userName,
        result: `QA ${Math.round(dims.total)}/100 — ${verdict === "approved" ? "listo para aprobación" : "requiere corrección"}`,
        createdAt: now,
      };
      return { ...state, pages, qaReports: [report, ...state.qaReports], actionLog: [log, ...state.actionLog] };
    }

    case "APPROVE_PAGE": {
      const now = nowISO();
      const page = state.pages.find(p => p.id === action.pageId);
      if (!page) return state;
      const pages = state.pages.map(p =>
        p.id === action.pageId ? { ...p, status: "approved" as const, lastRevision: now.slice(0,10) } : p
      );
      const log: UserActionLog = {
        id: uid(), actionType: "page_approved", pageId: action.pageId,
        pageTitle: page.title, pageNumber: page.pageNumber,
        userId: action.userId, userName: action.userName,
        result: `Página aprobada — lista para exportación · Contrato ${page.contractVersion}`,
        createdAt: now,
      };
      return { ...state, pages, actionLog: [log, ...state.actionLog] };
    }

    case "REQUEST_REVISION": {
      const now = nowISO();
      const page = state.pages.find(p => p.id === action.pageId);
      if (!page) return state;
      const pages = state.pages.map(p =>
        p.id === action.pageId ? { ...p, status: "needs_revision" as const } : p
      );
      const log: UserActionLog = {
        id: uid(), actionType: "revision_requested", pageId: action.pageId,
        pageTitle: page.title, pageNumber: page.pageNumber,
        userId: action.userId, userName: action.userName,
        result: `Corrección solicitada`, note: action.note,
        createdAt: now,
      };
      return { ...state, pages, actionLog: [log, ...state.actionLog] };
    }

    case "REGENERATE_SELECTIVE": {
      const now = nowISO();
      const page = state.pages.find(p => p.id === action.pageId);
      if (!page) return state;
      const newVersion = nextVersion(page.currentVersion);
      const run: GenerationRun = {
        id: uid(), pageId: action.pageId, type: "selective_regeneration",
        status: "completed", model: "gpt-4o-mini", version: newVersion,
        note: `Regeneración selectiva ${newVersion}`,
        createdAt: now, completedAt: now,
        promptTokens: 650,
        completionTokens: 420,
      };
      const pages = state.pages.map(p =>
        p.id === action.pageId ? { ...p, status: "qa_pending" as const, currentVersion: newVersion } : p
      );
      const log: UserActionLog = {
        id: uid(), actionType: "selective_regeneration", pageId: action.pageId,
        pageTitle: page.title, pageNumber: page.pageNumber,
        userId: action.userId, userName: action.userName,
        result: `Regeneración selectiva completada — ${newVersion} lista para QA`,
        createdAt: now,
      };
      return { ...state, pages, runs: [run, ...state.runs], actionLog: [log, ...state.actionLog] };
    }

    case "EXPORT_PAGE": {
      const now = nowISO();
      const page = state.pages.find(p => p.id === action.pageId);
      if (!page) return state;
      if (page.status !== "approved" && page.status !== "exported") return state;
      const asset: ExportAsset = {
        id: uid(), pageId: action.pageId, format: action.format,
        filename: `ai200-p${page.pageNumber}-${page.currentVersion}.${action.format.toLowerCase()}`,
        version: page.currentVersion, createdAt: now,
      };
      const pages = state.pages.map(p =>
        p.id === action.pageId ? { ...p, status: "exported" as const } : p
      );
      const log: UserActionLog = {
        id: uid(), actionType: "page_exported", pageId: action.pageId,
        pageTitle: page.title, pageNumber: page.pageNumber,
        userId: action.userId, userName: action.userName,
        result: `Exportada como ${action.format} — ${asset.filename}`,
        createdAt: now,
      };
      return { ...state, pages, exports: [asset, ...state.exports], actionLog: [log, ...state.actionLog] };
    }

    case "UPDATE_CONTRACT": {
      const now = nowISO();
      const contract = state.contracts.find(c => c.id === action.contractId);
      if (!contract) return state;
      const versionParts = contract.version.match(/^v(\d+)(?:\.(\d+))?$/);
      const newVer = versionParts
        ? (versionParts[2] !== undefined
            ? `v${versionParts[1]}.${parseInt(versionParts[2])+1}`
            : `v${parseInt(versionParts[1])+1}`)
        : contract.version;
      const contracts = state.contracts.map(c =>
        c.id === action.contractId
          ? {
              ...c,
              version: newVer,
              lastUpdated: now.slice(0,10),
              changelog: [{ version: newVer, note: action.changeNote, at: now, author: action.userName }, ...c.changelog],
            }
          : c
      );
      const log: UserActionLog = {
        id: uid(), actionType: "contract_updated",
        userId: action.userId, userName: action.userName,
        result: `${contract.name} actualizado a ${newVer}`,
        note: action.changeNote,
        createdAt: now,
      };
      return { ...state, contracts, actionLog: [log, ...state.actionLog] };
    }

    case "UPLOAD_ASSET_DEMO": {
      const now = nowISO();
      const page = state.pages.find(p => p.id === action.pageId);
      const outputPacks = state.outputPacks.map(pack =>
        pack.pageId !== action.pageId ? pack : {
          ...pack,
          slots: {
            ...pack.slots,
            [action.assetType]: {
              ...pack.slots[action.assetType],
              status: "real_available" as const,
              isDemo: false,
              uploadedAt: now,
              uploadedBy: action.userName,
              filename: `ai200-p${pack.pageNumber}-real.${action.assetType}`,
              note: "Asset real cargado — pendiente de aprobación editorial",
            },
          },
        }
      );
      const log: UserActionLog = {
        id: uid(), actionType: "asset_uploaded", pageId: action.pageId,
        pageTitle: page?.title, pageNumber: page?.pageNumber,
        userId: action.userId, userName: action.userName,
        result: `Asset ${action.assetType.toUpperCase()} cargado — pág. ${action.pageId} · pendiente de aprobación`,
        createdAt: now,
      };
      return { ...state, outputPacks, actionLog: [log, ...state.actionLog] };
    }

    case "LINK_ASSET": {
      const now = nowISO();
      const page = state.pages.find(p => p.id === action.pageId);
      const outputPacks = state.outputPacks.map(pack =>
        pack.pageId !== action.pageId ? pack : {
          ...pack,
          slots: {
            ...pack.slots,
            [action.assetType]: {
              ...pack.slots[action.assetType],
              status: "real_available" as const,
              isDemo: false,
              url: action.url,
              filename: action.filename,
              uploadedAt: now,
              uploadedBy: action.userName,
              note: `Vinculado desde: ${action.url}`,
            },
          },
        }
      );
      const log: UserActionLog = {
        id: uid(), actionType: "asset_linked", pageId: action.pageId,
        pageTitle: page?.title, pageNumber: page?.pageNumber,
        userId: action.userId, userName: action.userName,
        result: `Asset ${action.assetType.toUpperCase()} vinculado — ${action.filename}`,
        createdAt: now,
      };
      return { ...state, outputPacks, actionLog: [log, ...state.actionLog] };
    }

    case "APPROVE_ASSET": {
      const now = nowISO();
      const page = state.pages.find(p => p.id === action.pageId);
      const outputPacks = state.outputPacks.map(pack =>
        pack.pageId !== action.pageId ? pack : {
          ...pack,
          slots: {
            ...pack.slots,
            [action.assetType]: {
              ...pack.slots[action.assetType],
              status: "approved" as const,
              note: `Aprobado por ${action.userName} · ${now.slice(0, 10)}`,
            },
          },
        }
      );
      const log: UserActionLog = {
        id: uid(), actionType: "asset_approved", pageId: action.pageId,
        pageTitle: page?.title, pageNumber: page?.pageNumber,
        userId: action.userId, userName: action.userName,
        result: `Asset ${action.assetType.toUpperCase()} aprobado para producción — pág. ${action.pageId}`,
        createdAt: now,
      };
      return { ...state, outputPacks, actionLog: [log, ...state.actionLog] };
    }

    case "REPLACE_ASSET_REQUEST": {
      const now = nowISO();
      const page = state.pages.find(p => p.id === action.pageId);
      const outputPacks = state.outputPacks.map(pack =>
        pack.pageId !== action.pageId ? pack : {
          ...pack,
          slots: {
            ...pack.slots,
            [action.assetType]: {
              ...pack.slots[action.assetType],
              status: "needs_replacement" as const,
              note: `Reemplazo solicitado por ${action.userName} · ${now.slice(0, 10)}`,
            },
          },
        }
      );
      const log: UserActionLog = {
        id: uid(), actionType: "asset_replaced", pageId: action.pageId,
        pageTitle: page?.title, pageNumber: page?.pageNumber,
        userId: action.userId, userName: action.userName,
        result: `Asset ${action.assetType.toUpperCase()} marcado para reemplazo — pág. ${action.pageId}`,
        createdAt: now,
      };
      return { ...state, outputPacks, actionLog: [log, ...state.actionLog] };
    }

    case "HYDRATE":
      return action.state;

    default:
      return state;
  }
}

/* ─── Context ────────────────────────────────────────────────────────────── */
const STORAGE_KEY = "cloudbooks-studio-state-v3";

interface StudioContextValue {
  state: StudioState;
  dispatch: React.Dispatch<StudioAction>;
  /* Acciones de producción */
  executeGrounding: (pageId: string) => void;
  startGeneration: (pageId: string, model?: string) => void;
  executeQA: (pageId: string) => void;
  approvePage: (pageId: string) => void;
  requestRevision: (pageId: string, note: string) => void;
  regenerateSelective: (pageId: string) => void;
  exportPage: (pageId: string, format: ExportAsset["format"]) => void;
  updateContract: (contractId: string, changeNote: string) => void;
  /* Acciones de assets */
  uploadAssetDemo: (pageId: string, assetType: AssetType) => void;
  linkAsset: (pageId: string, assetType: AssetType, url: string, filename: string) => void;
  approveAsset: (pageId: string, assetType: AssetType) => void;
  replaceAssetRequest: (pageId: string, assetType: AssetType) => void;
  /* Queries */
  getPage: (pageId: string) => AtlasPage | undefined;
  getRunsForPage: (pageId: string, includeDemo?: boolean) => GenerationRun[];
  getQAForPage: (pageId: string) => QAReport | undefined;
  getExportsForPage: (pageId: string) => ExportAsset[];
  getOutputPackForPage: (pageId: string) => OutputPack | undefined;
}

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as StudioState;
    } catch { /* ignore */ }
    return buildInitialState();
  });

  /* Persist to localStorage on every change */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore quota errors */ }
  }, [state]);

  const currentUser = { userId: "u-active", userName: "Usuario activo" };

  const executeGrounding = useCallback((pageId: string) => {
    dispatch({ type: "EXECUTE_GROUNDING", pageId, ...currentUser });
  }, []);

  const startGeneration = useCallback((pageId: string, model = "gpt-4o-mini") => {
    dispatch({ type: "START_GENERATION", pageId, model, ...currentUser });
    // Simulate async completion after 3.5s
    const runId = uid();
    setTimeout(() => dispatch({ type: "COMPLETE_GENERATION", pageId, runId }), 3500);
  }, []);

  const executeQA = useCallback((pageId: string) => {
    dispatch({ type: "EXECUTE_QA", pageId, ...currentUser });
  }, []);

  const approvePage = useCallback((pageId: string) => {
    dispatch({ type: "APPROVE_PAGE", pageId, ...currentUser });
  }, []);

  const requestRevision = useCallback((pageId: string, note: string) => {
    dispatch({ type: "REQUEST_REVISION", pageId, note, ...currentUser });
  }, []);

  const regenerateSelective = useCallback((pageId: string) => {
    dispatch({ type: "REGENERATE_SELECTIVE", pageId, ...currentUser });
  }, []);

  const exportPage = useCallback((pageId: string, format: ExportAsset["format"]) => {
    dispatch({ type: "EXPORT_PAGE", pageId, format, ...currentUser });
  }, []);

  const updateContract = useCallback((contractId: string, changeNote: string) => {
    dispatch({ type: "UPDATE_CONTRACT", contractId, changeNote, ...currentUser });
  }, []);

  const uploadAssetDemo = useCallback((pageId: string, assetType: AssetType) => {
    dispatch({ type: "UPLOAD_ASSET_DEMO", pageId, assetType, ...currentUser });
  }, []);

  const linkAsset = useCallback((pageId: string, assetType: AssetType, url: string, filename: string) => {
    dispatch({ type: "LINK_ASSET", pageId, assetType, url, filename, ...currentUser });
  }, []);

  const approveAsset = useCallback((pageId: string, assetType: AssetType) => {
    dispatch({ type: "APPROVE_ASSET", pageId, assetType, ...currentUser });
  }, []);

  const replaceAssetRequest = useCallback((pageId: string, assetType: AssetType) => {
    dispatch({ type: "REPLACE_ASSET_REQUEST", pageId, assetType, ...currentUser });
  }, []);

  const getPage = useCallback((pageId: string) => state.pages.find(p => p.id === pageId), [state.pages]);
  const getRunsForPage = useCallback(
    (pageId: string, includeDemo = false) =>
      state.runs.filter(r => r.pageId === pageId && (includeDemo || !r.demoSeed)),
    [state.runs],
  );
  const getQAForPage = useCallback((pageId: string) => state.qaReports.find(r => r.pageId === pageId), [state.qaReports]);
  const getExportsForPage = useCallback((pageId: string) => state.exports.filter(e => e.pageId === pageId), [state.exports]);
  const getOutputPackForPage = useCallback((pageId: string) => state.outputPacks?.find(p => p.pageId === pageId), [state.outputPacks]);

  return (
    <StudioContext.Provider value={{
      state, dispatch,
      executeGrounding, startGeneration, executeQA, approvePage,
      requestRevision, regenerateSelective, exportPage, updateContract,
      uploadAssetDemo, linkAsset, approveAsset, replaceAssetRequest,
      getPage, getRunsForPage, getQAForPage, getExportsForPage, getOutputPackForPage,
    }}>
      {children}
    </StudioContext.Provider>
  );
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used within StudioProvider");
  return ctx;
}
