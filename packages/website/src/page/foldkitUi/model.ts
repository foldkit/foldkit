import { Schema as S } from 'effect'
import {
  Combobox,
  Dialog,
  Disclosure,
  Listbox,
  Menu,
  Popover,
  Switch,
  Tabs,
} from 'foldkit/ui'

export const Model = S.Struct({
  comboboxDemo: Combobox.Model,
  dialogDemo: Dialog.Model,
  disclosureDemo: Disclosure.Model,
  listboxDemo: Listbox.Model,
  listboxMultiDemo: Listbox.Multi.Model,
  listboxGroupedDemo: Listbox.Model,
  menuBasicDemo: Menu.Model,
  menuAnimatedDemo: Menu.Model,
  popoverBasicDemo: Popover.Model,
  popoverAnimatedDemo: Popover.Model,
  switchDemo: Switch.Model,
  horizontalTabsDemo: Tabs.Model,
  verticalTabsDemo: Tabs.Model,
})
export type Model = typeof Model.Type
