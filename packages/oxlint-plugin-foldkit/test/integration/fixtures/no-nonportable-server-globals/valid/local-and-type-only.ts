export type BrowserDocument = typeof document
export type BrowserGlobalDocument = typeof globalThis.document

export const readTitle = (document: { title: string }): string => document.title
