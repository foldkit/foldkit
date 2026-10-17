import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import * as Meter from './demo/meter'
import raw from './meterPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<
  'basic' | 'thresholds'
>(raw, 'ui/meter')

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = UiComposition.makeView.withInputs<ViewInputs>(
  (_model, { renderCopyButton, renderSnippet, renderHeadingLink }, h) =>
    renderPage({
      demos: {
        basic: demoContainer(...Meter.basicDemo(h)),
        thresholds: demoContainer(...Meter.thresholdsDemo(h)),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
