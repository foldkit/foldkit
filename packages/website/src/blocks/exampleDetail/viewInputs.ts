import type * as CodeBlock from '../../component/codeBlock'

export type ViewInputs = Readonly<{
  slug: string
  isNarrowViewport: boolean
  renderSnippet: CodeBlock.RenderSnippet
}>
