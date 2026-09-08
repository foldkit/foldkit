import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import * as HoverIntent from './demo/hoverIntent'
import raw from './hoverIntentPage.md'
import type { Message } from './message'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = slotDocPage<
  'hover-card' | 'hover-menu'
>(raw, 'ui/hover-intent')

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
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
      renderHeadingLink,
    }),
)
