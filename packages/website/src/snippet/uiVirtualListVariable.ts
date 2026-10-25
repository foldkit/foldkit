// Pseudocode walkthrough for variable-height rows. Builds on the basic
// example: same Model, init, Message, and update wiring. The difference is in
// the view. Fit the excerpts into your own definitions.

// Keep the basic example's Binding initialization policy and initializer. This
// view supplies exact per-item heights instead of a single fixed height.

// Provide an `itemToRowHeightPx` callback on `view`. Each row wrapper is
// sized to the height the callback returns for that item. Slice and spacer
// math walk the items via a prefix-sum to find the visible window. Tests
// with 10k items at 60Hz scroll well within budget; larger lists may need
// a prefix-sum cache if you can profile the regression:
const view = ActivityListExampleComposition.makeView((model, h) =>
  h.block(
    ActivityListBinding.embedView({
      slotId: 'activity-list',
      model: model.activityList,
      viewInputs: {
        items: model.activities,
        itemToKey: activity => String(activity.id),
        itemToRowHeightPx: (activity, index) =>
          activity.hasSummary ? 104 : 56,
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
    }),
  ),
)

// Programmatic scrolling is sizing-mode independent. The next view resolves
// the logical index and the Command aligns the live rendered row:
// In the corresponding update handler:
ClickedScrollActivityListToMiddle: () =>
  ActivityListBinding.requestScrollToIndex(500)(model)
