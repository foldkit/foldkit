import type * as CodeBlock from '../../../markdown/codeBlock'
import { type RenderHeadingLink, demoContainer } from '../../../prose'
import { UiComposition } from '../composition'
import { InputPageContent } from '../content'
import * as Input from './demo/input'

const { tableOfContents, view: renderPage } = InputPageContent

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
        basic: demoContainer(...Input.basicDemo(model, h)),
        disabled: demoContainer(...Input.disabledDemo(model, h)),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
