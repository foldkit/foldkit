import { type CodeBlock } from '../../component'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import { UiComposition } from './composition'
import { ComboboxPageContent } from './content'
import * as Combobox from './demo/combobox'

const { tableOfContents, view: renderPage } = ComboboxPageContent

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
