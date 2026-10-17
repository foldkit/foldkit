import { Array, Option, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import { define } from './define.js'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({ ClickedIncrement: {} })
const ConnectionViewsChild = define('ConnectionViewsChild', { Model, Message })
const ConnectionViewsChildComposition = ConnectionViewsChild.makeComposition()
const ViewInputs = Schema.Struct({ label: Schema.String })
type ViewInputs = typeof ViewInputs.Type
const view = ConnectionViewsChildComposition.makeView.withInputs<ViewInputs>(
  (model, inputs, h) =>
    h.button(
      [h.OnClick(Message.ClickedIncrement())],
      [inputs.label, globalThis.String(model.count)],
    ),
)
const block = ConnectionViewsChildComposition.makeBlock({
  init: () => ({ model: Model.make({ count: 0 }) }),
  update: ConnectionViewsChildComposition.makeUpdate(model => ({
    model: modifyFields(model, { count: count => count + 1 }),
  })),
  view,
})

const Entry = Schema.Struct({ id: Schema.String, child: Model })
const ParentModel = Schema.Struct({
  child: Model,
  entries: Schema.Array(Entry),
})
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({
  GotChildMessage: { message: Message },
  GotEntryMessage: { id: Schema.String, message: Message },
})
const ConnectionViewsParent = define('ConnectionViewsParent', {
  Model: ParentModel,
  Message: ParentMessage,
})

const ConnectedBinding = ConnectionViewsParent.bindChild(block, {
  field: 'child',
  parentMessage: ParentMessage.GotChildMessage,
})
const entryKey = (entry: typeof Entry.Type): string => entry.id
const KeyedBinding = ConnectionViewsParent.bindChild(block, {
  fromParentMessage: false,
  placement: 'entries',
  readAll: (model: ParentModel) => model.entries,
  key: entryKey,
  read: (entry: typeof Entry.Type) => entry.child,
  writeAt: (model: ParentModel, id: string, nextChild: Model) =>
    modifyFields(model, {
      entries: Array.map(entry =>
        entry.id === id
          ? modifyFields(entry, { child: () => nextChild })
          : entry,
      ),
    }),
  toParentMessage: (id: string, message: typeof Message.Type) =>
    ParentMessage.GotEntryMessage({ id, message }),
})
const ForeignMessage = defineMessageUnion({ ClickedForeignButton: {} })
const ConnectionViewsForeign = define('ConnectionViewsForeign', {
  Model,
  Message: ForeignMessage,
})
const ConnectionViewsForeignComposition =
  ConnectionViewsForeign.makeComposition()
const foreignView = ConnectionViewsForeignComposition.makeView((model, h) =>
  h.button(
    [h.OnClick(ForeignMessage.ClickedForeignButton())],
    [globalThis.String(model.count)],
  ),
)

const ActiveParent = Schema.TaggedStruct('Active', { child: Model })
const InactiveParent = Schema.TaggedStruct('Inactive', {})
const TaggedParentModel = Schema.Union([ActiveParent, InactiveParent])
type TaggedParentModel = typeof TaggedParentModel.Type
const TaggedParent = define('ConnectionViewsTaggedParent', {
  Model: TaggedParentModel,
  Message: ParentMessage,
})
const TaggedBinding = TaggedParent.bindChild(block, {
  read: model =>
    model._tag === 'Active' ? Option.some(model.child) : Option.none(),
  write: (model, nextChild) =>
    model._tag === 'Active' ? ActiveParent.make({ child: nextChild }) : model,
  parentMessage: ParentMessage.GotChildMessage,
})

it('retains default ViewInputs and checks alternate static and keyed Messages', () => {
  const model = Model.make({ count: 1 })
  const staticConfig = ConnectedBinding.embedView({
    slotId: 'child',
    model,
    viewInputs: { label: 'Count' },
  })
  const keyedConfig = KeyedBinding.embedView({
    slotId: 'entries',
    key: 'first',
    model,
    viewInputs: { label: 'Count' },
  })
  const alternate = block.makeView.withInputs<ViewInputs>((model, inputs, h) =>
    h.button(
      [h.OnClick(Message.ClickedIncrement())],
      [inputs.label, globalThis.String(model.count)],
    ),
  )
  const alternateConfig = KeyedBinding.embedView({
    slotId: 'entries',
    key: 'first',
    model,
    view: alternate,
    viewInputs: { label: 'Alternate' },
  })

  expect(staticConfig.view).toBe(view)
  expect(keyedConfig.view).toBe(view)
  expect(alternateConfig.view).toBe(alternate)

  // @ts-expect-error The default renderer requires its ViewInputs.
  ConnectedBinding.embedView({ slotId: 'child', model })
  KeyedBinding.embedView({
    slotId: 'entries',
    key: 'first',
    model,
    // @ts-expect-error Keyed default views preserve their ViewInputs contract.
    viewInputs: { label: 1 },
  })
  KeyedBinding.embedView({
    slotId: 'entries',
    // @ts-expect-error The registered key is a string.
    key: 1,
    model,
    viewInputs: { label: 'Count' },
  })
  // @ts-expect-error A keyed view requires its key.
  KeyedBinding.embedView({
    slotId: 'entries',
    model,
    viewInputs: { label: 'Count' },
  })
  // @ts-expect-error Static custom views must emit the child's Message union.
  ConnectedBinding.embedView({ slotId: 'child', model, view: foreignView })
  KeyedBinding.embedView({
    slotId: 'entries',
    key: 'first',
    model,
    // @ts-expect-error Keyed custom views must emit the child's Message union.
    view: foreignView,
  })
})

it('supports explicit tagged-union readers and writers', () => {
  const active = ActiveParent.make({ child: Model.make({ count: 1 }) })
  const inactive = InactiveParent.make({})

  const TaggedComposition = TaggedParent.makeComposition({
    childBindings: [TaggedBinding],
  })
  const update = TaggedComposition.makeUpdate(model => ({ model }))
  const message = ParentMessage.GotChildMessage({
    message: Message.ClickedIncrement(),
  })

  expect(update(active, message).model).toEqual(
    ActiveParent.make({ child: Model.make({ count: 2 }) }),
  )
  expect(update(inactive, message).model).toEqual(inactive)

  if (false) {
    TaggedParent.bindChild(block, {
      // @ts-expect-error The invalid tagged writer prevents accessor overload selection.
      read: (model: TaggedParentModel) =>
        model._tag === 'Active' ? Option.some(model.child) : Option.none(),
      // @ts-expect-error A tagged Binding writer must return the parent Model union.
      write: (_model: TaggedParentModel, nextChild) => nextChild,
      // @ts-expect-error The invalid tagged writer prevents accessor overload selection.
      parentMessage: ParentMessage.GotChildMessage,
    })
  }
})

it('lowers required-field shorthand through the shared pure Binding adapter', () => {
  const initial = ParentModel.make({
    child: Model.make({ count: 0 }),
    entries: [],
  })
  const ParentComposition = ConnectionViewsParent.makeComposition({
    childBindings: [ConnectedBinding],
  })
  const update = ParentComposition.makeUpdate(model => ({ model }))
  const message = ParentMessage.GotChildMessage({
    message: Message.ClickedIncrement(),
  })
  const result = update(initial, message)

  expect(result.model.child.count).toBe(1)
  expect(result.model.entries).toBe(initial.entries)
  expect(initial.child.count).toBe(0)
  expectTypeOf<
    Update.RequirementsOf<typeof ConnectedBinding.fold>
  >().toEqualTypeOf<never>()
  expectTypeOf(result.model).toEqualTypeOf<ParentModel>()

  const optionalModel = Schema.Struct({ maybeChild: Schema.Option(Model) })
  const OptionalParent = define('ConnectionViewsOptionalParent', {
    Model: optionalModel,
    Message: ParentMessage,
  })
  const OptionalBinding = OptionalParent.bindChild(block, {
    read: model => model.maybeChild,
    write: (model, nextChild) =>
      modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
    parentMessage: ParentMessage.GotChildMessage,
  })
  const OptionalComposition = OptionalParent.makeComposition({
    childBindings: [OptionalBinding],
  })
  const optionalUpdate = OptionalComposition.makeUpdate(model => ({ model }))

  expect(
    optionalUpdate(optionalModel.make({ maybeChild: Option.none() }), message)
      .model.maybeChild,
  ).toEqual(Option.none())

  const widerModel = Schema.Struct({
    child: Schema.Union([Model, Schema.String]),
  })
  const narrowerModel = Schema.Struct({
    child: Schema.Struct({ count: Schema.Literal(0) }),
  })
  const extendedModel = Schema.Struct({
    child: Schema.Struct({
      count: Schema.Number,
      label: Schema.optionalKey(Schema.String),
    }),
  })
  const WiderParent = define('ConnectionViewsWiderParent', {
    Model: widerModel,
    Message: ParentMessage,
  })
  const NarrowerParent = define('ConnectionViewsNarrowerParent', {
    Model: narrowerModel,
    Message: ParentMessage,
  })
  const ExtendedParent = define('ConnectionViewsExtendedParent', {
    Model: extendedModel,
    Message: ParentMessage,
  })

  if (false) {
    WiderParent.bindChild(block, {
      // @ts-expect-error A wider field cannot be replaced by this child's Model.
      field: 'child',
      // @ts-expect-error A wider field cannot be replaced by this child's Model.
      parentMessage: ParentMessage.GotChildMessage,
    })
    NarrowerParent.bindChild(block, {
      // @ts-expect-error A narrower field cannot accept every child Model update.
      field: 'child',
      // @ts-expect-error A narrower field cannot accept every child Model update.
      parentMessage: ParentMessage.GotChildMessage,
    })
    ExtendedParent.bindChild(block, {
      // @ts-expect-error The Binding cannot discard additional optional child fields.
      field: 'child',
      // @ts-expect-error The Binding cannot discard additional optional child fields.
      parentMessage: ParentMessage.GotChildMessage,
    })
    OptionalParent.bindChild(block, {
      field: 'maybeChild',
      parentMessage: ParentMessage.GotChildMessage,
    })
    ConnectionViewsParent.bindChild(block, {
      // @ts-expect-error Required-field shorthand rejects undeclared fields.
      field: 'missing',
      // @ts-expect-error Required-field shorthand rejects undeclared fields.
      parentMessage: ParentMessage.GotChildMessage,
    })
    ConnectionViewsParent.bindChild(block, {
      // @ts-expect-error Required-field shorthand cannot mix explicit readers.
      field: 'child',
      // @ts-expect-error The direct shorthand cannot mix explicit readers.
      read: (model: ParentModel) => Option.some(model.child),
      // @ts-expect-error The invalid explicit reader prevents direct overload selection.
      parentMessage: ParentMessage.GotChildMessage,
    })
  }
})
