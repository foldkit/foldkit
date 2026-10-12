import { type Mount, Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Popover as UiPopover } from '@foldkit/ui'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import * as Popover from './demo/popover'
import type { Message } from './message'
import type { Model } from './model'
import raw from './popoverPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<
  'basic' | 'arrow' | 'animated' | 'nested'
>(raw, 'ui/popover')

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<
  Model,
  Message,
  ViewInputs,
  Mount.RequirementsOf<typeof UiPopover.mounts>
>((model, { renderCopyButton, renderSnippet, renderHeadingLink }, h): Html =>
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
