export type SourceRange = {
  startLine: number;
  endLine: number;
};

export type MarkdownListItem = {
  text: string;
  line: number;
};

export type MarkdownBlock =
  | { type: "heading"; level: number; text: string; source: SourceRange }
  | { type: "paragraph"; text: string; source: SourceRange }
  | { type: "blockquote"; text: string; source: SourceRange }
  | {
      type: "list";
      ordered: boolean;
      items: MarkdownListItem[];
      source: SourceRange;
    }
  | { type: "code"; language: string; code: string; source: SourceRange };
