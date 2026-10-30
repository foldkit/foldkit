import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { FieldsetPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Fieldset from './demo/fieldset'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = FieldsetPageContent

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
      basic: demoContainer(...Fieldset.basicDemo(model, h)),
      disabled: demoContainer(...Fieldset.disabledDemo(model, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
