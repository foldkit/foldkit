import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { PopoverPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Popover from './demo/popover'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = PopoverPageContent

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = (
  model: Model,
  { renderCopyButton, renderSnippet, renderHeadingLink }: ViewInputs,
  h: UiViewBuilder,
): Html =>
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
  })
