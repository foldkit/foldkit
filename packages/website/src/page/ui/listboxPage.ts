import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { ListboxPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Listbox from './demo/listbox'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = ListboxPageContent

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
  })
