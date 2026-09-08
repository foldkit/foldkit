import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import raw from './animationPage.md'
import * as Animation from './demo/animation'
import type { Message } from './message'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = slotDocPage<'animation'>(
  raw,
  'ui/animation',
)

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {
        animation: demoContainer(...Animation.view(model.animationDemo, h)),
      },
      renderCopyButton,
      renderHeadingLink,
    }),
)
