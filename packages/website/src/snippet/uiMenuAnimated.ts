import { Tuple } from 'effect'

// Use the basic example's Model, Messages, update and OutMessage fold.
const MenuBinding = ActionMenuExample.bindChild(ActionMenu, {
  field: 'menu',
  parentMessage: Message.GotMenuMessage,
  outMessage: { fold: foldMenuOutMessage },
  init: {
    args: () => Tuple.make({ id: 'actions', isAnimated: true }),
  },
})

const ActionMenuExampleComposition = ActionMenuExample.makeComposition({
  childBindings: [MenuBinding],
})

const init = ActionMenuExampleComposition.makeInit(() => ({ model: {} }))

// Inside your view function, use data-[closed] for enter/leave transitions:
const view = ActionMenuExampleComposition.makeView((model, h) =>
  h.block(
    MenuBinding.embedView({
      slotId: 'menu',
      model: model.menu,
      viewInputs: {
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
      },
    }),
  ),
)
