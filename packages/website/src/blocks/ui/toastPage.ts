import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import { ToastPageContent } from './content'
import * as Toast from './demo/toast'

const { tableOfContents, view: renderPage } = ToastPageContent

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
        demo: demoContainer(
          ...Toast.demo(model.toastDemo, model.maybeLastDismissedToastTitle, h),
        ),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
