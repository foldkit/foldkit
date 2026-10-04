// Pseudocode walkthrough for variable-height rows. Builds on the basic
// example: same Model, init, Message, and update wiring. The difference is in
// the view. Fit the excerpts into your own definitions.
import { Option } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import { VirtualList } from '@foldkit/ui'

// Model and init are unchanged from the basic example. Pass any
// `rowHeightPx` to `init`; fixed and known-variable views still use their
// respective exact heights:
const init = () => ({
  model: {
    activityList: VirtualList.init({
      id: 'activity-list',
      rowHeightPx: 56,
    }),
    // ...your other fields
  },
})

// Provide an `itemToRowHeightPx` callback on `view`. Each row wrapper is
// sized to the height the callback returns for that item. Slice and spacer
// math walk the items via a prefix-sum to find the visible window. Tests
// with 10k items at 60Hz scroll well within budget; larger lists may need
// a prefix-sum cache if you can profile the regression:
const view = (h: HtmlBuilder<Message>) =>
  h.submodel({
    slotId: 'activity-list',
    model: model.activityList,
    view: VirtualList.view<Activity>(),
    viewInputs: {
      items: model.activities,
      itemToKey: activity => String(activity.id),
      itemToRowHeightPx: (activity, index) => (activity.hasSummary ? 104 : 56),
      itemToView: activity =>
        activity.hasSummary
          ? h.div(
              [
                h.Class(
                  'grid grid-cols-[2rem_1fr_5rem] items-start gap-3 px-4 py-3',
                ),
              ],
              [
                h.div([h.Class('h-7 w-7 rounded-full')], [activity.initial]),
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
                h.div([h.Class('h-7 w-7 rounded-full')], [activity.initial]),
                h.span([], [activity.label]),
                h.span([h.Class('text-right text-xs')], [activity.timeAgo]),
              ],
            ),
      containerClassName:
        'h-96 w-full rounded-lg bg-white ring-1 ring-gray-200',
    },
    toParentMessage: message => GotActivityListMessage({ message }),
  })

// Programmatic scrolling is sizing-mode independent. The next view resolves
// the logical index and the Command aligns the live rendered row:
const foldActivityListScrollToIndex = Update.foldChild({
  update: VirtualList.scrollToIndex,
  read: (model: Model) => Option.some(model.activityList),
  write: (model, nextActivityList) =>
    modifyFields(model, { activityList: () => nextActivityList }),
  toParentMessage: message => Message.GotActivityListMessage({ message }),
})

// In the corresponding Message.match handler:
ClickedScrollActivityListToMiddle: () =>
  foldActivityListScrollToIndex(model, 500)
