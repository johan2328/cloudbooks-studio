export interface TrapItem {
  wrong: string;
  correction: string;
}

export interface AutocheckData {
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
  discardNotes: string[];
}

export interface VisualModule {
  num: string;
  title: string;
  description: string;
  idea?: string;
  recommendedDiagram?: string;
  maxMicrocopy?: string;
  examSignal?: string;
}

export interface VisualAtlasPageData {
  domainLabel:    string;
  pageNumber:     string;
  totalPages:     number;
  batchLabel:     string;
  title:          string;
  subtitle:       string;
  context:        string;
  guideQuestion:  string;
  upperVisualSrc: string;
  upperVisualAlt: string;
  traps:          TrapItem[];
  autocheck:      AutocheckData;
  contractVersion: string;
  visualModules:  VisualModule[];
}
