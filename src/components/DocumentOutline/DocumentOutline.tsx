import { memo, type MouseEvent } from "react";
import { type OutlineItem, getActiveOutlineItem } from "../../markdown/outline";
import "./DocumentOutline.css";

type DocumentOutlineProps = {
  items: OutlineItem[];
  currentLine: number;
  onSelectLine: (line: number) => void;
};

type OutlineButtonProps = {
  item: OutlineItem;
  isActive: boolean;
};

const OutlineButton = memo(function OutlineButton({
  item,
  isActive,
}: OutlineButtonProps) {
  return (
    <button
      type="button"
      className={isActive ? "active" : undefined}
      data-line={item.line}
      style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
    >
      {item.text}
    </button>
  );
});

export const DocumentOutline = memo(function DocumentOutline({
  items,
  currentLine,
  onSelectLine,
}: DocumentOutlineProps) {
  const activeItem = getActiveOutlineItem(items, currentLine);

  function handleOutlineClick(event: MouseEvent<HTMLElement>) {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
      "button[data-line]",
    );
    const line = Number(button?.dataset.line);

    if (Number.isFinite(line)) {
      onSelectLine(line);
    }
  }

  return (
    <aside className="document-outline" aria-label="Document outline">
      <h2>Outline</h2>
      {items.length > 0 ? (
        <nav onClick={handleOutlineClick}>
          {items.map((item) => (
            <OutlineButton
              key={item.id}
              item={item}
              isActive={item.id === activeItem?.id}
            />
          ))}
        </nav>
      ) : (
        <p>No headings</p>
      )}
    </aside>
  );
});
