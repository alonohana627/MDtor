export function getCurrentLine(value: string, cursorIndex: number) {
  const safeCursorIndex = Math.max(0, Math.min(cursorIndex, value.length));
  let line = 1;
  let nextLineBreak = value.indexOf("\n");

  while (nextLineBreak !== -1 && nextLineBreak < safeCursorIndex) {
    line += 1;
    nextLineBreak = value.indexOf("\n", nextLineBreak + 1);
  }

  return line;
}

export function getCurrentLineFromLineStarts(lineStarts: number[], cursorIndex: number) {
  if (lineStarts.length === 0) {
    return 1;
  }

  let low = 0;
  let high = lineStarts.length - 1;
  let lineIndex = 0;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);

    if (lineStarts[middle] <= cursorIndex) {
      lineIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return lineIndex + 1;
}

export function getLineStartOffset(value: string, line: number) {
  if (line <= 1) {
    return 0;
  }

  let currentLine = 1;
  let nextLineBreak = value.indexOf("\n");

  while (nextLineBreak !== -1) {
    currentLine += 1;

    if (currentLine === line) {
      return nextLineBreak + 1;
    }

    nextLineBreak = value.indexOf("\n", nextLineBreak + 1);
  }

  return value.length;
}
