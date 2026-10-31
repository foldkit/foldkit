import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { ProgressPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Progress from './demo/progress'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = ProgressPageContent

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = (
  _model: Model,
  { renderCopyButton, renderSnippet, renderHeadingLink }: ViewInputs,
  h: UiViewBuilder,
): Html =>
  renderPage({
    demos: {
      basic: demoContainer(...Progress.basicDemo(h)),
      indeterminate: demoContainer(...Progress.indeterminateDemo(h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
