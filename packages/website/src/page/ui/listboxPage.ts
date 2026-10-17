import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import * as Listbox from './demo/listbox'
import raw from './listboxPage.md'

const { tableOfContents, view: renderPage } = slotDocPage<
  'basic' | 'multi-select' | 'grouped'
>(raw, 'ui/listbox')

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
        basic: demoContainer(
          ...Listbox.basicDemo(
            model.listboxDemo,
            model.maybeListboxDemoSelectedItem,
            h,
          ),
        ),
        'multi-select': demoContainer(
          ...Listbox.multiSelectDemo(
            model.listboxMultiDemo,
            model.listboxMultiDemoSelectedItems,
            h,
          ),
        ),
        grouped: demoContainer(
          ...Listbox.groupedDemo(
            model.listboxGroupedDemo,
            model.maybeListboxGroupedDemoSelectedItem,
            h,
          ),
        ),
      },
      renderCopyButton,
      renderSnippet,
      renderHeadingLink,
    }),
)
