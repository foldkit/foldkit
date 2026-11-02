import { type CodeBlock } from './component'
import type { SnippetCopy } from './snippetCopy'

export const renderer =
  (snippetCopy: SnippetCopy): CodeBlock.RenderCopyButton =>
  ({ id, text, ariaLabel, positionClass, variant }) =>
    snippetCopy.view({ snippetId: id, text, ariaLabel, positionClass, variant })
