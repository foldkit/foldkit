// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, view, and subscription definitions.
import { Effect, Schema as S } from 'effect'
import { Command, Subscription } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { VirtualList } from '@foldkit/ui'

// Add a field to your Model for the VirtualList Submodel. The list items
// stay in your domain Model (your own `activities`, `messages`, `rows`,
// whatever you call them); only scroll and measurement state live here:
const Model = S.Struct({
  activityList: VirtualList.Model,
  // ...your other fields, including the items array you want to render
})

// In your init function, give the list a unique id and a row height in
// pixels. All rows share this height:
const init = () => ({
  model: {
    activityList: VirtualList.init({
      id: 'activity-list',
      rowHeightPx: 56,
    }),
    // ...your other fields
  },
})

// Embed the VirtualList Message in your parent Message:
const Message = defineMessageUnion({
  GotActivityListMessage: { message: VirtualList.Message },
})

// Inside your update function's Message.match({...}), delegate to
// VirtualList.update:
GotActivityListMessage: ({ message }) => {
  const activityListUpdate = VirtualList.update(model.activityList, message)

  return {
    model: evo(model, { activityList: () => activityListUpdate.model }),
    commands: Command.mapMessages(activityListUpdate.commands ?? [], message =>
      Message.GotActivityListMessage({ message }),
    ),
  }
}

// Wire the VirtualList container subscription into your app's
// subscriptions. This powers scroll tracking and container resize
// observation:
const activityListSubscriptions = Subscription.lift({
  activityListEvents: VirtualList.subscriptions.containerEvents,
})<Model, Message>({
  toChildModel: model => model.activityList,
  toParentMessage: message => Message.GotActivityListMessage({ message }),
})

const subscriptions = Subscription.aggregate<Model, Message>()(
  activityListSubscriptions,
  // ...your other subscription records
)

// Inside your view, render the list. Pass `items` from your Model, key
// each row by a stable identifier (the data id, not its array position),
// and give the container a fixed height. Note `h-96` below: without a
// fixed height the container grows to fit its children and never scrolls.
// The component sets only `overflow: auto` inline; everything else is
// yours:
const view = (model: Model, h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'activity-list',
    model: model.activityList,
    view: VirtualList.view<Activity>(),
    viewInputs: {
      items: model.activities,
      itemToKey: activity => String(activity.id),
      itemToView: activity =>
        h.div(
          [h.Class('grid grid-cols-[2rem_1fr_5rem] items-center gap-3 px-4')],
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
    toParentMessage: message => Message.GotActivityListMessage({ message }),
  })

// Programmatic scrolling. Returns { model, commands? } in the same shape as
// update. Stale completions are version-cancelled, so rapid successive
// calls do not fight each other:
const listScroll = VirtualList.scrollToIndex(model.activityList, 500)
