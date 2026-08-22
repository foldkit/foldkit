import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import type { RenderCopyButton } from '../../view/codeBlock'
import type { Message } from './message'
import type { Model } from './model'
import * as Popover from './popover'
import raw from './popoverPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<
  'basic' | 'arrow' | 'animated' | 'nested'
>(raw, 'ui/popover')

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
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
      renderHeadingLink,
    }),
)
