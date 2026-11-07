import { Effect, Schema, Stream, Tuple } from 'effect'
import { expect, test } from 'vitest'

import { it } from '@effect/vitest'

import { makeNamespace } from '../block/public.js'
import { defineView } from '../html/block.js'
import {
  type HtmlBuilder,
  __htmlBuilder as attributeHtml,
} from '../html/index.js'
import { defineMessageUnion } from '../message/public.js'
import * as Mount from '../mount/public.js'
import * as PublicScene from '../scene/public.js'
import { modifyFields } from '../struct/public.js'
import * as Scene from './scene.js'

const Model = Schema.Struct({ width: Schema.Number })
type Model = typeof Model.Type

const Message = defineMessageUnion({
  MeasuredSurface: { width: Schema.Number },
})
type Message = typeof Message.Type

const Surface = makeNamespace('SceneStreamingSurface')
const ObserveSurface = Surface.makeMountStream('ObserveSurface', {
  messages: [Message.MeasuredSurface],
  handler: function* () {
    return () => Stream.never
  },
})

const update = (model: Model, message: Message) => ({
  model: modifyFields(model, { width: () => message.width }),
})

const view = (
  model: Model,
  h: HtmlBuilder<Message, Mount.RequirementsOf<typeof ObserveSurface>>,
) => h.div([h.OnMount(ObserveSurface())], [`width ${model.width}`])

test('delivers later stream Messages while the same Mount stays active', () => {
  Scene.scene(
    { update, view },
    Scene.given(Model.make({ width: 0 })),
    Scene.Mount.resolve(
      ObserveSurface,
      Message.MeasuredSurface({ width: 100 }),
    ),
    Scene.Mount.emit(ObserveSurface, Message.MeasuredSurface({ width: 240 })),
    Scene.Mount.emit(ObserveSurface, Message.MeasuredSurface({ width: 320 })),
    Scene.Mount.expectNone(),
    Scene.expect(Scene.text('width 320')).toExist(),
  )
})

