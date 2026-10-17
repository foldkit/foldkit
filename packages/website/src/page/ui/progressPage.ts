import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import * as Progress from './demo/progress'
import raw from './progressPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<
  'basic' | 'indeterminate'
>(raw, 'ui/progress')

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
        basic: demoContainer(...Progress.basicDemo(h)),
        indeterminate: demoContainer(...Progress.indeterminateDemo(h)),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
