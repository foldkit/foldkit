import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import * as Switch from './demo/switch'
import raw from './switchPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<'basic'>(
  raw,
  'ui/switch',
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
        basic: demoContainer(...Switch.basicDemo(model.isSwitchDemoChecked, h)),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
