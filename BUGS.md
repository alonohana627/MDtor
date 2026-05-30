# Bugs

## Immidiet ez to fix bugs:
```json
[{
	"resource": "/home/alonohana/Code/MDtor/tests/bench/useProjectPolling.bench.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'directoryHandle' does not exist in type '{ kind: \"browser\"; name: string; id: string; }'.",
	"source": "ts",
	"startLineNumber": 39,
	"startColumn": 3,
	"endLineNumber": 39,
	"endColumn": 18,
	"modelVersionId": 1,
	"origin": "extHost1"
},{
	"resource": "/home/alonohana/Code/MDtor/tests/bench/useProjectWorkspaceActions.bench.tsx",
	"owner": "typescript",
	"code": "2353",
	"severity": 8,
	"message": "Object literal may only specify known properties, and 'directoryHandle' does not exist in type '{ kind: \"browser\"; name: string; id: string; }'.",
	"source": "ts",
	"startLineNumber": 54,
	"startColumn": 3,
	"endLineNumber": 54,
	"endColumn": 18,
	"modelVersionId": 1,
	"origin": "extHost1"
},{
	"resource": "/home/alonohana/Code/MDtor/tests/unit/components/HighlightedCodeBlock.test.tsx",
	"owner": "typescript",
	"code": "2741",
	"severity": 8,
	"message": "Property 'offset' is missing in type '{ content: string; color: string; fontStyle: 2; }' but required in type 'ThemedToken'.",
	"source": "ts",
	"startLineNumber": 38,
	"startColumn": 11,
	"endLineNumber": 38,
	"endColumn": 63,
	"relatedInformation": [
		{
			"startLineNumber": 344,
			"startColumn": 3,
			"endLineNumber": 344,
			"endColumn": 9,
			"message": "'offset' is declared here.",
			"resource": "/home/alonohana/Code/MDtor/node_modules/@shikijs/types/dist/index.d.mts"
		}
	],
	"modelVersionId": 1,
	"origin": "extHost1"
},{
	"resource": "/home/alonohana/Code/MDtor/tests/unit/components/HighlightedCodeBlock.test.tsx",
	"owner": "typescript",
	"code": "2741",
	"severity": 8,
	"message": "Property 'offset' is missing in type '{ content: string; color: string; }' but required in type 'ThemedToken'.",
	"source": "ts",
	"startLineNumber": 39,
	"startColumn": 11,
	"endLineNumber": 39,
	"endColumn": 50,
	"relatedInformation": [
		{
			"startLineNumber": 344,
			"startColumn": 3,
			"endLineNumber": 344,
			"endColumn": 9,
			"message": "'offset' is declared here.",
			"resource": "/home/alonohana/Code/MDtor/node_modules/@shikijs/types/dist/index.d.mts"
		}
	],
	"modelVersionId": 1,
	"origin": "extHost1"
},{
	"resource": "/home/alonohana/Code/MDtor/tests/unit/components/HighlightedCodeBlock.test.tsx",
	"owner": "typescript",
	"code": "2741",
	"severity": 8,
	"message": "Property 'offset' is missing in type '{ content: string; }' but required in type 'ThemedToken'.",
	"source": "ts",
	"startLineNumber": 73,
	"startColumn": 17,
	"endLineNumber": 73,
	"endColumn": 37,
	"relatedInformation": [
		{
			"startLineNumber": 344,
			"startColumn": 3,
			"endLineNumber": 344,
			"endColumn": 9,
			"message": "'offset' is declared here.",
			"resource": "/home/alonohana/Code/MDtor/node_modules/@shikijs/types/dist/index.d.mts"
		}
	],
	"modelVersionId": 1,
	"origin": "extHost1"
},{
	"resource": "/home/alonohana/Code/MDtor/tests/unit/components/HighlightedCodeBlock.test.tsx",
	"owner": "typescript",
	"code": "2322",
	"severity": 8,
	"message": "Type '(value: TokensResult | PromiseLike<TokensResult>) => void' is not assignable to type '(value: { tokens: { content: string; fontStyle?: number | undefined; }[][]; }) => void'.\n  Types of parameters 'value' and 'value' are incompatible.\n    Type '{ tokens: { content: string; fontStyle?: number | undefined; }[][]; }' is not assignable to type 'TokensResult | PromiseLike<TokensResult>'.\n      Type '{ tokens: { content: string; fontStyle?: number | undefined; }[][]; }' is not assignable to type 'TokensResult'.\n        Types of property 'tokens' are incompatible.\n          Type '{ content: string; fontStyle?: number | undefined; }[][]' is not assignable to type 'ThemedToken[][]'.\n            Type '{ content: string; fontStyle?: number | undefined; }[]' is not assignable to type 'ThemedToken[]'.\n              Property 'offset' is missing in type '{ content: string; fontStyle?: number | undefined; }' but required in type 'ThemedToken'.",
	"source": "ts",
	"startLineNumber": 125,
	"startColumn": 9,
	"endLineNumber": 125,
	"endColumn": 22,
	"relatedInformation": [
		{
			"startLineNumber": 344,
			"startColumn": 3,
			"endLineNumber": 344,
			"endColumn": 9,
			"message": "'offset' is declared here.",
			"resource": "/home/alonohana/Code/MDtor/node_modules/@shikijs/types/dist/index.d.mts"
		}
	],
	"modelVersionId": 1,
	"origin": "extHost1"
}]
```

## Export

- PDF, Word, and HTML exports do not faithfully preserve Markdown formatting.
- Exported documents can lose heading hierarchy, nested list structure, and other semantic information.
- PDF exports are generated as a continuous document instead of a properly paginated document.

## RTL

- Pressing Space in RTL mode can cause the caret to jump to the beginning of the paragraph.
- Documents containing both RTL and LTR content can exhibit inconsistent cursor movement and text insertion behavior.

## Keyboard Shortcuts

- Keyboard shortcuts stop working when the active keyboard layout is Hebrew.
- Shortcut detection depends on the produced character instead of the physical key location.

## Project Scanning

- Directories such as `.git`, `node_modules`, `target`, and `dist` are scanned unnecessarily.
- Large projects can become noticeably slower to open because of unnecessary traversal.
- Symbolic link handling is undefined and can lead to unexpected behavior.
