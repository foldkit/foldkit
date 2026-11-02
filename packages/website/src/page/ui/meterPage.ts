import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { MeterPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Meter from './demo/meter'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = MeterPageContent

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
      basic: demoContainer(...Meter.basicDemo(h)),
      thresholds: demoContainer(...Meter.thresholdsDemo(h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
