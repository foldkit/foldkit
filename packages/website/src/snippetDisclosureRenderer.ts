import { type CodeBlock } from './component'
import type { SnippetDisclosure } from './snippetDisclosure'

export const renderer =
  (
    snippetDisclosure: SnippetDisclosure,
    renderCopyButton: CodeBlock.RenderCopyButton,
  ): CodeBlock.RenderSnippet =>
  config =>
    snippetDisclosure.view({ ...config, renderCopyButton })
