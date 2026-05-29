export type ProjectSource =
  | { kind: "tauri"; path: string }
  | { kind: "browser"; name: string };
