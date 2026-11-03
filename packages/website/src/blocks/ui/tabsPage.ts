import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import { TabsPageContent } from './content'
import * as Tabs from './demo/tabs'

const { tableOfContents, view: renderPage } = TabsPageContent

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderSnippet: CodeBlock.RenderSnippet
  renderHeadingLink: RenderHeadingLink
}>

export const view = UiComposition.makeView.withInputs<ViewInputs>(
  (model, { renderCopyButton, renderSnippet, renderHeadingLink }, h) =>
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
