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
