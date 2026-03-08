import { Schema as S } from 'effect'
import {
  Checkbox,
  Combobox,
  Dialog,
  Disclosure,
  Listbox,
  Menu,
  Popover,
  RadioGroup,
  Switch,
  Tabs,
} from 'foldkit/ui'

export const Model = S.Struct({
  checkboxBasicDemo: Checkbox.Model,
  checkboxOptionADemo: Checkbox.Model,
  checkboxOptionBDemo: Checkbox.Model,
  comboboxDemo: Combobox.Model,
  comboboxNullableDemo: Combobox.Model,
  comboboxMultiDemo: Combobox.Multi.Model,
  comboboxSelectOnFocusDemo: Combobox.Model,
  dialogDemo: Dialog.Model,
  disclosureDemo: Disclosure.Model,
  listboxDemo: Listbox.Model,
  listboxMultiDemo: Listbox.Multi.Model,
  listboxGroupedDemo: Listbox.Model,
  menuBasicDemo: Menu.Model,
  menuAnimatedDemo: Menu.Model,
  popoverBasicDemo: Popover.Model,
  popoverAnimatedDemo: Popover.Model,
  verticalRadioGroupDemo: RadioGroup.Model,
  horizontalRadioGroupDemo: RadioGroup.Model,
  switchDemo: Switch.Model,
  horizontalTabsDemo: Tabs.Model,
  verticalTabsDemo: Tabs.Model,
})
export type Model = typeof Model.Type
