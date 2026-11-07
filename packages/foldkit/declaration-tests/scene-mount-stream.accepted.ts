import { Effect, Schema, Stream } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'

export const Model = Schema.Struct({ width: Schema.Number })
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  MeasuredSurface: { width: Schema.Number },
  CompletedFocusSurface: {},
})
export type Message = typeof Message.Type

const Namespace = Block.makeNamespace('SceneMountStreamFixture')
export const ObserveSurface = Namespace.makeMountStream('ObserveSurface', {
  args: { id: Schema.String },
  messages: [Message.MeasuredSurface],
  handler: function* () {
    return () => Stream.never
  },
})
export const ObserveHostSurface = Namespace.makeMountStream(
  'ObserveHostSurface',
  {
    messages: [Message.MeasuredSurface],
  },
)
export const FocusSurface = Namespace.makeMount('FocusSurface', {
  messages: [Message.CompletedFocusSurface],
})
export const SurfaceKey = Symbol('SceneMountStreamFixture')
const Definition = Namespace.makeDefinition({
  key: SurfaceKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element', mounts: [ObserveSurface] },
})
const Composition = Definition.makeComposition({ mounts: [ObserveSurface] })
const init = Composition.makeInit(() => ({ model: Model.make({ width: 0 }) }))
const update = Composition.makeUpdate({
  MeasuredSurface: Definition.makeFieldsStep.fromMessage(({ width }) => ({
    width: () => width,
  })),
  CompletedFocusSurface: Definition.makeNoopStep(),
})
const view = Composition.makeView((model, h) =>
  h.div(
    [h.OnMount(ObserveSurface({ id: 'canvas' }))],
    [`width ${model.width}`],
  ),
)
export const SurfaceBlock = Definition.makeBlock(
  Effect.succeed({
    children: [],
    init,
    update,
    view,
    EffectsLayer: ObserveSurface.layer,
  }),
)

export const emitDefinition = Scene.Mount.emit(
  ObserveSurface,
  Message.MeasuredSurface({ width: 240 }),
)
export const emitInstance = Scene.Mount.emit(
  ObserveSurface({ id: 'canvas' }),
  Message.MeasuredSurface({ width: 320 }),
)
export const emitHostDefinition = Scene.Mount.emit(
  ObserveHostSurface,
  Message.MeasuredSurface({ width: 240 }),
)
export const runSurfaceScene = () =>
  Scene.scene(
    SurfaceBlock,
    Scene.init(),
    Scene.Mount.resolve(
      ObserveSurface({ id: 'canvas' }),
      Message.MeasuredSurface({ width: 100 }),
    ),
    emitDefinition,
    emitInstance,
    Scene.expect(Scene.text('width 320')).toExist(),
  )
