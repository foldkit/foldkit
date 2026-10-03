import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import * as Nav from './demo/nav'
import type { Message } from './message'
import type { Model } from './model'
import raw from './navPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<'basic'>(
  raw,
  'ui/nav',
)

export { tableOfContents }
export {
  NavDemoSection,
  defaultNavDemoSection,
  navDemoSectionFromUrl,
} from './demo/nav'

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderHeadingLink: RenderHeadingLink
  navDemoSection: Nav.NavDemoSection
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (_model, { renderCopyButton, renderHeadingLink, navDemoSection }, h): Html =>
    renderPage({
      demos: {
        basic: demoContainer(...Nav.basicDemo(navDemoSection, h)),
      },
      renderCopyButton,
      renderHeadingLink,
    }),
)
