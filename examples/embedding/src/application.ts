import { Duration, Effect, Layer, Schema, Stream } from 'effect'
import { Block, Port } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

export const Model = Schema.Struct({
  count: Schema.Number,
  step: Schema.Number,
})

export const Message = defineMessageUnion({
  Ticked: {},
  ClickedAdvance: {},
  ChangedStep: { step: Schema.Number },
  CompletedReportCount: {},
})

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

export const ApplicationComposition = ApplicationDefinition.makeComposition()

// PORT

export const ports = {
  inbound: { stepChanged: Port.inbound(Schema.Number) },
  outbound: { countChanged: Port.outbound(Schema.Number) },
}

export const Flags = Schema.Struct({ initialCount: Schema.Number })

export const init = ApplicationComposition.makeInit(
  (flags: typeof Flags.Type) => ({
    model: Model.make({ count: flags.initialCount, step: 1 }),
  }),
)

export const ReportCount = ApplicationDefinition.makeCommand('ReportCount', {
  args: { count: Schema.Number },
  messages: [Message.CompletedReportCount],
  handler: function* () {
    return ({ count }) =>
      Port.emit(ports.outbound.countChanged, count).pipe(
        Effect.as(Message.CompletedReportCount()),
      )
  },
})

const advance = (model: typeof Model.Type) => {
  const count = model.count + model.step
  return {
    model: modifyFields(model, { count: () => count }),
    commands: [ReportCount({ count })],
  }
}

export const update = ApplicationComposition.makeUpdate({
  Ticked: model => advance(model),
  ClickedAdvance: model => advance(model),
  ChangedStep: ApplicationDefinition.makeFieldsStep.fromMessage(({ step }) => ({
    step: () => step,
  })),
  CompletedReportCount: ApplicationDefinition.makeNoopStep(),
})

const TICK_INTERVAL = Duration.seconds(1)

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  widgetTicks: entry('WidgetTicks', {
    messages: [Message.Ticked],
    handler: function* () {
      return () =>
        Stream.tick(TICK_INTERVAL).pipe(
          Stream.drop(1),
          Stream.map(Message.Ticked),
        )
    },
  }),
  hostStepChanges: entry('HostStepChanges', {
    messages: [Message.ChangedStep],
    handler: function* () {
      return () =>
        Port.stream(ports.inbound.stepChanged).pipe(
          Stream.map(step => Message.ChangedStep({ step })),
        )
    },
  }),
}))

export const EffectsLayer = Layer.mergeAll(
  ReportCount.layer,
  subscriptions.layer,
)

export const view = ApplicationComposition.makeView((model, h) =>
  h.div(
    [
      h.Class(
        'flex flex-col items-center gap-4 rounded-xl border border-teal-200 bg-teal-50 p-6',
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'text-xs font-semibold uppercase tracking-wide text-teal-700',
          ),
        ],
        ['Foldkit widget'],
      ),
      h.div(
        [h.Class('text-5xl font-bold tabular-nums text-gray-900')],
        [String(model.count)],
      ),
      h.div(
        [h.Class('text-sm text-gray-600')],
        [`Ticking up by ${model.step} every second`],
      ),
      Button.view(
        {
          onClick: Message.ClickedAdvance(),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  'cursor-pointer rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500',
                ),
              ],
              [`Advance by ${model.step}`],
            ),
        },
        h,
      ),
    ],
  ),
)

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    subscriptions,
    EffectsLayer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
