import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import * as Tooltip from './demo/tooltip'
import raw from './tooltipPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<'demo'>(
  raw,
  'ui/tooltip',
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
        demo: demoContainer(...Tooltip.demo(model.tooltipDemo, h)),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
