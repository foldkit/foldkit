import { Effect, Layer, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Menu } from '@foldkit/ui'

const Action = Schema.Literals(['Edit', 'Duplicate', 'Archive', 'Delete'])
type Action = typeof Action.Type

const ActionMenu = Menu.makeBlock<Action>()

const actions: ReadonlyArray<Action> = [
  'Edit',
  'Duplicate',
  'Archive',
  'Delete',
]

export class Toolbar extends Block<Toolbar>()('Toolbar', {
  Model: Schema.Struct({
    menu: ActionMenu,
    maybeLastAction: Schema.Option(Action),
  }),
}) {}

export const ToolbarLive = Toolbar.make(
  Effect.fn(function* () {
    const menu = yield* new ActionMenu('menu', { id: 'actions' })

    return {
      model: { menu, maybeLastAction: Option.none() },

      update: {
        // `Selected` carries the picked item, typed as `Action`. Menu closes
        // itself after a selection.
        ...menu.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, {
              maybeLastAction: () => Option.some(value),
            }),
          }),
        }),
      },

      // `buttonContent` names the trigger. When the trigger is icon-only, pass
      // `ariaLabel`, or point `ariaLabelledBy` at a visible label element.
      view: (model, h) =>
        model.menu.view({
          // ariaLabel: 'Options',
          items: actions,
          buttonContent: h.span([], ['Options']),
          buttonClassName: 'rounded-lg border px-3 py-2 cursor-pointer',
          itemsClassName: 'rounded-lg border shadow-lg',
          itemToConfig: (action, { isActive }) => ({
            className: isActive ? 'bg-blue-100' : '',
            content: h.div([h.Class('px-3 py-2')], [action]),
          }),
          isItemDisabled: action => action === 'Archive',
          backdropClassName: 'fixed inset-0',
          anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
        }),
    }
  }),
).pipe(Layer.provide(ActionMenu.Live))
