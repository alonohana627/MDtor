import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "../../../src/components/ThemeToggle";

describe("ThemeToggle", () => {
  it("renders a button for switching from light to dark mode", () => {
    render(<ThemeToggle theme="light" onToggle={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Switch to dark mode" })).toHaveTextContent(
      "Dark",
    );
  });

  it("renders a button for switching from dark to light mode", () => {
    render(<ThemeToggle theme="dark" onToggle={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Switch to light mode" }),
    ).toHaveTextContent("Light");
  });

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    render(<ThemeToggle theme="light" onToggle={onToggle} />);

    fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
