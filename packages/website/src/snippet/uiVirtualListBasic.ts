import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { VirtualList } from '@foldkit/ui'

const Activity = Schema.Struct({
  id: Schema.String,
  initial: Schema.String,
  label: Schema.String,
  timeAgo: Schema.String,
})
type Activity = typeof Activity.Type

const ActivityList = VirtualList.makeBlock<Activity>()

const Message = defineMessageUnion({
  ClickedScrollActivityListToMiddle: {},
})

// The list items stay in your domain Model. Only scroll and measurement state
// live in the VirtualList instance.
export class ActivityFeed extends Block<ActivityFeed>()('ActivityFeed', {
  Model: Schema.Struct({
    activityList: ActivityList,
    activities: Schema.Array(Activity),
  }),
  Message,
}) {}

export const ActivityFeedLive = ActivityFeed.make(
  Effect.fn(function* () {
    // Give the list a unique id and a row height in pixels. All rows share
    // this height.
    const activityList = yield* new ActivityList('activityList', {
      id: 'activity-list',
      rowHeightPx: 56,
    })

    return {
      model: { activityList, activities: [] },

      update: {
        ClickedScrollActivityListToMiddle: model => ({
          model,
          messages: [
            model.activityList.send(VirtualList.requestScrollToIndex(500)),
          ],
        }),
      },

      // Pass `items` from your Model, key each row by a stable identifier, and
      // give the container a fixed height. Without a fixed height (`h-96`
      // below) the container grows to fit its children and never scrolls.
      view: (model, h) =>
        model.activityList.view({
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
        }),
    }
  }),
).pipe(Layer.provide(ActivityList.Live))
