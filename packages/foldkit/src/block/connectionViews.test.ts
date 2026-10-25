import { Array, Option, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import type * as Update from '../update/index.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const Model = Schema.Struct({ count: Schema.Number })
type Model = typeof Model.Type
const Message = defineMessageUnion({ ClickedIncrement: {} })

const ConnectionViewsChildComposition = makeDefinition('ConnectionViewsChild', {
  Model,
  Message,
}).makeComposition()
const ViewInputs = Schema.Struct({ label: Schema.String })
type ViewInputs = typeof ViewInputs.Type
const view = ConnectionViewsChildComposition.makeView.withInputs<ViewInputs>(
  (model, inputs, h) =>
    h.button(
      [h.OnClick(Message.ClickedIncrement())],
      [inputs.label, globalThis.String(model.count)],
    ),
)
const prepareBlock = () =>
  ConnectionViewsChildComposition.prepareBlock({
    init: () => ({ model: Model.make({ count: 0 }) }),
    update: ConnectionViewsChildComposition.makeUpdate({
      ClickedIncrement: model => ({
        model: modifyFields(model, { count: count => count + 1 }),
      }),
    }),
    view,
  })
const block: Block.FromAssemblyWithView<typeof Model, typeof prepareBlock> =
  Block.assemble(prepareBlock)

const Entry = Schema.Struct({ id: Schema.String, child: Model })
const ParentModel = Schema.Struct({
  child: Model,
  entries: Schema.Array(Entry),
})
type ParentModel = typeof ParentModel.Type
const ConnectionViewsParent = makeDefinition('ConnectionViewsParent', {
  Model: ParentModel,
  Message: Schema.Never,
})

const ConnectedBinding = ConnectionViewsParent.makeBinding(block, {
  field: 'child',
})
const entryKey = (entry: typeof Entry.Type): string => entry.id
const KeyedBinding = ConnectionViewsParent.makeBinding(block, {
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
  keySchema: Schema.String,
})
const ForeignMessage = defineMessageUnion({ ClickedForeignButton: {} })

const ConnectionViewsForeignComposition = makeDefinition(
  'ConnectionViewsForeign',
  {
    Model,
    Message: ForeignMessage,
  },
).makeComposition()
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
const TaggedParent = makeDefinition('ConnectionViewsTaggedParent', {
  Model: TaggedParentModel,
  Message: Schema.Never,
})
const TaggedBinding = TaggedParent.makeBinding(block, {
  read: model =>
    model._tag === 'Active' ? Option.some(model.child) : Option.none(),
  write: (model, nextChild) =>
    model._tag === 'Active' ? ActiveParent.make({ child: nextChild }) : model,
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
    bindings: [TaggedBinding],
  })
  const update = TaggedComposition.makeUpdate({})
  const message = {
    _tag: 'GotConnectionViewsChildMessage',
    placement: 'ConnectionViewsChild',
    generation: 0,
    message: Message.ClickedIncrement(),
  } satisfies Parameters<typeof update>[1]

  expect(update(active, message).model).toEqual(
    ActiveParent.make({ child: Model.make({ count: 2 }) }),
  )
  expect(update(inactive, message).model).toEqual(inactive)

  if (false) {
    TaggedParent.makeBinding(block, {
      // @ts-expect-error The invalid tagged writer prevents accessor overload selection.
      read: (model: TaggedParentModel) =>
        model._tag === 'Active' ? Option.some(model.child) : Option.none(),
      // @ts-expect-error A tagged Binding writer must return the parent Model union.
      write: (_model: TaggedParentModel, nextChild) => nextChild,
    })
  }
})

it('lowers required-field shorthand through the shared pure Binding adapter', () => {
  const initial = ParentModel.make({
    child: Model.make({ count: 0 }),
    entries: [],
  })
  const ParentComposition = ConnectionViewsParent.makeComposition({
    bindings: [ConnectedBinding, KeyedBinding],
  })
  const update = ParentComposition.makeUpdate({})
  const message = {
    _tag: 'GotChildMessage',
    placement: 'child',
    generation: 0,
    message: Message.ClickedIncrement(),
  } satisfies Parameters<typeof update>[1]
  const result = update(initial, message)

  expect(result.model.child.count).toBe(1)
  expect(result.model.entries).toBe(initial.entries)
  expect(initial.child.count).toBe(0)
  expectTypeOf<
    Update.RequirementsOf<typeof ConnectedBinding.fold>
  >().toEqualTypeOf<never>()
  expectTypeOf(result.model).toEqualTypeOf<ParentModel>()

  const optionalModel = Schema.Struct({ maybeChild: Schema.Option(Model) })
  const OptionalParent = makeDefinition('ConnectionViewsOptionalParent', {
    Model: optionalModel,
    Message: Schema.Never,
  })
  const OptionalBinding = OptionalParent.makeBinding(block, {
    read: model => model.maybeChild,
    write: (model, nextChild) =>
      modifyFields(model, { maybeChild: () => Option.some(nextChild) }),
  })
  const OptionalComposition = OptionalParent.makeComposition({
    bindings: [OptionalBinding],
  })
  const optionalUpdate = OptionalComposition.makeUpdate({})

  expect(
    optionalUpdate(optionalModel.make({ maybeChild: Option.none() }), {
      _tag: 'GotConnectionViewsChildMessage',
      placement: 'ConnectionViewsChild',
      generation: 0,
      message: Message.ClickedIncrement(),
    }).model.maybeChild,
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
  const WiderParent = makeDefinition('ConnectionViewsWiderParent', {
    Model: widerModel,
    Message: Schema.Never,
  })
  const NarrowerParent = makeDefinition('ConnectionViewsNarrowerParent', {
    Model: narrowerModel,
    Message: Schema.Never,
  })
  const ExtendedParent = makeDefinition('ConnectionViewsExtendedParent', {
    Model: extendedModel,
    Message: Schema.Never,
  })

  if (false) {
    WiderParent.makeBinding(block, {
      // @ts-expect-error A wider field cannot be replaced by this child's Model.
      field: 'child',
    })
    NarrowerParent.makeBinding(block, {
      // @ts-expect-error A narrower field cannot accept every child Model update.
      field: 'child',
    })
    ExtendedParent.makeBinding(block, {
      // @ts-expect-error The Binding cannot discard additional optional child fields.
      field: 'child',
    })
    OptionalParent.makeBinding(block, {
      field: 'maybeChild',
    })
    ConnectionViewsParent.makeBinding(block, {
      // @ts-expect-error Required-field shorthand rejects undeclared fields.
      field: 'missing',
    })
    ConnectionViewsParent.makeBinding(block, {
      // @ts-expect-error Required-field shorthand cannot mix explicit readers.
      field: 'child',
      // @ts-expect-error The direct shorthand cannot mix explicit readers.
      read: (model: ParentModel) => Option.some(model.child),
    })
  }
})
