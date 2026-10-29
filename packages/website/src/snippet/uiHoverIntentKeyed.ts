// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, Message, and view
// definitions.
import { Array, Option, Schema, Tuple, pipe } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { HoverIntent } from '@foldkit/ui'
import type { RenderInfo as HoverIntentRenderInfo } from '@foldkit/ui/hoverIntent'

const Person = Schema.Struct({ id: Schema.String, name: Schema.String })

// One HoverIntent Model serves every person in the list:
const Model = Schema.Struct({
  people: Schema.Array(Person),
  hoverIntent: HoverIntent.HoverIntentBlock.Model,
})

const Message = defineMessageUnion({})

const PeopleDefinition = Block.makeDefinition('People', { Model, Message })

const { makeNoopStep } = PeopleDefinition

const foldHoverIntentOutMessage = PeopleDefinition.makeOutMessageFold(
  HoverIntent.HoverIntentBlock,
  {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
  },
)

const HoverIntentBinding = PeopleDefinition.makeBinding(
  HoverIntent.HoverIntentBlock,
  {
    field: 'hoverIntent',
    init: { contextToArgs: () => Tuple.make({}) },
  },
).withOutMessagePolicy({ fold: foldHoverIntentOutMessage })

const PeopleComposition = PeopleDefinition.makeComposition({
  bindings: [HoverIntentBinding],
})

// Spread `keyedTrigger(person.id)` onto each trigger. The single card renders
// whichever person `maybeActiveTriggerKey` names.
const view = PeopleComposition.makeView((model, h) => {
  const peopleView = ({
    keyedTrigger,
    maybeActiveTriggerKey,
    panel,
    isVisible,
  }: HoverIntentRenderInfo) => {
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
          [],
          Array.map(model.people, person =>
            h.keyed('li')(
              person.id,
              [],
              [
                h.button(
                  [
                    ...keyedTrigger(person.id),
                    h.Type('button'),
                    h.AriaExpanded(
                      Option.exists(
                        maybeVisiblePerson,
                        visiblePerson => visiblePerson.id === person.id,
                      ),
                    ),
                  ],
                  [person.name],
                ),
              ],
            ),
          ),
        ),
        ...Option.match(maybeVisiblePerson, {
          onNone: () => [],
          onSome: person => [h.div([...panel], [h.p([], [person.name])])],
        }),
      ],
    )
  }

  return h.block(
    HoverIntentBinding.embedView({
      slotId: 'people',
      model: model.hoverIntent,
      viewInputs: { toView: peopleView },
    }),
  )
})
