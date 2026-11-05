import type * as CodeBlock from '../../markdown/codeBlock'
import type { RenderHeadingLink } from '../../prose'

export type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>
