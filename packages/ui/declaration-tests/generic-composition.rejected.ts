import * as Popover from '@foldkit/ui/popover'

import {
  Application,
  DialogBinding,
  Picker,
  PickerBinding,
  helper,
} from './generic-composition.accepted.js'

// @ts-expect-error The connected Dialog operation takes no arguments.
DialogBinding.open('unexpected')

Picker.Message.SelectedItem({
  // @ts-expect-error The refined Message rejects an item outside its Schema.
  item: 'Banana',
  displayText: 'Banana',
  wasSelected: false,
})

// @ts-expect-error The connected operation preserves the item Schema.
PickerBinding.selectItem('Banana', 'Banana')

const Missing = Application.makeComposition()
Missing.makeView((model, h) => {
  // @ts-expect-error The helper requires both registered child Bindings.
  helper(model, h)

  h.OnMount(
    // @ts-expect-error The direct Popover Mount is unavailable.
    Popover.AnchorPopover({
      buttonId: 'missing',
      anchor: { placement: 'bottom' },
    }),
  )

  return h.div([])
})
