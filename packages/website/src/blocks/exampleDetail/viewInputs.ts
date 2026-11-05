import type * as CodeBlock from '../../markdown/codeBlock'

export type ViewInputs = Readonly<{
  slug: string
  isNarrowViewport: boolean
  renderSnippet: CodeBlock.RenderSnippet
}>
