import { Effect, Layer, Option, Schema, Stream } from 'effect'

import * as Block from '../../../block/public.js'
import {
  type ChildAttribute,
  type Html,
  childAttributes,
} from '../../../html/public.js'
import {
  defineInMessageUnion,
  defineMessageUnion,
} from '../../../message/public.js'
import type * as Mount from '../../../mount/public.js'

export const handlerLog: Array<string> = []
const Model = Schema.Struct({ width: Schema.Number, label: Schema.String })
type Model = typeof Model.Type
export const Message = defineMessageUnion({
  MeasuredSurface: { width: Schema.Number },
  MeasuredRenamedSurface: { width: Schema.Number },
  CompletedReportMeasurement: {},
  ReceivedPulse: {},
})
export type Message = typeof Message.Type
const InMessage = defineInMessageUnion({
  RequestedResize: { width: Schema.Number },
  RequestedRename: { label: Schema.String },
})
type InMessage = typeof InMessage.Type
const OutMessage = defineMessageUnion({
  MeasuredSpecialWidth: { width: Schema.Number },
})
type OutMessage = typeof OutMessage.Type
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
export const ObserveRenamedSurface = SurfaceNamespace.makeMountStream(
  'ObserveRenamedSurface',
  {
    args: { label: Schema.String },
    messages: [Message.MeasuredRenamedSurface],
    handler: function* () {
      handlerLog.push('built renamed Mount')
      return () => Stream.never
    },
  },
)
export const SurfaceKey = Symbol('Surface')
export const SurfaceBlock = Block.make(SurfaceNamespace, {
  key: SurfaceKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([]),
  view: {
    kind: 'Element',
    mounts: [ObserveSurface, ObserveRenamedSurface],
    Inputs: Block.makeInputContract<
      Readonly<{
        form: 'nested' | 'published'
        toView: (
          attributes: ReadonlyArray<
            ChildAttribute<
              Mount.RequirementsOf<
                typeof ObserveSurface | typeof ObserveRenamedSurface
              >
            >
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
const MeasurementResource = SurfaceBlock.makeResource<string>()(
  'MeasurementResource',
)
const managedResources = SurfaceBlock.makeManagedResources(entry => ({
  observer: entry('ManageMeasurement', Schema.Option(Schema.String), {
    resource: MeasurementResource,
    modelToMaybeRequirements: model => Option.some(model.label),
    onAcquired: () => Message.ReceivedPulse(),
    onReleased: () => Message.ReceivedPulse(),
    onAcquireError: () => Message.ReceivedPulse(),
    handler: function* () {
      handlerLog.push('built ManagedResource')
      return {
        acquire: label =>
          Effect.sync(() => {
            handlerLog.push('acquired ManagedResource')
            return label
          }),
        release: () =>
          Effect.sync(() => {
            handlerLog.push('released ManagedResource')
          }),
      }
    },
  }),
}))
const SurfaceComposition = SurfaceBlock.makeComposition({
  mounts: [ObserveSurface, ObserveRenamedSurface],
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
      MeasuredRenamedSurface: SurfaceBlock.makeFieldsStep.fromMessage(
        ({ width }) => ({ width: () => width }),
      ),
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
            ? [
                h.OnMount(
                  model.label === 'renamed'
                    ? ObserveRenamedSurface({ label: model.label })
                    : ObserveSurface({ label: model.label }),
                ),
              ]
            : []
        if (form === 'nested') {
          return h.div(
            [
              h.Id('surface'),
              h.OnClick(Message.MeasuredSurface({ width: 222 })),
              ...attributes,
            ],
            [String(model.width)],
          )
        } else {
          return toView(childAttributes(attributes))
        }
      },
    ),
    subscriptions,
    managedResources,
    EffectsLayer: Layer.mergeAll(
      ObserveSurface.layer,
      ObserveRenamedSurface.layer,
      ReportMeasurement.layer,
      subscriptions.layer,
      managedResources.layer,
    ),
  }),
)
