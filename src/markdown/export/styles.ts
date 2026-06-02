import { convertInchesToTwip } from "docx";

export type ExportDocumentDirection = "ltr" | "rtl";

export const pageMarginInches = 0.75;
export const docxPageMargin = convertInchesToTwip(pageMarginInches);

export const exportStyleContract = {
  page: {
    size: "A4",
    margin: `${pageMarginInches}in`,
  },
  fontFamily: 'Georgia, "Times New Roman", serif',
  headingFontFamily: '"Aptos", "Segoe UI", Arial, sans-serif',
  codeFontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  colors: {
    text: "#24292f",
    textStrong: "#111827",
    muted: "#68717d",
    border: "#d8dee5",
    quoteBackground: "#f6f8fa",
    codeBackground: "#eaeef2",
    codeBlockBackground: "#0f172a",
    codeBlockText: "#e5e7eb",
    link: "#0969da",
    keyword: "#c4b5fd",
    title: "#93c5fd",
    string: "#86efac",
    number: "#fbbf24",
    attribute: "#fda4af",
    comment: "#94a3b8",
    meta: "#67e8f9",
  },
} as const;

export function getExportDirection(direction: ExportDocumentDirection | undefined) {
  return direction === "rtl" ? "rtl" : "ltr";
}

export function trimHash(value: string) {
  return value.replace(/^#/, "");
}
