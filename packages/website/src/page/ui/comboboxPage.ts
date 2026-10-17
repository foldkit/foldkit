import { type CodeBlock } from '../../component'
import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import raw from './comboboxPage.md'
import { UiComposition } from './composition'
import * as Combobox from './demo/combobox'

const { tableOfContents, view: renderPage } = slotDocPage<
  | 'single-select'
  | 'nullable'
  | 'select-on-focus'
  | 'locked-placement'
  | 'multi'
>(raw, 'ui/combobox')

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
    }),
)
