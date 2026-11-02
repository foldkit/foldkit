import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { MenuPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Menu from './demo/menu'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = MenuPageContent

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
      basic: demoContainer(...Menu.basicDemo(model.menuBasicDemo, h)),
      animated: demoContainer(...Menu.animatedDemo(model.menuAnimatedDemo, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
