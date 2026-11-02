import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { VirtualListPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as VirtualList from './demo/virtualList'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = VirtualListPageContent

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = (
  model: Model,
  { renderCopyButton, renderSnippet, renderHeadingLink }: ViewInputs,
  h: UiViewBuilder,
): Html =>
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
          {
            historySource: model.virtualListChatHistorySource,
            historyModeGroup: model.virtualListChatHistoryModeGroup,
            historyLoad: model.virtualListChatHistoryLoad,
            announcedOlderCount: model.virtualListChatAnnouncedOlderCount,
          },
        ),
      ),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
