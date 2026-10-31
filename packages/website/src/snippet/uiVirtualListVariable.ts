import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { VirtualList } from '@foldkit/ui'

const Activity = Schema.Struct({
  id: Schema.String,
  initial: Schema.String,
  label: Schema.String,
  summary: Schema.String,
  hasSummary: Schema.Boolean,
  timeAgo: Schema.String,
})
type Activity = typeof Activity.Type

const ActivityList = VirtualList.makeBlock<Activity>()

const Message = defineMessageUnion({
  ClickedScrollActivityListToMiddle: {},
})

export class ActivityFeed extends Block<ActivityFeed>()('ActivityFeed', {
  Model: Schema.Struct({
    activityList: ActivityList,
    activities: Schema.Array(Activity),
  }),
  Message,
}) {}

export const ActivityFeedLive = ActivityFeed.make(
  Effect.fn(function* () {
    const activityList = yield* new ActivityList('activityList', {
      id: 'activity-list',
      rowHeightPx: 56,
    })

    return {
      model: { activityList, activities: [] },

      update: {
        // Programmatic scrolling works the same with variable heights. The
        // next view resolves the logical index and the Command aligns the
        // rendered row.
        ClickedScrollActivityListToMiddle: model => ({
          model,
          messages: [
            model.activityList.send(VirtualList.requestScrollToIndex(500)),
          ],
        }),
      },

      // `itemToRowHeightPx` sizes each row wrapper to the height it returns
      // for that item
      view: (model, h) =>
        model.activityList.view({
          items: model.activities,
          itemToKey: activity => String(activity.id),
          itemToRowHeightPx: activity => (activity.hasSummary ? 104 : 56),
          itemToView: activity =>
            activity.hasSummary
              ? h.div(
                  [
                    h.Class(
                      'grid grid-cols-[2rem_1fr_5rem] items-start gap-3 px-4 py-3',
                    ),
                  ],
                  [
                    h.div(
                      [h.Class('h-7 w-7 rounded-full')],
                      [activity.initial],
                    ),
                    h.div(
                      [],
                      [
                        h.span([], [activity.label]),
                        h.div(
                          [h.Class('mt-1 text-xs text-gray-500')],
                          [activity.summary],
                        ),
                      ],
                    ),
                    h.span([h.Class('text-right text-xs')], [activity.timeAgo]),
                  ],
                )
              : h.div(
                  [
                    h.Class(
                      'grid grid-cols-[2rem_1fr_5rem] items-center gap-3 px-4',
                    ),
                  ],
                  [
                    h.div(
                      [h.Class('h-7 w-7 rounded-full')],
                      [activity.initial],
                    ),
                    h.span([], [activity.label]),
                    h.span([h.Class('text-right text-xs')], [activity.timeAgo]),
                  ],
                ),
          containerClassName:
            'h-96 w-full rounded-lg bg-white ring-1 ring-gray-200',
        }),
    }
  }),
).pipe(Layer.provide(ActivityList.Live))
