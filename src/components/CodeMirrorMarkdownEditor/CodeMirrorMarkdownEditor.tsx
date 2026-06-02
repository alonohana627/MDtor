import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  foldKeymap,
  indentOnInput,
  syntaxHighlighting,
} from "@codemirror/language";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completionKeymap,
} from "@codemirror/autocomplete";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState } from "@codemirror/state";
import {
  crosshairCursor,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";
import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import "./CodeMirrorMarkdownEditor.css";

export type CodeMirrorMarkdownEditorProps = {
  value: string;
  direction: "ltr" | "rtl";
  editorRef?: Ref<CodeMirrorMarkdownEditorHandle>;
  isTypewriterMode?: boolean;
  onChange: (value: string) => void;
  onCurrentLineChange?: (line: number) => void;
  onEditorScroll?: (scrollElement: HTMLElement) => void;
};

export type CodeMirrorMarkdownEditorHandle = {
  readonly clientHeight: number;
  readonly scrollHeight: number;
  scrollTop: number;
  focus: () => void;
  replaceDocument: (value: string) => void;
  scrollTo: (options?: ScrollToOptions) => void;
  setSelectionRange: (selectionStart: number, selectionEnd: number) => void;
};

const markdownEditorSetup = [
  lineNumbers(),
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  foldGutter(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  crosshairCursor(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap,
    ...completionKeymap,
  ]),
];

function createContentAttributes(direction: "ltr" | "rtl") {
  return EditorView.contentAttributes.of({
    dir: direction,
    "data-document-direction": direction,
  });
}

function createEditorAttributes(direction: "ltr" | "rtl") {
  return EditorView.editorAttributes.of({
    class: `codemirror-markdown-editor codemirror-markdown-editor-${direction}`,
    dir: direction,
  });
}

export function CodeMirrorMarkdownEditor({
  value,
  direction,
  editorRef,
  isTypewriterMode = false,
  onChange,
  onCurrentLineChange,
  onEditorScroll,
}: CodeMirrorMarkdownEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const compartmentsRef = useRef({
    contentAttributes: new Compartment(),
    editorAttributes: new Compartment(),
  });
  const isApplyingExternalValueRef = useRef(false);
  const isTypewriterModeRef = useRef(isTypewriterMode);
  const initialValueRef = useRef(value);
  const initialDirectionRef = useRef(direction);
  const onChangeRef = useRef(onChange);
  const onCurrentLineChangeRef = useRef(onCurrentLineChange);
  const onEditorScrollRef = useRef(onEditorScroll);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onCurrentLineChangeRef.current = onCurrentLineChange;
  }, [onCurrentLineChange]);

  useEffect(() => {
    onEditorScrollRef.current = onEditorScroll;
  }, [onEditorScroll]);

  useEffect(() => {
    isTypewriterModeRef.current = isTypewriterMode;
  }, [isTypewriterMode]);

  useImperativeHandle(
    editorRef,
    () => ({
      get clientHeight() {
        return viewRef.current?.scrollDOM.clientHeight ?? 0;
      },
      get scrollHeight() {
        return viewRef.current?.scrollDOM.scrollHeight ?? 0;
      },
      get scrollTop() {
        return viewRef.current?.scrollDOM.scrollTop ?? 0;
      },
      set scrollTop(value: number) {
        const view = viewRef.current;

        if (view) {
          view.scrollDOM.scrollTop = value;
        }
      },
      focus() {
        viewRef.current?.focus();
      },
      replaceDocument(nextValue: string) {
        const view = viewRef.current;

        if (!view) {
          return;
        }

        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: nextValue,
          },
        });
      },
      scrollTo(options?: ScrollToOptions) {
        const scrollElement = viewRef.current?.scrollDOM;

        if (!scrollElement) {
          return;
        }

        if (typeof scrollElement.scrollTo === "function") {
          scrollElement.scrollTo(options);
          return;
        }

        if (typeof options?.top === "number") {
          scrollElement.scrollTop = options.top;
        }
      },
      setSelectionRange(selectionStart: number, selectionEnd: number) {
        const view = viewRef.current;

        if (!view) {
          return;
        }

        const documentLength = view.state.doc.length;
        const anchor = Math.max(0, Math.min(selectionStart, documentLength));
        const head = Math.max(0, Math.min(selectionEnd, documentLength));

        view.dispatch({
          selection: { anchor, head },
          effects: EditorView.scrollIntoView(head, { y: "center" }),
        });
        view.focus();
      },
    }),
    [],
  );

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const compartments = compartmentsRef.current;
    const initialDirection = initialDirectionRef.current;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: initialValueRef.current,
        extensions: [
          markdownEditorSetup,
          markdown({ base: markdownLanguage }),
          EditorView.lineWrapping,
          EditorView.perLineTextDirection.of(true),
          compartments.contentAttributes.of(createContentAttributes(initialDirection)),
          compartments.editorAttributes.of(createEditorAttributes(initialDirection)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !isApplyingExternalValueRef.current) {
              onChangeRef.current(update.state.doc.toString());
            }

            if (update.docChanged || update.selectionSet) {
              const currentLine = update.state.doc.lineAt(
                update.state.selection.main.head,
              ).number;

              onCurrentLineChangeRef.current?.(currentLine);

              if (isTypewriterModeRef.current) {
                update.view.dispatch({
                  effects: EditorView.scrollIntoView(update.state.selection.main.head, {
                    y: "center",
                  }),
                });
              }
            }
          }),
        ],
      }),
    });
    const handleScroll = () => {
      onEditorScrollRef.current?.(view.scrollDOM);
    };

    viewRef.current = view;
    view.scrollDOM.addEventListener("scroll", handleScroll);

    return () => {
      view.scrollDOM.removeEventListener("scroll", handleScroll);
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const compartments = compartmentsRef.current;

    view.dispatch({
      effects: [
        compartments.contentAttributes.reconfigure(createContentAttributes(direction)),
        compartments.editorAttributes.reconfigure(createEditorAttributes(direction)),
      ],
    });
    view.requestMeasure();
  }, [direction]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view) {
      return;
    }

    const currentValue = view.state.doc.toString();

    if (currentValue === value) {
      return;
    }

    isApplyingExternalValueRef.current = true;
    view.dispatch({
      changes: {
        from: 0,
        to: currentValue.length,
        insert: value,
      },
    });
    isApplyingExternalValueRef.current = false;
  }, [value]);

  return <div ref={hostRef} className="codemirror-markdown-editor-host" />;
}
