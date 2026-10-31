import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { RadioGroupPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as RadioGroup from './demo/radioGroup'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = RadioGroupPageContent

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
      vertical: demoContainer(...RadioGroup.verticalDemo(model, h)),
      horizontal: demoContainer(...RadioGroup.horizontalDemo(model, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
