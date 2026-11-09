import { Array, Layer, Option, Schema, pipe } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { HoverIntent } from '@foldkit/ui'

const Person = Schema.Struct({ id: Schema.String, name: Schema.String })

// One HoverIntent Model serves every person in the list:
const Model = Schema.Struct({
  people: Schema.Array(Person),
  hoverIntent: HoverIntent.HoverIntentBlock.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({
  ClickedRemovePerson: { personId: Schema.String },
})
type Message = typeof Message.Type

export const PeopleKey = Symbol('People')
export const PeopleBlock = Block.make('People', {
  key: PeopleKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  Model,
  Message,
})

const {
  makeNoopStep,
  makeOutMessageFold,
  makeRequiredFieldBinding,
  makeComposition,
} = PeopleBlock

const HoverIntentBinding = makeRequiredFieldBinding(
  HoverIntent.HoverIntentBlock,
  {
    field: 'hoverIntent',
  },
).withOutMessagePolicy({
  fold: makeOutMessageFold(HoverIntent.HoverIntentBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
  }),
})

const PeopleComposition = makeComposition({
  bindings: [HoverIntentBinding],
})

const init = PeopleComposition.makeInit(() => ({
  model: {
    people: [
      { id: 'ada', name: 'Ada Lovelace' },
      { id: 'grace', name: 'Grace Hopper' },
    ],
  },
}))

// A removed trigger cannot report the pointer or focus leaving it, so tell
// HoverIntent its key is gone:
const update = PeopleComposition.makeUpdate({
  ClickedRemovePerson: (model, { personId }) =>
    HoverIntentBinding.informOfRemovedKeyedTrigger({ key: personId })(
      modifyFields(model, {
        people: Array.filter(person => person.id !== personId),
      }),
    ),
})

const listId = 'people-list'
const panelId = 'person-card'

const view = PeopleComposition.makeView((model, h) => {
  const peopleView = ({
    keyedTrigger,
    maybeActiveTriggerKey,
    panel,
    isVisible,
  }: HoverIntent.RenderInfo) => {
    const maybeVisiblePerson = pipe(
      maybeActiveTriggerKey,
      Option.filter(() => isVisible),
      Option.flatMap(personId =>
        Array.findFirst(model.people, person => person.id === personId),
      ),
    )

    return h.div(
      [],
      [
        h.ul(
          [h.Id(listId)],
          Array.map(model.people, person =>
            h.keyed('li')(
              person.id,
              [],
              [
                h.button(
                  [
                    // Spread `keyedTrigger(person.id)` onto each trigger. The
                    // single card renders whichever person
                    // `maybeActiveTriggerKey` names.
                    ...keyedTrigger(person.id),
                    h.Type('button'),
                    h.AriaControls(panelId),
                    h.AriaExpanded(
                      Option.exists(
                        maybeVisiblePerson,
                        visiblePerson => visiblePerson.id === person.id,
                      ),
                    ),
                  ],
                  [person.name],
                ),
                h.button(
                  [
                    h.Type('button'),
                    h.OnClick(
                      Message.ClickedRemovePerson({ personId: person.id }),
                    ),
                  ],
                  ['Remove'],
                ),
              ],
            ),
          ),
        ),
        ...Option.match(maybeVisiblePerson, {
          onNone: () => [],
          onSome: person => [
            h.div([...panel, h.Id(panelId)], [h.p([], [person.name])]),
          ],
        }),
      ],
    )
  }

  return h.block(
    HoverIntentBinding.embedView({
      slotId: 'people',
      model: model.hoverIntent,
      viewInputs: {
        focusTriggerSelector: `#${listId} [aria-expanded="true"]`,
        toView: peopleView,
      },
    }),
  )
})

export const layer = PeopleBlock.makeLayer({
  init,
  update,
  view,
}).pipe(Layer.provide(HoverIntent.layer))
