import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import { SwitchPageContent } from './content'
import * as Switch from './demo/switch'

const { tableOfContents, view: renderPage } = SwitchPageContent

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
