import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { TextareaPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Textarea from './demo/textarea'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = TextareaPageContent

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
      basic: demoContainer(...Textarea.basicDemo(model, h)),
      disabled: demoContainer(...Textarea.disabledDemo(model, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
