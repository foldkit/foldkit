import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import * as Tabs from './demo/tabs'
import type { Message } from './message'
import type { Model } from './model'
import raw from './tabsPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<
  'horizontal' | 'vertical'
>(raw, 'ui/tabs')

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderSnippet, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {
        horizontal: demoContainer(
          ...Tabs.horizontalDemo(
            model.horizontalTabsDemo,
            model.horizontalTabsDemoTab,
            h,
          ),
        ),
        vertical: demoContainer(
          ...Tabs.verticalDemo(
            model.verticalTabsDemo,
            model.verticalTabsDemoTab,
            h,
          ),
        ),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
