import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import * as RadioGroup from './demo/radioGroup'
import type { Message } from './message'
import type { Model } from './model'
import raw from './radioGroupPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<
  'vertical' | 'horizontal'
>(raw, 'ui/radio-group')

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {
        vertical: demoContainer(...RadioGroup.verticalDemo(model, h)),
        horizontal: demoContainer(...RadioGroup.horizontalDemo(model, h)),
      },
      renderCopyButton,
      renderHeadingLink,
    }),
)
