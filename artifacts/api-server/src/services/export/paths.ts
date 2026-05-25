import { join } from "path";

export const PAGE_BASE_PATH = "/assets/cloudbooks/ai-200/visual-atlas/pages";

export function studioPublicDir(): string {
  return join(process.cwd(), "../studio/public");
}

export function pageOutputDir(pageId: string): string {
  return join(studioPublicDir(), "assets/cloudbooks/ai-200/visual-atlas/pages", pageId);
}

export function pagePublicPath(pageId: string, file: string): string {
  return `${PAGE_BASE_PATH}/${pageId}/${file}`;
}
