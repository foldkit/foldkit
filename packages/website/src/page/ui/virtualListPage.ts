import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import { VirtualListPageContent } from './content'
import * as VirtualList from './demo/virtualList'

const { tableOfContents, view: renderPage } = VirtualListPageContent

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = UiComposition.makeView.withInputs<ViewInputs>(
  (model, { renderCopyButton, renderSnippet, renderHeadingLink }, h) =>
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
    }),
)
