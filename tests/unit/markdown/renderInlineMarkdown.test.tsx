import { isValidElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { renderInlineMarkdown } from "../../../src/markdown/renderInlineMarkdown";

function elementType(node: unknown) {
  return isValidElement(node) ? node.type : undefined;
}

function elementProps(node: unknown) {
  return isValidElement<Record<string, unknown>>(node) ? node.props : undefined;
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

  it("renders unsafe links as inert text", () => {
    const nodes = renderInlineMarkdown("[Bad](javascript:alert)");

    expect(elementType(nodes[1])).toBe("span");
    expect(elementProps(nodes[1])).toMatchObject({ children: "Bad" });
    expect(elementProps(nodes[1])?.href).toBeUndefined();
  });

  it("allows mailto links", () => {
    const nodes = renderInlineMarkdown("[Email](mailto:hello@example.com)");

    expect(elementType(nodes[1])).toBe("a");
    expect(elementProps(nodes[1])).toMatchObject({
      href: "mailto:hello@example.com",
    });
  });

  it("renders hard line breaks as br elements", () => {
    const nodes = renderInlineMarkdown("first\nsecond");

    expect(elementProps(nodes[0])).toMatchObject({ children: "first" });
    expect(elementType(nodes[1])).toBe("br");
    expect(elementProps(nodes[2])).toMatchObject({ children: "second" });
  });

  it("renders local images and reloads them when references change", async () => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:image"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    const loadImage = vi.fn().mockResolvedValue(new Blob(["image"]));
    const { rerender } = render(
      <>{renderInlineMarkdown("![Diagram](images/one.png)", { loadImage })}</>,
    );

    expect(await screen.findByRole("img", { name: "Diagram" })).toHaveAttribute(
      "src",
      "blob:image",
    );

    rerender(<>{renderInlineMarkdown("![Diagram](images/two.png)", { loadImage })}</>);

    await waitFor(() => {
      expect(loadImage).toHaveBeenCalledWith("images/two.png");
    });
  });

  it("renders a missing-image state when local image loading fails", async () => {
    const loadImage = vi.fn().mockRejectedValue(new Error("missing"));

    render(<>{renderInlineMarkdown("![Diagram](images/missing.png)", { loadImage })}</>);

    expect(await screen.findByText("Missing image: Diagram")).toBeInTheDocument();
  });
});
