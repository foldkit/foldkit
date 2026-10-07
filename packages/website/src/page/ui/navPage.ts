import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import * as Nav from './demo/nav'
import type { Message } from './message'
import type { Model } from './model'
import raw from './navPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<'basic'>(
  raw,
  'ui/nav',
)

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderSnippet, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {
        basic: demoContainer(...Nav.basicDemo(model.navDemoSection, h)),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
