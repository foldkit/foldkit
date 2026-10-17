import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import raw from './animationPage.md'
import { UiComposition } from './composition'
import * as Animation from './demo/animation'

const { tableOfContents, view: renderPage } = slotDocPage<'animation'>(
  raw,
  'ui/animation',
)

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
        animation: demoContainer(...Animation.view(model.animationDemo, h)),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
