import { Array, Effect, Layer, Schema } from 'effect'

import * as Block from '../../../block/public.js'
import { type Html, createLazy } from '../../../html/public.js'
import {
  defineInMessageUnion,
  defineMessageUnion,
} from '../../../message/public.js'
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
  CompletedRemoveMountedOwner: {},
  CompletedRecreateMountedOwner: {},
  ClickedFirst: {},
  ClickedSecond: {},
  ClickedOmit: {},
  ClickedRestore: {},
  ClickedRename: {},
  ClickedRemove: {},
  ClickedRecreate: {},
  ClickedBatch: {},
})
type Message = typeof Message.Type
const InMessage = defineInMessageUnion({
  RequestedRemove: {},
  RequestedRecreate: {},
})
type InMessage = typeof InMessage.Type
export const OutMessage = defineMessageUnion({
  MeasuredSurface: { width: Schema.Number },
})
export type OutMessage = typeof OutMessage.Type
export const ApplicationKey = Symbol('Application')
export const ApplicationBlock = Block.make('RetainedMountDelivery', {
  key: ApplicationKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([Schema.Boolean]),
  view: {
    kind: 'Element',
    Inputs: Schema.Struct({
      form: Schema.Literals(['nested', 'published']),
      mode: Schema.optional(
        Schema.Literals(['Lazy', 'Cached', 'Duplicate', 'RetireDuringMounts']),
      ),
    }),
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
export const RemoveMountedOwner = ApplicationBlock.makeMount(
  'RemoveMountedOwner',
  {
    messages: [Message.CompletedRemoveMountedOwner],
    handler: function* () {
      return () => Effect.succeed(Message.CompletedRemoveMountedOwner())
    },
  },
)
export const RecreateMountedOwner = ApplicationBlock.makeMount(
  'RecreateMountedOwner',
  {
    messages: [Message.CompletedRecreateMountedOwner],
    handler: function* () {
      return () => Effect.succeed(Message.CompletedRecreateMountedOwner())
    },
  },
)
export const SurfacesBinding = ApplicationBlock.makeKeyedArrayBinding(
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
  mounts: [RemoveMountedOwner, RecreateMountedOwner],
})
type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
type SurfaceInstance = typeof Surface.SurfaceBlock.Instance.Type
const renderSurface = (
  selected: SurfaceInstance,
  form: 'nested' | 'published',
  h: ApplicationViewBuilder,
): Html =>
  h.block(
    SurfacesBinding.embedView({
      key: selected.key,
      slotId: 'selected-surface',
      model: selected.model,
      viewInputs: {
        form,
        toView: attributes => h.div([h.Id('surface'), ...attributes]),
      },
    }),
  )
const lazySurface = createLazy()
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
    let cachedSurface:
      | Readonly<{ selected: SurfaceInstance; html: Html }>
      | undefined

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
        CompletedRemoveMountedOwner: removeOwner,
        CompletedRecreateMountedOwner: recreateOwner,
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
      view: ApplicationComposition.makeView.withInputs(
        (model, { form, mode }, h) => {
          const selected = model.surfaces.find(
            item => item.key === model.selectedKey,
          )
          let selectedView: Html
          if (selected === undefined) {
            selectedView = h.span([], ['absent'])
          } else if (mode === 'Lazy') {
            selectedView = lazySurface(renderSurface, [selected, form, h])
          } else if (mode === 'Cached') {
            if (cachedSurface?.selected !== selected) {
              cachedSurface = {
                selected,
                html: renderSurface(selected, form, h),
              }
            }
            selectedView = cachedSurface.html
          } else {
            selectedView = renderSurface(selected, form, h)
          }
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
              h.div(
                [h.OnClick(Message.ClickedRestore())],
                [
                  h.div(
                    [h.OnClick(Message.ClickedRecreate())],
                    [
                      h.button(
                        [
                          h.Id('replace-marked-in-one-click'),
                          h.OnClick(Message.ClickedRemove()),
                        ],
                        ['replace marked'],
                      ),
                    ],
                  ),
                ],
              ),
              selectedView,
              ...(mode === 'Duplicate' && selected !== undefined
                ? [renderSurface(selected, form, h)]
                : []),
              ...(mode === 'RetireDuringMounts'
                ? [
                    h.div([h.OnMount(RemoveMountedOwner())]),
                    h.div([h.OnMount(RecreateMountedOwner())]),
                  ]
                : []),
              h.div(
                [h.OnClick(Message.ClickedRecreate())],
                [
                  h.button(
                    [
                      h.Id('replace-in-one-click'),
                      h.OnClick(Message.ClickedRemove()),
                    ],
                    ['replace'],
                  ),
                ],
              ),
            ],
          )
        },
      ),
      EffectsLayer: Layer.mergeAll(
        WaitForSelection.layer,
        RemoveOwner.layer,
        RecreateOwner.layer,
        RemoveMountedOwner.layer,
        RecreateMountedOwner.layer,
      ),
    }
  }),
).pipe(Layer.provide(Surface.layer))
export const completedSelection = Message.CompletedWaitForSelection()
export const completedRemove = Message.CompletedRemoveOwner()
export const completedRecreate = Message.CompletedRecreateOwner()
