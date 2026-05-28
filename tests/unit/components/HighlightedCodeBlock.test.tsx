import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HighlightedCodeBlock } from "../../../src/components/HighlightedCodeBlock";

const codeToTokens = vi.fn();

vi.mock("shiki", () => ({
  codeToTokens: (...args: unknown[]) => codeToTokens(...args),
}));

describe("HighlightedCodeBlock", () => {
  beforeEach(() => {
    codeToTokens.mockReset();
  });

  it("renders plain code immediately before async highlighting completes", () => {
    codeToTokens.mockReturnValue(new Promise(() => undefined));

    render(
      <HighlightedCodeBlock
        code="const value = 1;"
        language="ts"
        isActive={false}
        theme="light"
      />,
    );

    expect(screen.getByText("const value = 1;")).toBeInTheDocument();
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("uses Shiki tokens for the normalized language and active theme", async () => {
    codeToTokens.mockResolvedValue({
      tokens: [
        [
          { content: "const", color: "#ff0000", fontStyle: 2 },
          { content: " value", color: "#00ff00" },
        ],
      ],
    });

    render(
      <HighlightedCodeBlock
        code="const value = 1;"
        language="ts"
        isActive
        theme="dark"
      />,
    );

    await waitFor(() => {
      expect(codeToTokens).toHaveBeenCalledWith("const value = 1;", {
        lang: "typescript",
        theme: "github-dark",
      });
    });

    expect(screen.getByText("const").closest("pre")).toHaveClass("active-preview-block");
    expect(screen.getByText("const")).toHaveStyle({
      color: "#ff0000",
      fontWeight: "700",
    });
  });

  it("falls back to plain text when highlighting fails", async () => {
    codeToTokens.mockRejectedValue(new Error("unsupported language"));

    render(
      <HighlightedCodeBlock
        code="not highlighted"
        language="unknownlang"
        isActive={false}
        theme="light"
      />,
    );

    await waitFor(() => {
      expect(codeToTokens).toHaveBeenCalled();
    });

    expect(screen.getByText("not highlighted")).toBeInTheDocument();
    expect(screen.queryByText("unknownlang")).not.toBeInTheDocument();
  });
});
