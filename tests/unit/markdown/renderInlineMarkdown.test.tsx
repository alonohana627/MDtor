import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { renderInlineMarkdown } from "../../../src/markdown/renderInlineMarkdown";

function elementType(node: unknown) {
  return isValidElement(node) ? node.type : undefined;
}

function elementProps(node: unknown) {
  return isValidElement(node) ? node.props : undefined;
}

describe("renderInlineMarkdown", () => {
  it("renders plain text as React fragments", () => {
    const nodes = renderInlineMarkdown("plain text");

    expect(nodes).toHaveLength(1);
    expect(elementProps(nodes[0])).toMatchObject({ children: "plain text" });
  });

  it("renders inline code", () => {
    const nodes = renderInlineMarkdown("Use `code` here");

    expect(elementProps(nodes[0])).toMatchObject({ children: "Use " });
    expect(elementType(nodes[1])).toBe("code");
    expect(elementProps(nodes[1])).toMatchObject({ children: "code" });
    expect(elementProps(nodes[2])).toMatchObject({ children: " here" });
  });

  it("renders bold and italic text", () => {
    const nodes = renderInlineMarkdown("**bold** and *italic*");

    expect(elementType(nodes[1])).toBe("strong");
    expect(elementProps(nodes[1])).toMatchObject({ children: "bold" });
    expect(elementType(nodes[3])).toBe("em");
    expect(elementProps(nodes[3])).toMatchObject({ children: "italic" });
  });

  it("renders links with safe external-link attributes", () => {
    const nodes = renderInlineMarkdown("[Tauri](https://tauri.app)");

    expect(elementType(nodes[1])).toBe("a");
    expect(elementProps(nodes[1])).toMatchObject({
      children: "Tauri",
      href: "https://tauri.app",
      rel: "noreferrer",
      target: "_blank",
    });
  });

  it("renders hard line breaks as br elements", () => {
    const nodes = renderInlineMarkdown("first\nsecond");

    expect(elementProps(nodes[0])).toMatchObject({ children: "first" });
    expect(elementType(nodes[1])).toBe("br");
    expect(elementProps(nodes[2])).toMatchObject({ children: "second" });
  });
});
