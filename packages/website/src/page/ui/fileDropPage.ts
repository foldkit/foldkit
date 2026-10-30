import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { FileDropPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as FileDrop from './demo/fileDrop'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = FileDropPageContent

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
      basic: demoContainer(...FileDrop.basicDemo(model, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