test('keeps resolve one-shot and blocks emissions before the initial result', () => {
  expect(() =>
    Scene.scene(
      { update, view },
      Scene.given(Model.make({ width: 0 })),
      Scene.Mount.resolve(
        ObserveSurface,
        Message.MeasuredSurface({ width: 100 }),
      ),
      Scene.Mount.resolve(
        ObserveSurface,
        Message.MeasuredSurface({ width: 240 }),
      ),
    ),
  ).toThrow(/wasn't in the pending Mounts/)

  expect(() =>
    Scene.scene(
      { update, view },
      Scene.given(Model.make({ width: 0 })),
      Scene.Mount.emit(ObserveSurface, Message.MeasuredSurface({ width: 240 })),
    ),
  ).toThrow(/unresolved Mounts/)
})

test('rejects emissions after the element was removed', () => {
  const removableView = (
    model: Model,
    h: HtmlBuilder<Message, Mount.RequirementsOf<typeof ObserveSurface>>,
  ) =>
    h.div(
      [],
      model.width >= 0
        ? [h.section([h.OnMount(ObserveSurface())], [`width ${model.width}`])]
        : [],
    )

  expect(() =>
    Scene.scene(
      { update, view: removableView },
      Scene.given(Model.make({ width: 0 })),
      Scene.Mount.resolve(
        ObserveSurface,
        Message.MeasuredSurface({ width: 100 }),
      ),
      Scene.Mount.emit(ObserveSurface, Message.MeasuredSurface({ width: -1 })),
      Scene.Mount.expectEnded(ObserveSurface),
      Scene.Mount.emit(ObserveSurface, Message.MeasuredSurface({ width: 240 })),
    ),
  ).toThrow(/selected no resolved active Mount/)
})

test('selects the originating stream and validates its declared raw Message', () => {
  const ForeignObserveSurface = Mount.defineStream(ObserveSurface.name, {
    messages: [Message.MeasuredSurface],
  })

  expect(() =>
    Scene.scene(
      { update, view },
      Scene.given(Model.make({ width: 0 })),
      Scene.Mount.resolve(
        ObserveSurface,
        Message.MeasuredSurface({ width: 100 }),
      ),
      Scene.Mount.emit(
        ForeignObserveSurface,
        Message.MeasuredSurface({ width: 240 }),
      ),
    ),
  ).toThrow(/selected no resolved active Mount/)

  const invalidEmission = Reflect.apply(Scene.Mount.emit, undefined, [
    ObserveSurface,
    { _tag: 'MeasuredSurface', width: 'wide' },
  ])

  expect(() =>
    Scene.scene(
      { update, view },
      Scene.given(Model.make({ width: 0 })),
      Scene.Mount.resolve(
        ObserveSurface,
        Message.MeasuredSurface({ width: 100 }),
      ),
      invalidEmission,
    ),
  ).toThrow(/Message not declared by SceneStreamingSurface\/ObserveSurface/)
})

test('rejects a one-shot Mount even when the caller erased its type', () => {
  const MeasureSurface = Surface.makeMount('MeasureSurface', {
    messages: [Message.MeasuredSurface],
    handler: function* () {
      return () => Effect.succeed(Message.MeasuredSurface({ width: 100 }))
    },
  })
  const oneShotView = (
    model: Model,
    h: HtmlBuilder<Message, Mount.RequirementsOf<typeof MeasureSurface>>,
  ) => h.div([h.OnMount(MeasureSurface())], [`width ${model.width}`])
  const invalidEmission = Reflect.apply(Scene.Mount.emit, undefined, [
    MeasureSurface,
    Message.MeasuredSurface({ width: 240 }),
  ])

  expect(() =>
    Scene.scene(
      { update, view: oneShotView },
      Scene.given(Model.make({ width: 0 })),
      Scene.Mount.resolve(
        MeasureSurface,
        Message.MeasuredSurface({ width: 100 }),
      ),
      invalidEmission,
    ),
  ).toThrow(/requires a stream Mount/)
})

test('snapshots the declaration used to validate later emissions', () => {
  const ForeignMessage = defineMessageUnion({ ObservedOtherSurface: {} })
  const messages = Tuple.make(Message.MeasuredSurface)
  const ObserveFrozenSurface = Surface.makeMountStream('ObserveFrozenSurface', {
    messages,
  })
  Reflect.apply(messages.push, messages, [ForeignMessage.ObservedOtherSurface])
  const frozenView = (
    model: Model,
    h: HtmlBuilder<Message, Mount.RequirementsOf<typeof ObserveFrozenSurface>>,
  ) => h.div([h.OnMount(ObserveFrozenSurface())], [`width ${model.width}`])
  const invalidEmission = Reflect.apply(Scene.Mount.emit, undefined, [
    ObserveFrozenSurface,
    ForeignMessage.ObservedOtherSurface(),
  ])

  expect(() =>
    Scene.scene(
      { update, view: frozenView },
      Scene.given(Model.make({ width: 0 })),
      Scene.Mount.resolve(
        ObserveFrozenSurface,
        Message.MeasuredSurface({ width: 100 }),
      ),
      invalidEmission,
    ),
  ).toThrow(
    /Message not declared by SceneStreamingSurface\/ObserveFrozenSurface/,
  )
})

test('selects complete args and rejects ambiguous active occurrences', () => {
  const ObserveNamedSurface = Surface.makeMountStream('ObserveNamedSurface', {
    args: { id: Schema.String },
    messages: [Message.MeasuredSurface],
  })
  const twoSurfacesView = (
    model: Model,
    h: HtmlBuilder<Message, Mount.RequirementsOf<typeof ObserveNamedSurface>>,
  ) =>
    h.div(
      [],
      [
        h.section([h.OnMount(ObserveNamedSurface({ id: 'primary' }))]),
        h.section([h.OnMount(ObserveNamedSurface({ id: 'secondary' }))]),
        h.span([], [`width ${model.width}`]),
      ],
    )
  const initialResolutions = [
    Scene.Mount.resolve(
      ObserveNamedSurface({ id: 'primary' }),
      Message.MeasuredSurface({ width: 100 }),
    ),
    Scene.Mount.resolve(
      ObserveNamedSurface({ id: 'secondary' }),
      Message.MeasuredSurface({ width: 200 }),
    ),
  ]

  Scene.scene(
    { update, view: twoSurfacesView },
    Scene.given(Model.make({ width: 0 })),
    ...initialResolutions,
    Scene.Mount.emit(
      ObserveNamedSurface({ id: 'secondary' }),
      Message.MeasuredSurface({ width: 240 }),
    ),
    Scene.expect(Scene.text('width 240')).toExist(),
  )

  expect(() =>
    Scene.scene(
      { update, view: twoSurfacesView },
      Scene.given(Model.make({ width: 0 })),
      ...initialResolutions,
      Scene.Mount.emit(
        ObserveNamedSurface,
        Message.MeasuredSurface({ width: 240 }),
      ),
    ),
  ).toThrow(/selected multiple active Mounts/)

  expect(() =>
    Scene.scene(
      { update, view: twoSurfacesView },
      Scene.given(Model.make({ width: 0 })),
      ...initialResolutions,
      Scene.Mount.emit(
        ObserveNamedSurface({ id: 'missing' }),
        Message.MeasuredSurface({ width: 240 }),
      ),
    ),
  ).toThrow(/selected no resolved active Mount/)
})

test('replays the captured child boundary for every stream emission', () => {
  const ParentModel = Schema.Struct({ surface: Model })
  type ParentModel = typeof ParentModel.Type
  const ParentMessage = defineMessageUnion({ GotSurface: { message: Message } })
  type ParentMessage = typeof ParentMessage.Type
  const parentUpdate = (model: ParentModel, message: ParentMessage) => ({
    model: modifyFields(model, {
      surface: surface => update(surface, message.message).model,
    }),
  })
  const childView = defineView<
    Model,
    Message,
    void,
    Mount.RequirementsOf<typeof ObserveSurface>
  >(view)
  const parentView = (model: ParentModel) => {
    const h = attributeHtml<
      ParentMessage,
      Mount.RequirementsOf<typeof ObserveSurface>
    >()
    return h.div(
      [],
      [
        h.block({
          slotId: 'surface',
          model: model.surface,
          view: childView,
          toParentMessage: message => ParentMessage.GotSurface({ message }),
        }),
      ],
    )
  }

  Scene.scene(
    { update: parentUpdate, view: parentView },
    Scene.given(ParentModel.make({ surface: Model.make({ width: 0 }) })),
    Scene.Mount.resolve(
      ObserveSurface,
      Message.MeasuredSurface({ width: 100 }),
    ),
    Scene.Mount.emit(ObserveSurface, Message.MeasuredSurface({ width: 240 })),
    Scene.Mount.emit(ObserveSurface(), Message.MeasuredSurface({ width: 320 })),
    Scene.expect(Scene.text('width 320')).toExist(),
  )
})

test('retains Commands and OutMessages from later emissions', () => {
  const SavingMessage = defineMessageUnion({
    MeasuredSurface: { width: Schema.Number },
    CompletedRememberSurface: {},
  })
  type SavingMessage = typeof SavingMessage.Type
  const OutMessage = defineMessageUnion({
    SurfaceChanged: { width: Schema.Number },
  })
  const RememberSurface = Surface.makeCommand('RememberSurface', {
    args: { width: Schema.Number },
    messages: [SavingMessage.CompletedRememberSurface],
  })
  const savingUpdate = (model: Model, message: SavingMessage) =>
    SavingMessage.match(message, {
      MeasuredSurface: ({ width }) => ({
        model: modifyFields(model, { width: () => width }),
        commands: [RememberSurface({ width })],
        outMessage: OutMessage.SurfaceChanged({ width }),
      }),
      CompletedRememberSurface: () => ({ model }),
    })

  Scene.scene(
    { update: savingUpdate, view },
    Scene.given(Model.make({ width: 0 })),
    Scene.Mount.resolve(
      ObserveSurface,
      Message.MeasuredSurface({ width: 100 }),
    ),
    Scene.Command.resolve(
      RememberSurface,
      SavingMessage.CompletedRememberSurface(),
    ),
    Scene.Mount.emit(ObserveSurface, Message.MeasuredSurface({ width: 240 })),
    Scene.expectOutMessage(OutMessage.SurfaceChanged({ width: 240 })),
    Scene.Command.expectExact(RememberSurface({ width: 240 })),
    Scene.Command.resolve(
      RememberSurface,
      SavingMessage.CompletedRememberSurface(),
    ),
    Scene.expect(Scene.text('width 240')).toExist(),
  )

  expect(() =>
    Scene.scene(
      { update: savingUpdate, view },
      Scene.given(Model.make({ width: 0 })),
      Scene.Mount.resolve(
        ObserveSurface,
        Message.MeasuredSurface({ width: 100 }),
      ),
      Scene.Mount.emit(ObserveSurface, Message.MeasuredSurface({ width: 240 })),
    ),
  ).toThrow(/unresolved Commands/)
})

test('reuses an emission Step in separate Scenes without starting a handler', () => {
  const HostObserveSurface = Surface.makeMountStream('HostObserveSurface', {
    messages: [Message.MeasuredSurface],
  })
  const hostView = (
    model: Model,
    h: HtmlBuilder<Message, Mount.RequirementsOf<typeof HostObserveSurface>>,
  ) => h.div([h.OnMount(HostObserveSurface())], [`width ${model.width}`])
  const emission = Scene.Mount.emit(
    HostObserveSurface,
    Message.MeasuredSurface({ width: 240 }),
  )

  for (const width of [0, 1]) {
    Scene.scene(
      { update, view: hostView },
      Scene.given(Model.make({ width })),
      Scene.Mount.resolve(
        HostObserveSurface,
        Message.MeasuredSurface({ width: 100 }),
      ),
      emission,
      Scene.expect(Scene.text('width 240')).toExist(),
    )
  }
})

it.effect(
  'delivers stream emissions in a constructed Block-aware Scene',
  () => {
    const SurfaceKey = Symbol('SceneStreamingSurface')
    const Definition = Surface.makeDefinition({
      key: SurfaceKey,
      Model,
      Message,
      InitArgs: Schema.Tuple([]),
      view: { kind: 'Element' },
    })
    const Composition = Definition.makeComposition({ mounts: [ObserveSurface] })
    const init = Composition.makeInit(() => ({
      model: Model.make({ width: 0 }),
    }))
    const update = Composition.makeUpdate({
      MeasuredSurface: Definition.makeFieldsStep.fromMessage(({ width }) => ({
        width: () => width,
      })),
    })
    const view = Composition.makeView((model, h) =>
      h.div([h.OnMount(ObserveSurface())], [`width ${model.width}`]),
    )
    const SurfaceBlock = Definition.makeBlock(
      Effect.succeed({
        children: [],
        init,
        update,
        view,
        EffectsLayer: ObserveSurface.layer,
      }),
    )

    return PublicScene.scene(
      SurfaceBlock,
      PublicScene.init(),
      PublicScene.Mount.resolve(
        ObserveSurface,
        Message.MeasuredSurface({ width: 100 }),
      ),
      PublicScene.Mount.emit(
        ObserveSurface,
        Message.MeasuredSurface({ width: 240 }),
      ),
      PublicScene.expect(PublicScene.text('width 240')).toExist(),
    )
  },
)
