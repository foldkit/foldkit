import type { Html } from 'foldkit/html'

import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { ComboboxPageContent } from './content'
import type { UiViewBuilder } from './definition'
import * as Combobox from './demo/combobox'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = ComboboxPageContent

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
      'single-select': demoContainer(
        ...Combobox.view(
          model.comboboxDemo,
          model.maybeComboboxDemoSelectedCity,
          h,
        ),
      ),
      nullable: demoContainer(
        ...Combobox.nullableDemo(
          model.comboboxNullableDemo,
          model.maybeComboboxNullableDemoSelectedCity,
          h,
        ),
      ),
      'select-on-focus': demoContainer(
        ...Combobox.selectOnFocusDemo(
          model.comboboxSelectOnFocusDemo,
          model.maybeComboboxSelectOnFocusDemoSelectedCity,
          h,
        ),
      ),
      'locked-placement': demoContainer(
        ...Combobox.placementLockDemo(
          model.comboboxPlacementLockDemo,
          model.maybeComboboxPlacementLockDemoSelectedCity,
          h,
        ),
      ),
      multi: demoContainer(
        ...Combobox.multiDemo(
          model.comboboxMultiDemo,
          model.comboboxMultiDemoSelectedCities,
          h,
        ),
      ),
    },
    renderCopyButton,
    renderSnippet,
    renderHeadingLink,
  })
