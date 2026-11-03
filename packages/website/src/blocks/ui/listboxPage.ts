import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import { ListboxPageContent } from './content'
import * as Listbox from './demo/listbox'

const { tableOfContents, view: renderPage } = ListboxPageContent

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
