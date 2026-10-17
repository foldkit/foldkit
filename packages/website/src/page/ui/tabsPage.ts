import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import * as Tabs from './demo/tabs'
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
