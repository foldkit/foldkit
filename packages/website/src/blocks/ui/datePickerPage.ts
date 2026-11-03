import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import { DatePickerPageContent } from './content'
import * as DatePicker from './demo/datePicker'

const { tableOfContents, view: renderPage } = DatePickerPageContent

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
        basic: demoContainer(...DatePicker.basicDemo(model, h)),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
