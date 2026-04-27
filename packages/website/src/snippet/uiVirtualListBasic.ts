// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, view, and subscription definitions.
import { Effect, Schema as S, Stream } from 'effect'
import { Command, Subscription, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, span } from './html'

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
    commands.map(
      Command.mapEffect(
        Effect.map(message => GotActivityListMessage({ message })),
      ),
    ),
  ]
}

// Wire the VirtualList container subscription into your app's
// SubscriptionDeps and subscriptions. This powers scroll tracking and
// container resize observation:
const virtualListFields = Ui.VirtualList.SubscriptionDeps.fields

const SubscriptionDeps = S.Struct({
  activityListEvents: virtualListFields['containerEvents'],
  // ...your other subscription deps
})

const virtualListSubscriptions = Ui.VirtualList.subscriptions

const subscriptions = Subscription.makeSubscriptions(SubscriptionDeps)<
  Model,
  Message
>({
  activityListEvents: {
    modelToDependencies: model =>
      virtualListSubscriptions.containerEvents.modelToDependencies(
        model.activityList,
      ),
    dependenciesToStream: (dependencies, readDependencies) =>
      virtualListSubscriptions.containerEvents
        .dependenciesToStream(dependencies, readDependencies)
        .pipe(Stream.map(message => GotActivityListMessage({ message }))),
  },
})

// Inside your view, render the list. Pass `items` from your Model, key
// each row by a stable identifier (the data id, not its array position),
// and give the container a fixed height. Note `h-96` below: without a
// fixed height the container grows to fit its children and never scrolls.
// The component sets only `overflow: auto` inline; everything else is
// yours:
Ui.VirtualList.view({
  model: model.activityList,
  items: model.activities,
  itemToKey: activity => String(activity.id),
  itemToView: activity =>
    div(
      [Class('grid grid-cols-[2rem_1fr_5rem] items-center gap-3 px-4')],
      [
        div(
          [Class('flex h-7 w-7 items-center justify-center rounded-full')],
          [activity.initial],
        ),
        span([Class('truncate text-sm')], [activity.label]),
        span(
          [Class('text-right text-xs text-gray-500 tabular-nums')],
          [activity.timeAgo],
        ),
      ],
    ),
  className: 'h-96 w-full rounded-lg bg-white ring-1 ring-gray-200',
})

// Programmatic scrolling. Returns [Model, Commands] in the same shape as
// update. Stale completions are version-cancelled, so rapid successive
// calls do not fight each other:
const [nextList, commands] = Ui.VirtualList.scrollToIndex(
  model.activityList,
  500,
)
