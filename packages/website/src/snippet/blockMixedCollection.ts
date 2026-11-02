import { Array, Number, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Counter } from './blockCounterChild'
import { Stopwatch } from './blockStopwatchChild'

const Widget = Schema.Union([Counter, Stopwatch])
type Widget = typeof Widget.Type

const Model = Schema.Struct({
  widgets: Schema.Array(Widget),
  nextWidgetId: Schema.Number,
  completedGoalCount: Schema.Number,
})
type Model = typeof Model.Type

export class Dashboard extends Block<Dashboard>()('Dashboard', {
  Model,
  Message: defineMessageUnion({
    ClickedAddCounter: {},
    ClickedAddStopwatch: {},
    ClickedRemoveWidget: { id: Schema.String },
  }),
}) {}

const addWidget = (model: Model, widget: Widget): Model =>
  modifyFields(model, {
    widgets: Array.append(widget),
    nextWidgetId: Number.increment,
  })

export const DashboardLive = Dashboard.toLayer(() => ({
  init: () => ({ widgets: [], nextWidgetId: 0, completedGoalCount: 0 }),

  update: {
    ClickedAddCounter: model => ({
      model: addWidget(
        model,
        new Counter(`widget-${model.nextWidgetId}`, { max: 10 }),
      ),
    }),
    ClickedAddStopwatch: model => ({
      model: addWidget(
        model,
        new Stopwatch(`widget-${model.nextWidgetId}`, { label: 'Focus' }),
      ),
    }),
    ClickedRemoveWidget: (model, { id }) => ({
      model: modifyFields(model, {
        widgets: Array.filter(widget => widget.id !== id),
      }),
    }),

    ...Counter.on({
      ReachedMax: model => ({
        model: modifyFields(model, {
          completedGoalCount: Number.increment,
        }),
      }),
    }),
  },

  view: (model, h) =>
    h.div(
      [],
      [
        h.p([], [`Goals reached: ${model.completedGoalCount}`]),
        ...Array.map(model.widgets, widget =>
          h.keyed('div')(
            widget.id,
            [],
            [
              widget.view(),
              h.button(
                [
                  h.OnClick(
                    Dashboard.Message.ClickedRemoveWidget({
                      id: widget.id,
                    }),
                  ),
                ],
                ['Remove'],
              ),
            ],
          ),
        ),
        h.button(
          [h.OnClick(Dashboard.Message.ClickedAddCounter())],
          ['Add counter'],
        ),
        h.button(
          [h.OnClick(Dashboard.Message.ClickedAddStopwatch())],
          ['Add stopwatch'],
        ),
      ],
    ),
}))
