import {
  Context,
  Crypto,
  Effect,
  Layer,
  Match,
  Number,
  Option,
  Schema,
} from 'effect'
import { Block } from 'foldkit'
import { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

interface ComputeEngine {
  readonly engineId: string
  readonly square: (value: number) => number
}

class ComputeEngineService extends Context.Service<
  ComputeEngineService,
  ComputeEngine
>()('ComputeEngineService') {}

const ComputeEngineLayer: Layer.Layer<
  ComputeEngineService,
  never,
  Crypto.Crypto
> = Layer.effect(
  ComputeEngineService,
  Effect.acquireRelease(
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto
      const id = yield* Effect.orDie(crypto.randomUUIDv4)
      const engineId = `engine-${id.slice(0, 8)}`
      return { engineId, square: value => value * value }
    }),
    ({ engineId }) => Effect.log(`Tore down ${engineId}`),
  ),
)

export const EngineState = defineTaggedUnion({
  Off: {},
  Booting: {},
  Ready: { engineId: Schema.String },
  Failed: { reason: Schema.String },
})

export const Model = Schema.Struct({
  engine: EngineState,
  computeCount: Schema.Number,
  maybeSquareResult: Schema.Option(Schema.Number),
})

export const Message = defineMessageUnion({
  ClickedStartEngine: {},
  ClickedStopEngine: {},
  StartedEngine: { engineId: Schema.String },
  StoppedEngine: {},
  FailedStartEngine: { reason: Schema.String },
  ClickedCompute: {},
  SucceededCompute: { result: Schema.Number },
  FailedCompute: {},
})

export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message,
})

const { makeFieldsStep, makeNoopStep } = ApplicationDefinition

export const ApplicationComposition = ApplicationDefinition.makeComposition()
type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>

const Engine =
  ApplicationDefinition.makeResource<ComputeEngine>()('ComputeEngine')

export const Compute = ApplicationDefinition.makeCommand('Compute', {
  args: { value: Schema.Number },
  messages: [Message.SucceededCompute, Message.FailedCompute],
  handler: function* () {
    return ({ value }) =>
      Effect.gen(function* () {
        const engine = yield* Engine.get

        return Message.SucceededCompute({ result: engine.square(value) })
      }).pipe(
        Effect.catchTag('ResourceNotAvailable', () =>
          Effect.succeed(Message.FailedCompute()),
        ),
      )
  },
})

export const update = ApplicationComposition.makeUpdate({
  ClickedStartEngine: makeFieldsStep(() => ({
    engine: () => EngineState.Booting(),
  })),

  ClickedStopEngine: makeFieldsStep(() => ({
    engine: () => EngineState.Off(),
  })),

  StartedEngine: makeFieldsStep.fromMessage(({ engineId }) => ({
    engine: () => EngineState.Ready({ engineId }),
  })),

  StoppedEngine: makeNoopStep(),

  FailedStartEngine: makeFieldsStep.fromMessage(({ reason }) => ({
    engine: () => EngineState.Failed({ reason }),
  })),

  ClickedCompute: model => {
    const nextComputeCount = Number.increment(model.computeCount)
    return {
      model: modifyFields(model, { computeCount: () => nextComputeCount }),
      commands: [Compute({ value: nextComputeCount })],
    }
  },

  SucceededCompute: makeFieldsStep.fromMessage(({ result }) => ({
    maybeSquareResult: () => Option.some(result),
  })),

  FailedCompute: makeNoopStep(),
})

export const init = ApplicationComposition.makeInit(() => ({
  model: {
    engine: EngineState.Off(),
    computeCount: 0,
    maybeSquareResult: Option.none(),
  },
}))

// MANAGED RESOURCE

export const managedResources = ApplicationDefinition.makeManagedResources(
  entry => ({
    engine: entry('ManageEngine', Schema.Option(Schema.Null), {
      resource: Engine,
      modelToMaybeRequirements: model =>
        Match.value(model.engine).pipe(
          Match.tag('Booting', 'Ready', () => Option.some(null)),
          Match.tag('Off', 'Failed', () => Option.none()),
          Match.exhaustive,
        ),
      onAcquired: ({ engineId }) => Message.StartedEngine({ engineId }),
      onReleased: () => Message.StoppedEngine(),
      onAcquireError: error =>
        Message.FailedStartEngine({ reason: String(error) }),
      handler: function* () {
        return {
          acquire: () =>
            Layer.build(ComputeEngineLayer).pipe(
              Effect.map(context => Context.get(context, ComputeEngineService)),
            ),
          release: () => Effect.void,
        }
      },
    }),
  }),
)

