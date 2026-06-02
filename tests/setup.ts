import "@testing-library/jest-dom/vitest";

const emptyRect = () =>
  ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
  }) as DOMRect;

const emptyRectList = () =>
  ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: () => [][Symbol.iterator](),
  }) as DOMRectList;

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

if (typeof Range !== "undefined") {
  if (!Range.prototype.getBoundingClientRect) {
    Object.defineProperty(Range.prototype, "getBoundingClientRect", {
      configurable: true,
      value: emptyRect,
    });
  }

  if (!Range.prototype.getClientRects) {
    Object.defineProperty(Range.prototype, "getClientRects", {
      configurable: true,
      value: emptyRectList,
    });
  }
}
