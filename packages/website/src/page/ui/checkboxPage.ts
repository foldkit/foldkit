import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import raw from './checkboxPage.md'
import { UiComposition } from './composition'
import * as Checkbox from './demo/checkbox'

const { tableOfContents, view: renderPage } = slotDocPage<
  'basic' | 'indeterminate'
>(raw, 'ui/checkbox')

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
        basic: demoContainer(...Checkbox.basicDemo(model, h)),
        indeterminate: demoContainer(...Checkbox.indeterminateDemo(model, h)),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
