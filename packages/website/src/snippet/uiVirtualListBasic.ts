// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, view, and subscription definitions.
import { Effect, Schema as S } from 'effect'
import { Command, Subscription, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Add a field to your Model for the VirtualList Submodel. The list items
// stay in your domain Model (your own `activities`, `messages`, `rows`,
// whatever you call them); only scroll and measurement state live here:
const Model = S.Struct({
  activityList: Ui.VirtualList.Model,
  // ...your other fields, including the items array you want to render
})

// In your init function, give the list a unique id and a row height in
// pixels. All rows share this height:
const init = () => [
  {
    activityList: Ui.VirtualList.init({
      id: 'activity-list',
      rowHeightPx: 56,
    }),
    // ...your other fields
  },
  [],
]

// Embed the VirtualList Message in your parent Message:
const GotActivityListMessage = m('GotActivityListMessage', {
  message: Ui.VirtualList.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to
// VirtualList.update:
GotActivityListMessage: ({ message }) => {
  const [nextList, commands] = Ui.VirtualList.update(
    model.activityList,
    message,
  )

  return [
    evo(model, { activityList: () => nextList }),
    Command.mapMessages(commands, message =>
      GotActivityListMessage({ message }),
    ),
  ]
}

// Wire the VirtualList container subscription into your app's
// subscriptions. This powers scroll tracking and container resize
// observation:
const activityListSubscriptions = Subscription.lift({
  activityListEvents: Ui.VirtualList.subscriptions.containerEvents,
})<Model, Message>({
  toChildModel: model => model.activityList,
  toParentMessage: message => GotActivityListMessage({ message }),
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
const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'activity-list',
    model: model.activityList,
    view: Ui.VirtualList.view<Activity>(),
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
    toParentMessage: message => GotActivityListMessage({ message }),
  })
}

// Programmatic scrolling. Returns [Model, Commands] in the same shape as
// update. Stale completions are version-cancelled, so rapid successive
// calls do not fight each other:
const [nextList, commands] = Ui.VirtualList.scrollToIndex(
  model.activityList,
  500,
)
