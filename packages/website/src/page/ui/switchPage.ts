import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { SwitchPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Switch from './demo/switch'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = SwitchPageContent

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
      basic: demoContainer(...Switch.basicDemo(model.isSwitchDemoChecked, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
