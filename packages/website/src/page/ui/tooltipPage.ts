import { type Mount, Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { Tooltip as UiTooltip } from '@foldkit/ui'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import * as Tooltip from './demo/tooltip'
import type { Message } from './message'
import type { Model } from './model'
import raw from './tooltipPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<'demo'>(
  raw,
  'ui/tooltip',
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
  Mount.RequirementsOf<typeof UiTooltip.mounts>
>((model, { renderCopyButton, renderSnippet, renderHeadingLink }, h): Html =>
  renderPage({
    demos: {
      demo: demoContainer(...Tooltip.demo(model.tooltipDemo, h)),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  }),
)
