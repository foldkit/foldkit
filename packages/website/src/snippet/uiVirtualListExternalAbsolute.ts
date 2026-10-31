import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { VirtualList } from '@foldkit/ui'

const Activity = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  summary: Schema.String,
})
type Activity = typeof Activity.Type

const ActivityList = VirtualList.makeBlock<Activity>()

const Message = defineMessageUnion({ ClickedJumpToLatestActivity: {} })

export class ActivityFeed extends Block<
  ActivityFeed,
  Readonly<{ activities: ReadonlyArray<Activity> }>
>()('ActivityFeed', {
  Model: Schema.Struct({
    activities: Schema.Array(Activity),
    activityList: ActivityList,
  }),
  Message,
}) {}

export const ActivityFeedLive = ActivityFeed.make(
  Effect.fn(function* (_id, { activities }) {
    // The window scrolls, not the list
    const activityList = yield* new ActivityList('activityList', {
      id: 'activity-feed',
      rowHeightPx: 88,
      scrollContainer: VirtualList.ScrollContainer.Window(),
    })

    return {
      model: { activities, activityList },

      update: {
        ClickedJumpToLatestActivity: model => ({
          model,
          messages: [model.activityList.send(VirtualList.requestScrollToEnd())],
        }),
      },

      view: (model, h) =>
        h.section(
          [],
          [
            h.h2([], ['Activity']),
            h.button(
              [h.OnClick(Message.ClickedJumpToLatestActivity())],
              ['Latest activity'],
            ),
            model.activityList.view({
              items: model.activities,
              itemToKey: activity => activity.id,
              containerElement: 'div',
              rowElement: 'div',
              rowLayout: 'Absolute',
              itemToView: activity =>
                h.article(
                  [h.Class('h-full border-b px-4 py-3')],
                  [
                    h.h3([], [activity.title]),
                    h.p([h.Class('truncate')], [activity.summary]),
                  ],
                ),
            }),
          ],
        ),
    }
  }),
).pipe(Layer.provide(ActivityList.Live))
