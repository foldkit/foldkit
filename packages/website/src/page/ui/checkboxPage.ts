import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import raw from './checkboxPage.md'
import * as Checkbox from './demo/checkbox'
import type { Message } from './message'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = slotDocPage<
  'basic' | 'indeterminate'
>(raw, 'ui/checkbox')

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {
        basic: demoContainer(...Checkbox.basicDemo(model, h)),
        indeterminate: demoContainer(...Checkbox.indeterminateDemo(model, h)),
      },
      renderCopyButton,
      renderHeadingLink,
    }),
)
