import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import raw from './calendarPage.md'
import * as Calendar from './demo/calendar'
import type { Message } from './message'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = slotDocPage<'basic'>(
  raw,
  'ui/calendar',
)

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {
        basic: demoContainer(...Calendar.basicDemo(model, h)),
      },
      renderCopyButton,
      renderHeadingLink,
    }),
)
