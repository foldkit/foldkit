import type { Url } from 'foldkit/url'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import * as Nav from './demo/nav'
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
  url: Url
}>

export const view = UiComposition.makeView.withInputs<ViewInputs>(
  (_model, { renderCopyButton, renderSnippet, renderHeadingLink, url }, h) =>
    renderPage({
      demos: {
        basic: demoContainer(...Nav.basicDemo(url, h)),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
