import { Array, Effect, Layer, Schema } from 'effect'

import * as Block from '../../../block/public.js'
import { defineMessageUnion } from '../../../message/public.js'
import * as Surface from './surface.js'

const Model = Schema.Struct({
  selectedKey: Schema.String,
  surfaces: Schema.Array(Surface.SurfaceBlock.Instance),
})
type Model = typeof Model.Type
const Message = defineMessageUnion({
  CompletedWaitForSelection: {},
  CompletedRemoveOwner: {},
  CompletedRecreateOwner: {},
  ClickedFirst: {},
  ClickedSecond: {},
  ClickedOmit: {},
  ClickedRestore: {},
  ClickedRename: {},
  ClickedRemove: {},
  ClickedRecreate: {},
  ClickedBatch: {},
})
const InMessage = defineMessageUnion({
  RequestedRemove: {},
  RequestedRecreate: {},
})
export const OutMessage = defineMessageUnion({
  MeasuredSurface: { width: Schema.Number },
})
const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('RetainedMountDelivery', {
  key: ApplicationKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  Init: Schema.Tuple([Schema.Boolean]),
  view: {
    kind: 'Element',
    Inputs: Schema.Struct({ form: Schema.Literals(['nested', 'published']) }),
  },
})
export const WaitForSelection = ApplicationBlock.makeCommand(
  'WaitForSelection',
  {
    messages: [Message.CompletedWaitForSelection],
    handler: function* () {
      Surface.handlerLog.push('built selection')
      return () => Effect.succeed(Message.CompletedWaitForSelection())
    },
  },
)
export const RemoveOwner = ApplicationBlock.makeCommand('RemoveOwner', {
  messages: [Message.CompletedRemoveOwner],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedRemoveOwner())
  },
})
export const RecreateOwner = ApplicationBlock.makeCommand('RecreateOwner', {
  messages: [Message.CompletedRecreateOwner],
  handler: function* () {
    return () => Effect.succeed(Message.CompletedRecreateOwner())
  },
})
export const SurfacesBinding = ApplicationBlock.makeBinding(
  Surface.SurfaceBlock,
  {
    field: 'surfaces',
    key: 'key',
    childField: 'model',
  },
).withOutMessagePolicy({
  forward: (_key, outMessage) =>
    ApplicationBlock.makeOutMessageForward(Surface.SurfaceBlock, {
      MeasuredSpecialWidth: ({ width }) =>
        OutMessage.MeasuredSurface({ width }),
    })(outMessage),
})
const ApplicationComposition = ApplicationBlock.makeComposition({
  bindings: [SurfacesBinding],
})
const surface = (key: string, width: number, label: string) =>
  Surface.SurfaceBlock.Instance.make({ key, model: { width, label } })
export const initialModel = Model.make({
  selectedKey: 'first',
  surfaces: [surface('first', 0, 'first'), surface('second', 600, 'second')],
})
const removeOwner = ApplicationBlock.makeFieldsStep(() => ({
  surfaces: Array.filter(
    (item: typeof Surface.SurfaceBlock.Instance.Type) => item.key !== 'first',
  ),
}))
const recreateOwner = ApplicationBlock.makeFieldsStep(() => ({
  surfaces: Array.append(surface('first', 600, 'recreated')),
}))
export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const surfaces = yield* SurfacesBinding

    return {
      children: [surfaces],
      init: ApplicationComposition.makeInit((isWaiting: boolean) => ({
        model: initialModel,
        commands: Array.filter([WaitForSelection()], () => isWaiting),
      })),
      update: ApplicationComposition.makeUpdate({
        CompletedWaitForSelection: ApplicationBlock.makeFieldsStep(() => ({
          selectedKey: () => 'second',
        })),
        CompletedRemoveOwner: removeOwner,
        CompletedRecreateOwner: recreateOwner,
        ClickedFirst: ApplicationBlock.makeFieldsStep(() => ({
          selectedKey: () => 'first',
        })),
        ClickedSecond: ApplicationBlock.makeFieldsStep(() => ({
          selectedKey: () => 'second',
        })),
        ClickedOmit: ApplicationBlock.makeStep(model =>
          SurfacesBinding.requestResize(model.selectedKey, { width: 600 }),
        ),
        ClickedRestore: ApplicationBlock.makeStep(model =>
          SurfacesBinding.requestResize(model.selectedKey, { width: 0 }),
        ),
        ClickedRename: ApplicationBlock.makeStep(model =>
          SurfacesBinding.requestRename(model.selectedKey, {
            label: 'renamed',
          }),
        ),
        ClickedRemove: removeOwner,
        ClickedRecreate: recreateOwner,
        ClickedBatch: ApplicationBlock.makeCommandsStep(() => [
          RemoveOwner(),
          RecreateOwner(),
        ]),
      }),
      inMessageUpdate: ApplicationComposition.makeInMessageUpdate({
        RequestedRemove: removeOwner,
        RequestedRecreate: recreateOwner,
      }),
      view: ApplicationComposition.makeView.withInputs((model, { form }, h) => {
        const selected = model.surfaces.find(
          item => item.key === model.selectedKey,
        )
        return h.div(
          [],
          [
            h.button(
              [h.Id('second'), h.OnClick(Message.ClickedSecond())],
              ['second'],
            ),
            h.button(
              [h.Id('first'), h.OnClick(Message.ClickedFirst())],
              ['first'],
            ),
            h.button(
              [h.Id('omit'), h.OnClick(Message.ClickedOmit())],
              ['omit'],
            ),
            h.button(
              [h.Id('restore'), h.OnClick(Message.ClickedRestore())],
              ['restore'],
            ),
            h.button(
              [h.Id('rename'), h.OnClick(Message.ClickedRename())],
              ['rename'],
            ),
            h.button(
              [h.Id('remove'), h.OnClick(Message.ClickedRemove())],
              ['remove'],
            ),
            h.button(
              [h.Id('recreate'), h.OnClick(Message.ClickedRecreate())],
              ['recreate'],
            ),
            h.button(
              [h.Id('batch'), h.OnClick(Message.ClickedBatch())],
              ['batch'],
            ),
            h.span(
              [h.Id('summary')],
              [
                model.surfaces
                  .map(
                    item =>
                      `${item.key}:${item.model.width}:${item.model.label}`,
                  )
                  .join(','),
              ],
            ),
            selected === undefined
              ? h.span([], ['absent'])
              : h.block(
                  SurfacesBinding.embedView({
                    key: selected.key,
                    slotId: 'selected-surface',
                    model: selected.model,
                    viewInputs: {
                      form,
                      toView: attributes =>
                        h.div([h.Id('surface'), ...attributes]),
                    },
                  }),
                ),
          ],
        )
      }),
      EffectsLayer: Layer.mergeAll(
        WaitForSelection.layer,
        RemoveOwner.layer,
        RecreateOwner.layer,
      ),
    }
  }),
).pipe(Layer.provide(Surface.layer))
export const completedSelection = Message.CompletedWaitForSelection()
export const completedRemove = Message.CompletedRemoveOwner()
export const completedRecreate = Message.CompletedRecreateOwner()
