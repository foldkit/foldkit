import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { InputPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Input from './demo/input'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = InputPageContent

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
      basic: demoContainer(...Input.basicDemo(model, h)),
      disabled: demoContainer(...Input.disabledDemo(model, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
