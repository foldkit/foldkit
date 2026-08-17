import { Submodel } from 'foldkit'
import type { Html } from 'foldkit/html'

import { slotDocPage } from '../../markdown'
import { type RenderHeadingLink, demoContainer } from '../../prose'
import type { RenderCopyButton } from '../../view/codeBlock'
import * as Combobox from './combobox'
import raw from './comboboxPage.md'
import type { Message } from './message'
import type { Model } from './model'

const { tableOfContents, view: renderPage } = slotDocPage<
  | 'single-select'
  | 'nullable'
  | 'select-on-focus'
  | 'locked-placement'
  | 'multi'
>(raw, 'ui/combobox')

export { tableOfContents }

type ViewInputs = Readonly<{
  renderCopyButton: RenderCopyButton
  renderHeadingLink: RenderHeadingLink
}>

export const view = Submodel.defineView<Model, Message, ViewInputs>(
  (model, { renderCopyButton, renderHeadingLink }, h): Html =>
    renderPage({
      demos: {
        'single-select': demoContainer(
          ...Combobox.comboboxDemo(
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
      renderHeadingLink,
    }),
)
