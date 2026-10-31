import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../../component'
import { slotDocPage } from '../../../markdown'
import { type RenderHeadingLink } from '../../../prose'
import raw from './foldkit-0-167-0.md'

const { view: renderPost } = slotDocPage<'chat'>(raw, 'foldkit-0-167-0')

export const view = (
  chatDemo: Html,
  renderCopyButton: CodeBlock.RenderCopyButton,
  renderSnippet: CodeBlock.RenderSnippet,
  renderHeadingLink: RenderHeadingLink,
): Html =>
  renderPost({
    demos: { chat: chatDemo },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
