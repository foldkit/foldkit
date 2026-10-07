import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../../component'
import { slotDocPage } from '../../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../../prose'
import * as VirtualList from '../../ui/demo/virtualList'
import type { Message } from '../../ui/message'
import type { Model } from '../../ui/model'
import raw from './foldkit-0-167-0.md'

const { view: renderPost } = slotDocPage<'chat'>(raw, 'foldkit-0-167-0')

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderSnippet, renderHeadingLink }, h): Html =>
    renderPost({
      demos: {
        chat: demoContainer(
          ...VirtualList.virtualListChatDemo(
            model.virtualListChatDemo,
            model.virtualListChatMessages,
            h,
          ),
        ),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
