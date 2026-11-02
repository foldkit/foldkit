import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { HoverIntentPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as HoverIntent from './demo/hoverIntent'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = HoverIntentPageContent

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
      'hover-card': demoContainer(
        ...HoverIntent.hoverCardDemo(model.hoverIntentCardDemo, h),
      ),
      'hover-menu': demoContainer(
        ...HoverIntent.hoverMenuDemo(model.hoverIntentMenuDemo, h),
      ),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
