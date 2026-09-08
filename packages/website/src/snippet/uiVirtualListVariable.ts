// Pseudocode walkthrough for variable-height rows. Builds on the basic
// example: same Model, init, Message, update, subscription wiring. The
// difference is in the view and in how `scrollToIndexVariable` is folded. Fit the
// excerpts into your own definitions.
import { Option } from 'effect'
import { Update } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { evo } from 'foldkit/struct'

import { VirtualList } from '@foldkit/ui'

// Model and init are unchanged from the basic example. Pass any
// `rowHeightPx` to `init`; it remains the uniform default for the
// `scrollToIndex` initial-apply path on the first measurement, and the
// fallback for any item the variable callback doesn't cover:
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

// Programmatic scrolling for variable-height lists uses
// `scrollToIndexVariable`, which walks the heights to compute the target
// `scrollTop`. Pass the same `items` and `itemToRowHeightPx` you pass to
// `view` so the math agrees:
const itemToRowHeightPx = (activity, index) => (activity.hasSummary ? 104 : 56)

const foldActivityListScrollToIndexVariable = Update.foldChild({
  update: (
    activityList: VirtualList.Model,
    input: Readonly<{ activities: ReadonlyArray<Activity>; index: number }>,
  ) =>
    VirtualList.scrollToIndexVariable(
      activityList,
      input.activities,
      itemToRowHeightPx,
      input.index,
    ),
  read: (model: Model) => Option.some(model.activityList),
  write: (model, nextActivityList) =>
    evo(model, { activityList: () => nextActivityList }),
  toParentMessage: message => Message.GotActivityListMessage({ message }),
})

// In the corresponding Message.match handler:
ClickedScrollActivityListToMiddle: () =>
  foldActivityListScrollToIndexVariable(model, {
    activities: model.activities,
    index: 500,
  })

// `scrollToIndex` (uniform) and `scrollToIndexVariable` (variable) are
// independent: pick the one that matches how `view` is rendering. Mixing
// them produces inconsistent scroll targets.
