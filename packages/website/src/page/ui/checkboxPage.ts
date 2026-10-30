import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { CheckboxPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Checkbox from './demo/checkbox'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = CheckboxPageContent

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
      basic: demoContainer(...Checkbox.basicDemo(model, h)),
      indeterminate: demoContainer(...Checkbox.indeterminateDemo(model, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
