import { UiComposition } from '../../../blocks/ui/composition'
import * as VirtualList from '../../../blocks/ui/view/demo/virtualList'
import { slotDocPage } from '../../../markdown'
import type * as CodeBlock from '../../../markdown/codeBlock'
import { type RenderHeadingLink, demoContainer } from '../../../prose'
import raw from './foldkit-0-167-0.md'

const { view: renderPost } = slotDocPage<'chat'>(raw, 'foldkit-0-167-0')

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = UiComposition.makeView.withInputs<ViewInputs>(
  (model, { renderCopyButton, renderSnippet, renderHeadingLink }, h) =>
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
