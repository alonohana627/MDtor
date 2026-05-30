import { render, screen, waitFor } from "@testing-library/react";
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HighlightedCodeBlock } from "../../../src/components/HighlightedCodeBlock";
import { highlightCodeToTokens } from "../../../src/services/codeHighlighter";

vi.mock("../../../src/services/codeHighlighter", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/services/codeHighlighter")
  >("../../../src/services/codeHighlighter");

  return {
    ...actual,
    highlightCodeToTokens: vi.fn(),
  };
});

const highlightCodeToTokensMock = vi.mocked(highlightCodeToTokens);

describe("HighlightedCodeBlock", () => {
  beforeEach(() => {
    highlightCodeToTokensMock.mockReset();
  });

  it("renders plain code immediately before async highlighting completes", () => {
    highlightCodeToTokensMock.mockReturnValue(new Promise(() => undefined));

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
    highlightCodeToTokensMock.mockResolvedValue({
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
      expect(highlightCodeToTokensMock).toHaveBeenCalledWith(
        "const value = 1;",
        "typescript",
        "github-dark",
      );
    });

    expect(screen.getByText("const").closest("pre")).toHaveClass("active-preview-block");
    expect(screen.getByText("const")).toHaveStyle({
      color: "#ff0000",
      fontWeight: "700",
    });
  });

  it("uses the light Shiki theme in light mode", async () => {
    highlightCodeToTokensMock.mockResolvedValue({
      tokens: [[{ content: "const" }]],
    });

    render(
      <HighlightedCodeBlock
        code="const value = 1;"
        language="ts"
        isActive={false}
        theme="light"
      />,
    );

    await waitFor(() => {
      expect(highlightCodeToTokensMock).toHaveBeenCalledWith(
        "const value = 1;",
        "typescript",
        "github-light",
      );
    });
  });

  it("falls back to plain text when highlighting fails", async () => {
    highlightCodeToTokensMock.mockRejectedValue(new Error("unsupported language"));

    render(
      <HighlightedCodeBlock
        code="not highlighted"
        language="ts"
        isActive={false}
        theme="light"
      />,
    );

    await waitFor(() => {
      expect(highlightCodeToTokensMock).toHaveBeenCalled();
    });

    expect(screen.getByText("not highlighted")).toBeInTheDocument();
    expect(screen.queryByText("typescript")).not.toBeInTheDocument();
  });

  it("skips unsupported languages and renders them as text", async () => {
    render(
      <HighlightedCodeBlock
        code="not highlighted"
        language="unknownlang"
        isActive={false}
        theme="light"
      />,
    );

    await waitFor(() => {
      expect(highlightCodeToTokensMock).not.toHaveBeenCalled();
    });

    expect(screen.getByText("not highlighted")).toBeInTheDocument();
    expect(screen.queryByText("unknownlang")).not.toBeInTheDocument();
  });

  it("styles italic and underline tokens and keeps empty lines", async () => {
    let resolveTokens:
      | ((value: {
          tokens: Array<Array<{ content: string; fontStyle?: number }>>;
        }) => void)
      | null = null;
    highlightCodeToTokensMock.mockReturnValue(
      new Promise((resolve) => {
        resolveTokens = resolve;
      }),
    );

    const { container, unmount } = render(
      <HighlightedCodeBlock
        code={"first\n\nthird"}
        language="ts"
        isActive={false}
        theme="light"
      />,
    );

    await act(async () => {
      resolveTokens?.({
        tokens: [[{ content: "first", fontStyle: 5 }], [], [{ content: "third" }]],
      });
      await Promise.resolve();
    });

    expect(screen.getByText("first")).toHaveStyle({
      fontStyle: "italic",
      textDecoration: "underline",
    });
    expect(container.querySelector(".shiki-code")?.textContent).toBe("first\n\n\nthird");

    unmount();
  });
});
