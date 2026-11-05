import type { Url } from 'foldkit/url'

import type * as CodeBlock from '../../markdown/codeBlock'
import type { RenderHeadingLink } from '../../prose'
import type { Page } from './domain/domain'

export type ViewInputs = Readonly<{
  page: Page
  url: Url
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>
