import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { MenuPicker, Notifications, Picker } from './generic-blocks.accepted.js'

MenuPicker.OutMessage.match<string>({
  Selected: ({ value }) => {
    // @ts-expect-error The Menu OutMessage matcher preserves its item refinement.
    const banana: 'Banana' = value
    return banana
  },
  Closed: () => '',
})

MenuPicker.OutMessage.match<string>(
  // @ts-expect-error The Menu OutMessage matcher requires the Closed variant.
  { Selected: () => '' },
)

Picker.Message.RequestedSelectItem({
  // @ts-expect-error The refined Combobox Message rejects an item outside its Schema.
  item: 'Banana',
  displayText: 'Banana',
})

Notifications.requestShow({
  payload: {
    // @ts-expect-error Toast show retains the payload Schema refinement.
    kind: 'Unknown',
  },
})

Notifications.requestShow({
  payload: { kind: 'Saved' },
  // @ts-expect-error Toast show accepts Effect Duration inputs only.
  duration: false,
})

class Orchard extends Block<Orchard>()('Orchard', {
  Model: Schema.Struct({ menu: MenuPicker, picker: Picker }),
  Message: defineMessageUnion({ ClickedFruit: {} }),
}) {}

export const OrchardLive = Orchard.make(
  Effect.fn(function* () {
    const menu = yield* new MenuPicker('menu', { id: 'menu' })
    const picker = yield* new Picker('picker', { id: 'picker' })

    // @ts-expect-error Menu constructor args require the DOM id.
    yield* new MenuPicker('missingId', {})

    return {
      model: { menu, picker },
      update: {
        ClickedFruit: model => ({ model }),
        ...menu.on({
          Selected: (model, { value }) => {
            // @ts-expect-error Parent OutMessage handlers preserve the generic Menu payload.
            const wrong: 'Banana' = value
            return { model: wrong === 'Banana' ? model : model }
          },
        }),
        ...picker.on({
          // @ts-expect-error Parent OutMessage handlers accept only declared OutMessage tags.
          Opened: model => ({ model }),
        }),
      },
    }
  }),
)
