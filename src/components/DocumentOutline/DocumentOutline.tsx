import { type OutlineItem, getActiveOutlineItem } from "../../markdown/outline";
import "./DocumentOutline.css";

type DocumentOutlineProps = {
  items: OutlineItem[];
  currentLine: number;
  onSelectLine: (line: number) => void;
};

export function DocumentOutline({
  items,
  currentLine,
  onSelectLine,
}: DocumentOutlineProps) {
  const activeItem = getActiveOutlineItem(items, currentLine);

  return (
    <aside className="document-outline" aria-label="Document outline">
      <h2>Outline</h2>
      {items.length > 0 ? (
        <nav>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === activeItem?.id ? "active" : undefined}
              style={{ paddingLeft: `${(item.level - 1) * 12 + 8}px` }}
              onClick={() => onSelectLine(item.line)}
            >
              {item.text}
            </button>
          ))}
        </nav>
      ) : (
        <p>No headings</p>
      )}
    </aside>
  );
}
