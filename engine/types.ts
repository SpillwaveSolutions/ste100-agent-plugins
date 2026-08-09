export type Severity = "error" | "warning" | "info";

export type DocMode = "procedure" | "description" | "auto";

export type Issue = {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  message: string;
  suggestion: string;
  /** 0-based char offset in full text */
  start: number;
  end: number;
  line: number;
  column: number;
  snippet: string;
};

export type RuleDefinition = {
  id: string;
  name: string;
  category: "words" | "sentences" | "verbs" | "nouns" | "punctuation" | "style";
  severity: Severity;
  summary: string;
  steReference: string;
};

export type AnalysisResult = {
  text: string;
  mode: DocMode;
  resolvedMode: "procedure" | "description";
  issues: Issue[];
  stats: {
    sentences: number;
    words: number;
    paragraphs: number;
    errors: number;
    warnings: number;
    infos: number;
    score: number;
  };
  sentenceBreakdown: Array<{
    text: string;
    start: number;
    end: number;
    wordCount: number;
    issues: Issue[];
  }>;
};
