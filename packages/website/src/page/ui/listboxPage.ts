import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import * as Listbox from './demo/listbox'
import raw from './listboxPage.md'
import type { Message } from './message'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = slotDocPage<
  'basic' | 'multi-select' | 'grouped'
>(raw, 'ui/listbox')

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: CodeBlock.RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
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
      renderHeadingLink,
    }),
)
