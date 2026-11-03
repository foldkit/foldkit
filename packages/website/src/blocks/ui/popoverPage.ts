import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import { PopoverPageContent } from './content'
import * as Popover from './demo/popover'

const { tableOfContents, view: renderPage } = PopoverPageContent

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
        basic: demoContainer(...Popover.basicDemo(model.popoverBasicDemo, h)),
        arrow: demoContainer(...Popover.arrowDemo(model.popoverArrowDemo, h)),
        animated: demoContainer(
          ...Popover.animatedDemo(model.popoverAnimatedDemo, h),
        ),
        nested: demoContainer(
          ...Popover.nestedDemo(
            model.popoverNestedParentDemo,
            model.popoverNestedChildDemo,
            h,
          ),
        ),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
