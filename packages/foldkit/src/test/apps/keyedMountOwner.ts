import { Array, Effect, Layer, Option, Schema, Stream } from 'effect'

import * as Block from '../../block/public.js'
import { defineMessageUnion } from '../../message/public.js'

const MOUNT_ATTRIBUTE_WIDTH_LIMIT = 500

const SurfaceModel = Schema.Struct({
  width: Schema.Number,
  isStreaming: Schema.Boolean,
})
type SurfaceModel = typeof SurfaceModel.Type
export const SurfaceMessage = defineMessageUnion({
  MeasuredSurface: { width: Schema.Number },
})
type SurfaceMessage = typeof SurfaceMessage.Type
const SurfaceKey = Symbol('SelectedSurface')
const SurfaceBlock = Block.make('SelectedSurface', {
  key: SurfaceKey,
  Model: SurfaceModel,
  Message: SurfaceMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
export const ObserveSurface = SurfaceBlock.makeMountStream('ObserveSurface', {
  messages: [SurfaceMessage.MeasuredSurface],
  handler: function* () {
    return () => Stream.never
  },
})
export const MeasureSurface = SurfaceBlock.makeMount('MeasureSurface', {
  messages: [SurfaceMessage.MeasuredSurface],
  handler: function* () {
    return () => Effect.succeed(SurfaceMessage.MeasuredSurface({ width: 100 }))
  },
})
const SurfaceComposition = SurfaceBlock.makeComposition({
  mounts: [ObserveSurface, MeasureSurface],
})
const surfaceLayer = SurfaceBlock.makeLayer(
  Effect.succeed({
    children: [],
    init: SurfaceComposition.makeInit(() => ({
      model: SurfaceModel.make({ width: 0, isStreaming: true }),
    })),
    update: SurfaceComposition.makeUpdate({
      MeasuredSurface: SurfaceBlock.makeFieldsStep.fromMessage(({ width }) => ({
        width: () => width,
      })),
    }),
    view: SurfaceComposition.makeView((model, h) => {
      const mountAttribute = model.isStreaming
        ? h.OnMount(ObserveSurface())
        : h.OnMount(MeasureSurface())

      return h.div(
        model.width < MOUNT_ATTRIBUTE_WIDTH_LIMIT ? [mountAttribute] : [],
        [`width ${model.width}`],
      )
    }),
    EffectsLayer: Layer.merge(ObserveSurface.layer, MeasureSurface.layer),
  }),
)
const ParentModel = Schema.Struct({
  selectedKey: Schema.String,
  surfaces: Schema.Array(SurfaceBlock.Instance),
})
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({ ClickedSecond: {} })
type ParentMessage = typeof ParentMessage.Type
const ParentKey = Symbol('SurfaceSelection')
export const ParentBlock = Block.make('SurfaceSelection', {
  key: ParentKey,
  Model: ParentModel,
  Message: ParentMessage,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
})
const SurfacesBinding = ParentBlock.makeKeyedArrayBinding(SurfaceBlock, {
  field: 'surfaces',
  key: 'key',
  childField: 'model',
})
const ParentComposition = ParentBlock.makeComposition({
  bindings: [SurfacesBinding],
})
export const initialModel = (isStreaming: boolean) =>
  ParentModel.make({
    selectedKey: 'first',
    surfaces: Array.map(['first', 'second'], key =>
      SurfaceBlock.Instance.make({
        key,
        model: SurfaceModel.make({ width: 0, isStreaming }),
      }),
    ),
  })
export const layer = ParentBlock.makeLayer(
  Effect.gen(function* () {
    const surfaces = yield* SurfacesBinding

    return {
      children: [surfaces],
      init: ParentComposition.makeInit(() => ({ model: initialModel(true) })),
      update: ParentComposition.makeUpdate({
        ClickedSecond: ParentBlock.makeFieldsStep(() => ({
          selectedKey: () => 'second',
        })),
      }),
      view: ParentComposition.makeView((model, h) => {
        const selected = Option.getOrThrow(
          Array.findFirst(
            model.surfaces,
            surface => surface.key === model.selectedKey,
          ),
        )

        return h.div(
          [],
          [
            h.button([h.OnClick(ParentMessage.ClickedSecond())], ['second']),
            h.span(
              [],
              [
                Array.map(
                  model.surfaces,
                  surface => `${surface.key}:${surface.model.width}`,
                ).join(','),
              ],
            ),
            h.block(
              SurfacesBinding.embedView({
                key: selected.key,
                slotId: 'selected-surface',
                model: selected.model,
              }),
            ),
          ],
        )
      }),
    }
  }),
).pipe(Layer.provide(surfaceLayer))
