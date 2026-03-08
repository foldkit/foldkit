import { Ui } from 'foldkit'
import { Command } from 'foldkit/command'

import type { Message } from './message'
import type { Model } from './model'

export type InitReturn = [Model, ReadonlyArray<Command<Message>>]

export const init = (): InitReturn => [
  {
    buttonClickCount: 0,
    inputDemoValue: '',
    textareaDemoValue: '',
    checkboxBasicDemo: Ui.Checkbox.init({ id: 'checkbox-basic-demo' }),
    checkboxOptionADemo: Ui.Checkbox.init({
      id: 'checkbox-option-a-demo',
    }),
    checkboxOptionBDemo: Ui.Checkbox.init({
      id: 'checkbox-option-b-demo',
    }),
    comboboxDemo: Ui.Combobox.init({ id: 'combobox-demo' }),
    comboboxNullableDemo: Ui.Combobox.init({
      id: 'combobox-nullable-demo',
      nullable: true,
    }),
    comboboxMultiDemo: Ui.Combobox.Multi.init({
      id: 'combobox-multi-demo',
    }),
    comboboxSelectOnFocusDemo: Ui.Combobox.init({
      id: 'combobox-select-on-focus-demo',
      selectInputOnFocus: true,
    }),
    dialogDemo: Ui.Dialog.init({ id: 'dialog-demo' }),
    disclosureDemo: Ui.Disclosure.init({ id: 'disclosure-demo' }),
    listboxDemo: Ui.Listbox.init({ id: 'listbox-demo' }),
    listboxMultiDemo: Ui.Listbox.Multi.init({
      id: 'listbox-multi-demo',
    }),
    listboxGroupedDemo: Ui.Listbox.init({
      id: 'listbox-grouped-demo',
    }),
    menuBasicDemo: Ui.Menu.init({ id: 'menu-basic-demo' }),
    menuAnimatedDemo: Ui.Menu.init({
      id: 'menu-animated-demo',
      isAnimated: true,
    }),
    popoverBasicDemo: Ui.Popover.init({ id: 'popover-basic-demo' }),
    popoverAnimatedDemo: Ui.Popover.init({
      id: 'popover-animated-demo',
      isAnimated: true,
    }),
    verticalRadioGroupDemo: Ui.RadioGroup.init({
      id: 'vertical-radio-group-demo',
    }),
    horizontalRadioGroupDemo: Ui.RadioGroup.init({
      id: 'horizontal-radio-group-demo',
      orientation: 'Horizontal',
    }),
    switchDemo: Ui.Switch.init({ id: 'switch-demo' }),
    horizontalTabsDemo: Ui.Tabs.init({ id: 'horizontal-tabs-demo' }),
    verticalTabsDemo: Ui.Tabs.init({
      id: 'vertical-tabs-demo',
    }),
  },
  [],
]
