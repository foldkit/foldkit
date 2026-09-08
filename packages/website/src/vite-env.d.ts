/// <reference types="vite/client" />
/// <reference types="@foldkit/markdown/content" />

declare module '*.md?raw' {
  const content: string
  export default content
}

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

declare module '*.elm?raw' {
  const content: string
  export default content
}

declare module '*.elm?highlighted' {
  const html: string
  export default html
}

declare module '*.json?raw' {
  const content: string
  export default content
}

declare module '*.html?raw' {
  const content: string
  export default content
}

declare module '*.html?highlighted' {
  const html: string
  export default html
}

declare module '*.sh?raw' {
  const content: string
  export default content
}

declare module '*.sh?highlighted' {
  const html: string
  export default html
}

declare module 'virtual:css-snippets' {
  const snippets: Record<string, { raw: string; highlighted: string }>
  export default snippets
}

declare module '*.json?highlighted' {
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

declare module 'virtual:parsed-api' {
  const data: unknown
  export default data
}

declare module 'virtual:landing-data' {
  export const foldkitVersion: string
  export const effectVersion: string
  export const githubStarCount: number | null
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

declare module 'virtual:playground-files' {
  const data: Record<string, { files: Record<string, string> }>
  export default data
}

declare module 'virtual:playground-types' {
  const data: ReadonlyArray<{
    readonly path: string
    readonly contents: string
  }>
  export default data
}

interface Navigator {
  readonly userAgentData?: Readonly<{
    brands?: ReadonlyArray<Readonly<{ brand: string }>>
  }>
}

// `@foldkit/vite-plugin` compiles the deployment's build id in here, from its
// `buildId` option or the `FOLDKIT_BUILD_ID` environment variable. The server
// entry hands it to `renderToString` and the client entry to `Runtime.hydrate`,
// which is how hydration tells a page from this deployment apart from one served
// by another.
//
// Declared as required rather than optional because this project's build always
// supplies one. A build that did not would produce `undefined` here, and both
// entries refuse it at runtime; typing it as optional would only push that
// failure past the compiler and into the served page.
interface ImportMetaEnv {
  readonly FOLDKIT_BUILD_ID: string
  readonly VITE_FOLDKIT_CANARY_COMMIT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