export const EffectsLayer = Layer.mergeAll(
  Compute.layer,
  managedResources.layer,
)

const buttonClassName =
  'px-6 py-3 font-semibold text-white transition-colors data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed'

const primaryButton = (
  label: string,
  message: typeof Message.Type,
  colorClassName: string,
  isDisabled: boolean,
  h: ApplicationViewBuilder,
): Html =>
  Button.view(
    {
      onClick: message,
      isDisabled,
      toView: attributes =>
        h.button(
          [
            ...attributes.button,
            h.Class(`${buttonClassName} ${colorClassName}`),
          ],
          [label],
        ),
    },
    h,
  )

const engineStatusView = (
  engine: typeof EngineState.Type,
  h: ApplicationViewBuilder,
): Html => {
  const status = EngineState.match(engine, {
    Off: () => ({
      colorClassName: 'text-gray-500',
      text: 'Engine is off.',
    }),
    Booting: () => ({
      colorClassName: 'text-amber-600',
      text: 'Booting engine...',
    }),
    Ready: ({ engineId }) => ({
      colorClassName: 'text-green-600',
      text: `Engine ready: ${engineId}`,
    }),
    Failed: ({ reason }) => ({
      colorClassName: 'text-red-600',
      text: `Engine failed: ${reason}`,
    }),
  })

  return h.p([h.Class(status.colorClassName)], [status.text])
}

const engineControlsView = (
  engine: typeof EngineState.Type,
  h: ApplicationViewBuilder,
): Html => {
  const controls = Match.value(engine).pipe(
    Match.tag('Booting', 'Ready', () => ({
      label: 'Stop engine',
      message: Message.ClickedStopEngine(),
      colorClassName: 'bg-red-500 hover:bg-red-600',
    })),
    Match.tag('Off', 'Failed', () => ({
      label: 'Start engine',
      message: Message.ClickedStartEngine(),
      colorClassName: 'bg-green-500 hover:bg-green-600',
    })),
    Match.exhaustive,
  )

  return h.div(
    [h.Class('flex gap-3')],
    [
      primaryButton(
        controls.label,
        controls.message,
        controls.colorClassName,
        false,
        h,
      ),
    ],
  )
}

const squareResultView = (
  maybeSquareResult: Option.Option<number>,
  h: ApplicationViewBuilder,
): Html => {
  const text = Option.match(maybeSquareResult, {
    onNone: () => 'No result yet.',
    onSome: value => `Square result: ${value}`,
  })

  return h.div([h.Class('text-gray-800')], [text])
}

const isEngineReady = (engine: typeof EngineState.Type): boolean =>
  engine._tag === 'Ready'

export const view = ApplicationComposition.makeView((model, h) => {
  const isComputeDisabled = !isEngineReady(model.engine)

  return {
    title: 'Managed Resource Layer',
    body: h.div(
      [h.Class('min-h-screen bg-gray-100 flex items-center justify-center')],
      [
        h.div(
          [h.Class('bg-white p-8 rounded-lg shadow flex flex-col gap-5 w-96')],
          [
            h.h1(
              [h.Class('text-xl font-bold text-gray-900')],
              ['Layer-backed Managed Resource'],
            ),
            engineStatusView(model.engine, h),
            engineControlsView(model.engine, h),
            primaryButton(
              'Compute next square',
              Message.ClickedCompute(),
              'bg-blue-500 hover:bg-blue-600 data-[disabled]:hover:bg-blue-500',
              isComputeDisabled,
              h,
            ),
            squareResultView(model.maybeSquareResult, h),
          ],
        ),
      ],
    ),
  }
})

const prepare = () =>
  ApplicationComposition.prepareBlock({
    init,
    update,
    view,
    managedResources,
    EffectsLayer,
  })
export const ApplicationBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
