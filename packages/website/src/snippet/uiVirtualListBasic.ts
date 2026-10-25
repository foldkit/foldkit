// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update and view definitions.
import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { VirtualList } from '@foldkit/ui'

const Activity = Schema.Struct({
  id: Schema.String,
  initial: Schema.String,
  label: Schema.String,
  timeAgo: Schema.String,
})

const ActivityList = VirtualList.create<typeof Activity.Type>()

// Add a field to your Model for the VirtualList Block. The list items
// stay in your domain Model (your own `activities`, `messages`, `rows`,
// whatever you call them); only scroll and measurement state live here:
const Model = Schema.Struct({
  activityList: ActivityList.Model,
  activities: Schema.Array(Activity),
})

// Declare only the parent-owned scrolling fact. The Composition derives
// VirtualList delivery from the Binding.
const Message = defineMessageUnion({
  ClickedScrollActivityListToMiddle: {},
})

const ActivityListExampleDefinition = Block.makeDefinition(
  'ActivityListExample',
  {
    Model,
    Message,
  },
)

const foldActivityListOutMessage =
  ActivityListExampleDefinition.makeOutMessageFold(ActivityList, {
    ObservedContainerScroll: ActivityListExampleDefinition.makeNoopStep,
  })

const ActivityListBinding = ActivityListExampleDefinition.makeBinding(
  ActivityList,
  {
    field: 'activityList',
    init: {
      contextToArgs: () => Tuple.make({ id: 'activity-list', rowHeightPx: 56 }),
    },
  },
).withOutMessagePolicy({ fold: foldActivityListOutMessage })

const ActivityListExampleComposition =
  ActivityListExampleDefinition.makeComposition({
    bindings: [ActivityListBinding],
  })

// In your init function, give the list a unique id and a row height in
// pixels. All rows share this height:
const init = ActivityListExampleComposition.makeInit(() => ({
  model: {
    activities: [],
  },
}))

const update = ActivityListExampleComposition.makeUpdate({
  ClickedScrollActivityListToMiddle: model =>
    ActivityListBinding.requestScrollToIndex(500)(model),
})

// Inside your view, render the list. Pass `items` from your Model, key
// each row by a stable identifier (the data id, not its array position),
// and give the container a fixed height. Note `h-96` below: without a
// fixed height the container grows to fit its children and never scrolls.
// The component sets only `overflow: auto` inline; everything else is
// yours:
const view = ActivityListExampleComposition.makeView(
  (model, h) =>
    h.block(
      ActivityListBinding.embedView({
        slotId: 'activity-list',
        model: model.activityList,
        viewInputs: {
          items: model.activities,
          itemToKey: activity => String(activity.id),
          itemToView: activity =>
            h.div(
              [
                h.Class(
                  'grid grid-cols-[2rem_1fr_5rem] items-center gap-3 px-4',
                ),
              ],
              [
                h.div(
                  [
                    h.Class(
                      'flex h-7 w-7 items-center justify-center rounded-full',
                    ),
                  ],
                  [activity.initial],
                ),
                h.span([h.Class('truncate text-sm')], [activity.label]),
                h.span(
                  [h.Class('text-right text-xs text-gray-500 tabular-nums')],
                  [activity.timeAgo],
                ),
              ],
            ),
          containerClassName:
            'h-96 w-full rounded-lg bg-white ring-1 ring-gray-200',
        },
      }),
    ),

  // The programmatic scroll uses the same child fold as ordinary Messages. Its
  // completion Command stays inside the VirtualList Message boundary. The
  // component's container Mount owns scroll and resize observation, so no
  // Subscription wiring is required.
)
