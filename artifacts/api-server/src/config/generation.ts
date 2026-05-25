/* ════════════════════════════════════════════════════════════════════════════
   Estándares Editoriales — Políticas de generación (server-side)
   Fuente de verdad única para modelos, calidades y guardrails.
   No modificar sin aprobación del equipo editorial.
   ════════════════════════════════════════════════════════════════════════════ */

export const TEXT_MODEL             = "gpt-4o-mini" as const;
export const IMAGE_MODEL            = "gpt-image-2" as const;
export const IMAGE_QUALITY          = "medium"      as const;
export const BLOCK_LEGACY_IMG_MODEL = true          as const;
export const TEMPLATE_VERSION       = "v24"         as const;

export type AllowedTextModel  = "gpt-4o-mini" | "gpt-4o";
export type AllowedImageModel = "gpt-image-2";
export type AllowedQuality    = "low" | "medium";

export interface GenerationConfig {
  textModel:            AllowedTextModel;
  imageModel:           AllowedImageModel;
  imageQuality:         AllowedQuality;
  blockLegacyImgModel:  boolean;
  templateVersion:      string;
  fallbackApprovable:   false;
}

export const VISUAL_ATLAS_CONFIG: GenerationConfig = {
  textModel:           TEXT_MODEL,
  imageModel:          IMAGE_MODEL,
  imageQuality:        IMAGE_QUALITY,
  blockLegacyImgModel: BLOCK_LEGACY_IMG_MODEL,
  templateVersion:     TEMPLATE_VERSION,
  fallbackApprovable:  false,
};
