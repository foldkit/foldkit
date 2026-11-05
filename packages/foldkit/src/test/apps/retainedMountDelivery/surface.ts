import { Effect, Layer, Schema, Stream } from 'effect'

import * as Block from '../../../block/public.js'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
} from '../../../html/public.js'
import { defineMessageUnion } from '../../../message/public.js'
import type * as Mount from '../../../mount/public.js'

export const handlerLog: Array<string> = []
const Model = Schema.Struct({ width: Schema.Number, label: Schema.String })
type Model = typeof Model.Type
export const Message = defineMessageUnion({
  MeasuredSurface: { width: Schema.Number },
  CompletedReportMeasurement: {},
  ReceivedPulse: {},
})
const InMessage = defineMessageUnion({
  RequestedResize: { width: Schema.Number },
  RequestedRename: { label: Schema.String },
})
const OutMessage = defineMessageUnion({
  MeasuredSpecialWidth: { width: Schema.Number },
})
const SurfaceNamespace = Block.makeNamespace('RetainedSurface')
export const ObserveSurface = SurfaceNamespace.makeMountStream(
  'ObserveSurface',
  {
    args: { label: Schema.String },
    messages: [Message.MeasuredSurface],
    handler: function* () {
      handlerLog.push('built Mount')
      return ({ element }) =>
        Stream.callback(() =>
          Effect.sync(() => {
            handlerLog.push(element.tagName)
          }),
        )
    },
  },
)
const SurfaceKey = Symbol('Surface')
export const SurfaceBlock = Block.make(SurfaceNamespace, {
  key: SurfaceKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  Init: Schema.Tuple([]),
  view: {
    kind: 'Element',
    mounts: [ObserveSurface],
    Inputs: Block.makeInputContract<
      Readonly<{
        form: 'nested' | 'published'
        toView: (
          attributes: ReadonlyArray<
            ChildAttribute<Mount.RequirementsOf<typeof ObserveSurface>>
          >,
        ) => Html
      }>
    >(),
  },
})
export const ReportMeasurement = SurfaceBlock.makeCommand('ReportMeasurement', {
  messages: [Message.CompletedReportMeasurement],
  handler: function* () {
    handlerLog.push('built Command')
    return () => Effect.succeed(Message.CompletedReportMeasurement())
  },
})
const subscriptions = SurfaceBlock.makeSubscriptions(entry => ({
  pulses: entry(
    'Pulses',
    {},
    {
      messages: [Message.ReceivedPulse],
      modelToDependencies: () => ({}),
      handler: function* () {
        handlerLog.push('built Subscription')
        return () =>
          Stream.callback<never>(() =>
            Effect.acquireRelease(
              Effect.sync(() => {
                handlerLog.push('started Subscription')
              }),
              () =>
                Effect.sync(() => {
                  handlerLog.push('stopped Subscription')
                }),
            ),
          )
      },
    },
  ),
}))
const SurfaceComposition = SurfaceBlock.makeComposition({
  mounts: [ObserveSurface],
})
export const layer = SurfaceBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: SurfaceComposition.makeInit(() => ({
      model: Model.make({ width: 0, label: 'initial' }),
    })),
    update: SurfaceComposition.makeUpdate({
      MeasuredSurface: SurfaceBlock.makeStep((model, { width }) => {
        const nextModel = Model.make({ width, label: model.label })
        if (width === 777) {
          return {
            model: nextModel,
            commands: [ReportMeasurement()],
            outMessage: OutMessage.MeasuredSpecialWidth({ width }),
          }
        } else {
          return { model: nextModel }
        }
      }),
      CompletedReportMeasurement: SurfaceBlock.makeNoopStep(),
      ReceivedPulse: SurfaceBlock.makeNoopStep(),
    }),
    inMessageUpdate: SurfaceComposition.makeInMessageUpdate({
      RequestedResize: SurfaceBlock.makeFieldsStep.fromMessage(({ width }) => ({
        width: () => width,
      })),
      RequestedRename: SurfaceBlock.makeFieldsStep.fromMessage(({ label }) => ({
        label: () => label,
      })),
    }),
    view: SurfaceComposition.makeView.withInputs(
      (model, { form, toView }, h) => {
        const attributes =
          model.width < 500
            ? [h.OnMount(ObserveSurface({ label: model.label }))]
            : []
        if (form === 'nested') {
          return h.div([h.Id('surface'), ...attributes], [String(model.width)])
        } else {
          return toView(childAttributes(attributes))
        }
      },
    ),
    subscriptions,
    EffectsLayer: Layer.mergeAll(
      ObserveSurface.layer,
      ReportMeasurement.layer,
      subscriptions.layer,
    ),
  }),
)
