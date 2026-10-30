import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'

import { Menu } from '@foldkit/ui'

type Action = 'Edit' | 'Duplicate' | 'Archive' | 'Delete'

const ActionMenu = Menu.makeBlock<Action>()

const actions: ReadonlyArray<Action> = [
  'Edit',
  'Duplicate',
  'Archive',
  'Delete',
]

export class Toolbar extends Block<Toolbar>()('Toolbar', {
  Model: Schema.Struct({ menu: ActionMenu }),
}) {}

export const ToolbarLive = Toolbar.make(
  Effect.fn(function* () {
    const menu = yield* new ActionMenu('menu', {
      id: 'actions',
      isAnimated: true,
    })

    return {
      model: { menu },

      // Use data-[closed] for enter and leave transitions
      view: (model, h) =>
        model.menu.view({
          items: actions,
          buttonContent: h.span([], ['Options']),
          buttonClassName: 'rounded-lg border px-3 py-2 cursor-pointer',
          itemsClassName:
            'rounded-lg border shadow-lg transition duration-150 ease-out data-[closed]:opacity-0 data-[closed]:scale-95',
          itemToConfig: (action, { isActive }) => ({
            className: isActive ? 'bg-blue-100' : '',
            content: h.div([h.Class('px-3 py-2')], [action]),
          }),
          backdropClassName: 'fixed inset-0',
          anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
        }),
    }
  }),
).pipe(Layer.provide(ActionMenu.Live))
