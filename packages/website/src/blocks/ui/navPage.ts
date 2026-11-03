import type { Url } from 'foldkit/url'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import { NavPageContent } from './content'
import * as Nav from './demo/nav'

const { tableOfContents, view: renderPage } = NavPageContent

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
