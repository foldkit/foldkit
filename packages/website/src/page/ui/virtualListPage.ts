import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import * as VirtualList from './demo/virtualList'
import type { Message } from './message'
import type { Model } from './model'
import raw from './virtualListPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<
  'fixed' | 'variable' | 'chat'
>(raw, 'ui/virtual-list')

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderSnippet, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {
        fixed: demoContainer(...VirtualList.view(model.virtualListDemo, h)),
        variable: demoContainer(
          ...VirtualList.virtualListVariableDemo(
            model.virtualListVariableDemo,
            h,
          ),
        ),
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
