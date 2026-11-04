import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import {
  layer as VirtualListLayer,
  ScrollContainer as VirtualListScrollContainer,
  makeBlock as makeVirtualListBlock,
} from '@foldkit/ui/virtualList'

const Activity = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  summary: Schema.String,
})
type Activity = typeof Activity.Type

const ActivityListBlock = makeVirtualListBlock<Activity>()
const Model = Schema.Struct({
  activities: Schema.Array(Activity),
  activityList: ActivityListBlock.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedJumpToLatestActivity: {} })
type Message = typeof Message.Type

export const ActivityFeedKey = Symbol('ActivityFeed')

export const ActivityFeedBlock = Block.make('ActivityFeed', {
  key: ActivityFeedKey,
  Init: Schema.Tuple([Schema.Array(Activity)]),
  view: { kind: 'Element' },
  Model,
  Message,
})
const { makeNoopStep } = ActivityFeedBlock

const ActivityListBinding = ActivityFeedBlock.makeBinding(ActivityListBlock, {
  field: 'activityList',
  init: {
    contextToArgs: () => [
      {
        id: 'activity-feed',
        rowHeightPx: 88,
        scrollContainer: VirtualListScrollContainer.Window(),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: ActivityFeedBlock.makeOutMessageFold(ActivityListBlock, {
    ObservedContainerScroll: makeNoopStep,
    ApproachedLoadedStart: makeNoopStep,
    EndedContainerScroll: makeNoopStep,
  }),
})
const ActivityFeedComposition = ActivityFeedBlock.makeComposition({
  bindings: [ActivityListBinding],
})
const init = ActivityFeedComposition.makeInit(activities => ({
  model: { activities },
}))
const update = ActivityFeedComposition.makeUpdate({
  ClickedJumpToLatestActivity: ActivityListBinding.requestScrollToEnd(),
})
const view = ActivityFeedComposition.makeView((model, h) =>
  h.section(
    [],
    [
      h.h2([], ['Activity']),
      h.button(
        [h.OnClick(Message.ClickedJumpToLatestActivity())],
        ['Latest activity'],
      ),
      h.block(
        ActivityListBinding.embedView({
          slotId: 'activity-feed',
          model: model.activityList,
          viewInputs: {
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
          },
        }),
      ),
    ],
  ),
)

export const layer = ActivityFeedBlock.makeLayer(
  Effect.gen(function* () {
    const activityList = yield* ActivityListBinding

    return {
      children: [activityList],
      init,
      update,
      view,
    }
  }),
).pipe(Layer.provide(VirtualListLayer))
