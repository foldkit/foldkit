import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import { HoverIntentPageContent } from './content'
import * as HoverIntent from './demo/hoverIntent'

const { tableOfContents, view: renderPage } = HoverIntentPageContent

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
        'hover-card': demoContainer(
          ...HoverIntent.hoverCardDemo(model.hoverIntentCardDemo, h),
        ),
        'hover-menu': demoContainer(
          ...HoverIntent.hoverMenuDemo(model.hoverIntentMenuDemo, h),
        ),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
