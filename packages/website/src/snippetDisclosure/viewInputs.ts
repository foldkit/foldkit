import type { Html } from 'foldkit/html'

import type * as CodeBlock from '../component/codeBlock'

export type ViewInputs = Readonly<{
  id: string
  disclosureGroupId?: string
  title?: string
  content: Html
  rawCode: string
  copyAriaLabel: string
  className?: string
  renderCopyButton: CodeBlock.RenderCopyButton
}>
