import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { TooltipPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Tooltip from './demo/tooltip'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = TooltipPageContent

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
      demo: demoContainer(...Tooltip.demo(model.tooltipDemo, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
