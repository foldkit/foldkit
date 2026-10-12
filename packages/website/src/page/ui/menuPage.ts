import { type Mount, Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Menu as UiMenu } from '@foldkit/ui'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import * as Menu from './demo/menu'
import raw from './menuPage.md'
import type { Message } from './message'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = slotDocPage<'basic' | 'animated'>(
  raw,
  'ui/menu',
)

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<
  Model,
  Message,
  ViewInputs,
  Mount.RequirementsOf<typeof UiMenu.mounts>
>((model, { renderCopyButton, renderSnippet, renderHeadingLink }, h): Html =>
  renderPage({
    demos: {
      basic: demoContainer(...Menu.basicDemo(model.menuBasicDemo, h)),
      animated: demoContainer(...Menu.animatedDemo(model.menuAnimatedDemo, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  }),
)
