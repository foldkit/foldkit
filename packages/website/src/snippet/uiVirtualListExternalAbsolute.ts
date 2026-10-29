import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { VirtualList } from '@foldkit/ui'

const Activity = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  summary: Schema.String,
})
type Activity = typeof Activity.Type

const ActivityListBlock = VirtualList.makeBlock<Activity>()
const Model = Schema.Struct({
  activities: Schema.Array(Activity),
  activityList: ActivityListBlock.Model,
})
type Model = typeof Model.Type

const Message = defineMessageUnion({ ClickedJumpToLatestActivity: {} })
type Message = typeof Message.Type

const ActivityFeedDefinition = Block.makeDefinition('ActivityFeed', {
  Model,
  Message,
})
const { makeNoopStep } = ActivityFeedDefinition

const ActivityListBinding = ActivityFeedDefinition.makeBinding(
  ActivityListBlock,
  {
    field: 'activityList',
    init: {
      contextToArgs: () =>
        Tuple.make({
          id: 'activity-feed',
          rowHeightPx: 88,
          scrollContainer: VirtualList.ScrollContainer.Window(),
        }),
    },
  },
).withOutMessagePolicy({
  fold: ActivityFeedDefinition.makeOutMessageFold(ActivityListBlock, {
    ObservedContainerScroll: makeNoopStep,
    ApproachedLoadedStart: makeNoopStep,
    EndedContainerScroll: makeNoopStep,
  }),
})
const ActivityFeedComposition = ActivityFeedDefinition.makeComposition({
  bindings: [ActivityListBinding],
})
const init = ActivityFeedComposition.makeInit(
  (activities: ReadonlyArray<Activity>) => ({
    model: { activities },
  }),
)
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

const prepare = () =>
  ActivityFeedComposition.prepareBlock({ init, update, view })
export const ActivityFeedBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
