import type { Html } from 'foldkit/html'
import type { Url } from 'foldkit/url'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { NavPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Nav from './demo/nav'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = NavPageContent

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
  url: Url
}>

export const view = (
  _model: Model,
  { renderCopyButton, renderSnippet, renderHeadingLink, url }: ViewInputs,
  h: UiViewBuilder,
): Html =>
  renderPage({
    demos: {
      basic: demoContainer(...Nav.basicDemo(url, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
