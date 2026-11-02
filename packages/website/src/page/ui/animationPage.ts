import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { AnimationPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Animation from './demo/animation'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = AnimationPageContent

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
      animation: demoContainer(...Animation.view(model.animationDemo, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
