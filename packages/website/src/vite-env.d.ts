/// <reference types="vite/client" />

declare module '*.ts?raw' {
  const content: string
  export default content
}

declare module '*.ts?highlighted' {
  const html: string
  export default html
}

declare module '*.tsx?raw' {
  const content: string
  export default content
}

declare module '*.tsx?highlighted' {
  const html: string
  export default html
}

declare module 'virtual:api-highlights' {
  const highlights: Record<string, string>
  export default highlights
}

declare module 'virtual:api-module-index' {
  const index: ReadonlyArray<{ readonly slug: string; readonly name: string }>
  export default index
}

declare module 'virtual:landing-data' {
  export const foldkitVersion: string
}

declare module 'virtual:counter-demo-code' {
  const html: string
  export default html
}

declare module 'virtual:note-player-demo-code' {
  const html: string
  export default html
}

declare module 'virtual:example-sources/*' {
  const data: {
    files: ReadonlyArray<{
      path: string
      highlightedHtml: string
      rawCode: string
    }>
  }
  export default data
}

interface Window {
  readonly __FOLDKIT_PRERENDER__?: boolean
}
