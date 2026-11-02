import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { TabsPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Tabs from './demo/tabs'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = TabsPageContent

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
  })
