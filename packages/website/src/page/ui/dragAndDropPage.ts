import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { DragAndDropPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as DragAndDrop from './demo/dragAndDrop'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = DragAndDropPageContent

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
      demo: demoContainer(...DragAndDrop.demo(model, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
