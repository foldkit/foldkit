import { Array, Context, type Fiber, Option, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { makeDefinition } from '../block/define.js'
import * as Block from '../block/public.js'
import { defineMessageUnion } from '../message/index.js'
import {
  externalMessageGuard,
  liftChildMessage,
} from '../runtime/childOrigin.js'
import { modifyFields } from '../struct/index.js'
import { toParentMessage } from './toParentMessage.js'

const ChildModel = Schema.Struct({ id: Schema.String, count: Schema.Number })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({
  RequestedAdd: {
    amount: Schema.NumberFromString.check(Schema.isGreaterThan(0)),
  },
})
type ChildMessage = typeof ChildMessage.Type
const ChildOutMessage = defineMessageUnion({
  ChangedCount: { count: Schema.Number },
})
type ChildOutMessage = typeof ChildOutMessage.Type

const ChildDefinition = makeDefinition('TestParentMessageChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const ChildComposition = ChildDefinition.makeComposition()
let childTransitions = 0
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit((id: string) => ({
      model: { id, count: 0 },
    })),
    update: ChildComposition.makeUpdate.withContext((multiplier: number) => ({
      RequestedAdd: (model, { amount }) => {
        childTransitions += 1
        const nextCount = model.count + amount * multiplier
        return {
          model: modifyFields(model, { count: () => nextCount }),
          outMessage: ChildOutMessage.ChangedCount({ count: nextCount }),
        }
      },
    })),
    view: ChildComposition.makeView.withInputs<
      Readonly<{
        label: string
        formatCount: (count: number) => string
        onRendered: (label: string, count: number) => void
      }>
    >((_model, _viewInputs, h) => h.div([])),
  })
const ChildBlock: Block.FromAssemblyWithViewAndOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const PlainChildDefinition = makeDefinition('TestParentMessagePlainChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const PlainChildComposition = PlainChildDefinition.makeComposition()
const preparePlainChildBlock = () =>
  PlainChildComposition.prepareBlock({
    init: PlainChildComposition.makeInit((id: string) => ({
      model: { id, count: 0 },
    })),
    update: PlainChildComposition.makeUpdate.withContext(
      (multiplier: number) => ({
        RequestedAdd: (model, { amount }) => ({
          model: modifyFields(model, {
            count: count => count + amount * multiplier,
          }),
        }),
      }),
    ),
  })
const PlainChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof preparePlainChildBlock
> = Block.assemble(preparePlainChildBlock)

const MessageFreeChildDefinition = makeDefinition(
  'TestParentMessageFreeChild',
  { Model: ChildModel, Message: Schema.Never },
)
const MessageFreeChildComposition = MessageFreeChildDefinition.makeComposition()
const prepareMessageFreeChildBlock = () =>
  MessageFreeChildComposition.prepareBlock({
    init: MessageFreeChildComposition.makeInit((id: string) => ({
      model: { id, count: 0 },
    })),
    update: MessageFreeChildComposition.makeUpdate({}),
  })
const MessageFreeChildBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareMessageFreeChildBlock
> = Block.assemble(prepareMessageFreeChildBlock)

const WrappedChild = Schema.Struct({
  entryId: Schema.String,
  child: ChildModel,
  label: Schema.String,
})
type WrappedChild = typeof WrappedChild.Type
const NumericChild = Schema.Struct({
  order: Schema.Number,
  child: ChildModel,
})
type NumericChild = typeof NumericChild.Type
const LiteralChild = Schema.Struct({
  slot: Schema.Literals(['Primary', 'Secondary']),
  child: ChildModel,
})
type LiteralChild = typeof LiteralChild.Type
const ParentModel = Schema.Struct({
  child: ChildModel,
  maybeChild: Schema.Option(ChildModel),
  maybeSilentChild: Schema.Option(ChildModel),
  children: Schema.Array(ChildModel),
  wrappedChildren: Schema.Array(WrappedChild),
  numericChildren: Schema.Array(NumericChild),
  literalChildren: Schema.Array(LiteralChild),
  multiplier: Schema.Number,
  isEnabled: Schema.Boolean,
  observedCount: Schema.Number,
})
type ParentModel = typeof ParentModel.Type
const ParentDefinition = makeDefinition('TestParentMessageParent', {
  Model: ParentModel,
  Message: Schema.Never,
})
const ChildBindingWithoutPolicy = ParentDefinition.makeBinding(ChildBlock, {
  placement: 'primary',
  read: model => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, { child: () => nextChild }),
  delivery: {
    when: model => model.isEnabled,
    toUpdateContext: model => [model.multiplier],
  },
})
const ChildBinding = ChildBindingWithoutPolicy.withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(ChildBlock, {
    ChangedCount: ({ count }) =>
      ParentDefinition.makeFieldsStep(() => ({
        observedCount: () => count,
      })),
  }),
})
const ForeignParentDefinition = makeDefinition(
  'TestParentMessageForeignParent',
  {
    Model: ParentModel,
    Message: Schema.Never,
  },
)
const ForeignChildBinding = ForeignParentDefinition.makeBinding(ChildBlock, {
  placement: 'primary',
  read: model => Option.some(model.child),
  write: (model, nextChild) => modifyFields(model, { child: () => nextChild }),
  delivery: { toUpdateContext: model => [model.multiplier] },
})
const OptionalBinding = ParentDefinition.makeBinding(PlainChildBlock, {
  field: 'maybeChild',
  placement: 'optional',
  delivery: { toUpdateContext: model => [model.multiplier] },
})
const MessageFreeBinding = ParentDefinition.makeBinding(MessageFreeChildBlock, {
  field: 'maybeSilentChild',
  placement: 'silent',
})
const KeyedBinding = ParentDefinition.makeBinding(PlainChildBlock, {
  field: 'children',
  key: 'id',
  placement: 'entries',
  delivery: { toUpdateContext: model => [model.multiplier] },
})
const WrappedBinding = ParentDefinition.makeBinding(PlainChildBlock, {
  field: 'wrappedChildren',
  key: 'entryId',
  childField: 'child',
  placement: 'wrapped',
  delivery: { toUpdateContext: model => [model.multiplier] },
})
const NumericBinding = ParentDefinition.makeBinding(PlainChildBlock, {
  readAll: model => model.numericChildren,
  key: item => item.order,
  keySchema: Schema.NumberFromString.check(Schema.isGreaterThan(0)),
  read: item => item.child,
  writeAt: (model, order, nextChild) =>
    modifyFields(model, {
      numericChildren: Array.map(item =>
        item.order === order
          ? modifyFields(item, { child: () => nextChild })
          : item,
      ),
    }),
  placement: 'numeric',
  delivery: { toUpdateContext: model => [model.multiplier] },
})
const LiteralBinding = ParentDefinition.makeBinding(PlainChildBlock, {
  readAll: model => model.literalChildren,
  key: item => item.slot,
  keySchema: LiteralChild.fields.slot,
  read: item => item.child,
  writeAt: (model, slot, nextChild) =>
    modifyFields(model, {
      literalChildren: Array.map(item =>
        item.slot === slot
          ? modifyFields(item, { child: () => nextChild })
          : item,
      ),
    }),
  placement: 'literal',
  delivery: { toUpdateContext: model => [model.multiplier] },
})
const ParentComposition = ParentDefinition.makeComposition({
  bindings: [
    ChildBinding,
    OptionalBinding,
    KeyedBinding,
    WrappedBinding,
    NumericBinding,
    LiteralBinding,
    MessageFreeBinding,
  ],
})
const updateParent = ParentComposition.makeUpdate({})

const makeParentModel = () =>
  ParentModel.make({
    child: { id: 'primary', count: 1 },
    maybeChild: Option.some({ id: 'optional', count: 2 }),
    maybeSilentChild: Option.none(),
    children: [
      { id: 'first', count: 3 },
      { id: 'second', count: 4 },
    ],
    wrappedChildren: [
      {
        entryId: 'wrapped-first',
        child: { id: 'wrapped-child', count: 5 },
        label: 'First',
      },
    ],
    numericChildren: [{ order: 1, child: { id: 'numeric-child', count: 6 } }],
    literalChildren: [
      { slot: 'Primary', child: { id: 'literal-child', count: 7 } },
    ],
    multiplier: 2,
    isEnabled: true,
    observedCount: 0,
  })

it('wraps a headless fact through a policy alias without view inputs or execution', () => {
  const childMessage = ChildMessage.RequestedAdd({ amount: 3 })
  const parentMessage = toParentMessage(ChildBinding, childMessage)

  expect(parentMessage).toEqual({
    _tag: 'GotPrimaryMessage',
    placement: 'primary',
    generation: 0,
    message: childMessage,
  })
  expect(parentMessage.message).toBe(childMessage)
  expect(childTransitions).toBe(0)
  expectTypeOf(parentMessage).toEqualTypeOf<
    Readonly<{
      _tag: 'GotPrimaryMessage'
      placement: 'primary'
      generation: number
      message: typeof ChildMessage.Type
    }>
  >()

  const result = updateParent(makeParentModel(), parentMessage)
  expect(result.model.child.count).toBe(7)
  expect(result.model.observedCount).toBe(7)
  expect(childTransitions).toBe(1)
})

it('leaves delivery gates and optional absence to the parent dispatcher', () => {
  const childMessage = ChildMessage.RequestedAdd({ amount: 2 })
  const staticMessage = toParentMessage(ChildBinding, childMessage)
  const optionalMessage = toParentMessage(OptionalBinding, childMessage)
  const disabled = modifyFields(makeParentModel(), {
    isEnabled: () => false,
  })
  const absent = modifyFields(makeParentModel(), {
    maybeChild: () => Option.none(),
  })

  expect(updateParent(disabled, staticMessage).model).toBe(disabled)
  expect(updateParent(absent, optionalMessage).model).toBe(absent)
})

it('preserves Binding provenance for same-shaped foreign wrappers', () => {
  const foreignMessage = toParentMessage(
    ForeignChildBinding,
    ChildMessage.RequestedAdd({ amount: 2 }),
  )

  expect(foreignMessage).toMatchObject({
    _tag: 'GotPrimaryMessage',
    placement: 'primary',
    generation: 0,
  })
  expect(() => updateParent(makeParentModel(), foreignMessage)).toThrow(
    'was emitted by another child Binding',
  )
})

it('routes direct, wrapped and Codec-keyed children with decoded keys', () => {
  const childMessage = ChildMessage.RequestedAdd({ amount: 2 })
  const keyedMessage = toParentMessage(KeyedBinding, 'first', childMessage)
  const wrappedMessage = toParentMessage(
    WrappedBinding,
    'wrapped-first',
    childMessage,
  )
  const numericMessage = toParentMessage(NumericBinding, 1, childMessage)
  const literalMessage = toParentMessage(
    LiteralBinding,
    'Primary',
    childMessage,
  )
  const initial = makeParentModel()

  expect(updateParent(initial, keyedMessage).model.children).toEqual([
    { id: 'first', count: 7 },
    { id: 'second', count: 4 },
  ])
  expect(updateParent(initial, wrappedMessage).model.wrappedChildren).toEqual([
    {
      entryId: 'wrapped-first',
      child: { id: 'wrapped-child', count: 9 },
      label: 'First',
    },
  ])
  expect(updateParent(initial, numericMessage).model.numericChildren).toEqual([
    { order: 1, child: { id: 'numeric-child', count: 10 } },
  ])
  expect(updateParent(initial, literalMessage).model.literalChildren).toEqual([
    { slot: 'Primary', child: { id: 'literal-child', count: 11 } },
  ])

  const encoded = Schema.encodeSync(ParentComposition.Message)(numericMessage)
  expect(encoded).toMatchObject({ key: '1', message: { amount: '2' } })
  expect(Schema.decodeSync(ParentComposition.Message)(encoded)).toEqual(
    numericMessage,
  )
})

it('does not create missing keyed children and replays explicitly at generation zero', () => {
  const childMessage = ChildMessage.RequestedAdd({ amount: 2 })
  const message = toParentMessage(KeyedBinding, 'first', childMessage)
  const removed = modifyFields(makeParentModel(), {
    children: Array.filter(child => child.id !== 'first'),
  })
  const reinserted = modifyFields(removed, {
    children: children => [...children, { id: 'first', count: 20 }],
  })

  expect(updateParent(removed, message).model).toBe(removed)
  expect(updateParent(reinserted, message).model.children).toEqual([
    { id: 'second', count: 4 },
    { id: 'first', count: 24 },
  ])
  expect(message.generation).toBe(0)
})

it('keeps replay generation separate from live-origin admission', () => {
  const childMessage = ChildMessage.RequestedAdd({ amount: 1 })
  const replay = toParentMessage(ChildBinding, childMessage)
  const childOccurrence = {
    binding: ChildBindingWithoutPolicy,
    block: ChildBlock,
    generation: 7,
    isActive: true,
    resources: Context.empty(),
    mounts: new Set<Fiber.Fiber<void>>(),
    children: new Map(),
  }
  const root = {
    block: { bindings: [ChildBindingWithoutPolicy] },
    generation: 1,
    isActive: true,
    resources: Context.empty(),
    mounts: new Set<Fiber.Fiber<void>>(),
    children: new Map([
      [ChildBindingWithoutPolicy, new Map([[undefined, childOccurrence]])],
    ]),
  }

  expect(externalMessageGuard(root, replay)).toBeUndefined()

  const live = liftChildMessage(childOccurrence, childMessage, value => value)
  const guard = externalMessageGuard(root, live)
  expect(live).toMatchObject({ generation: 7 })
  expect(guard?.()).toBe(true)

  childOccurrence.isActive = false
  expect(guard?.()).toBe(false)
})

it('validates erased decoded Messages, keys, arity and Binding metadata', () => {
  const childMessage = ChildMessage.RequestedAdd({ amount: 1 })

  expect(() =>
    Reflect.apply(toParentMessage, undefined, [
      ChildBinding,
      { _tag: 'RequestedAdd', amount: 0 },
    ]),
  ).toThrow('child Message must be a decoded value')
  expect(() =>
    Reflect.apply(toParentMessage, undefined, [
      ChildBinding,
      { _tag: 'RequestedAdd', amount: '1' },
    ]),
  ).toThrow('child Message must be a decoded value')
  expect(() =>
    Reflect.apply(toParentMessage, undefined, [
      NumericBinding,
      '1',
      childMessage,
    ]),
  ).toThrow('key must be a decoded value')
  expect(() =>
    Reflect.apply(toParentMessage, undefined, [
      NumericBinding,
      0,
      childMessage,
    ]),
  ).toThrow('key must be a decoded value')
  expect(() =>
    Reflect.apply(toParentMessage, undefined, [KeyedBinding, 1, childMessage]),
  ).toThrow('key must be a decoded value')
  expect(() =>
    Reflect.apply(toParentMessage, undefined, [
      LiteralBinding,
      'Tertiary',
      childMessage,
    ]),
  ).toThrow('key must be a decoded value')
  expect(() =>
    Reflect.apply(toParentMessage, undefined, [
      ChildBinding,
      'extra-key',
      childMessage,
    ]),
  ).toThrow('requires only a child Message')
  expect(() =>
    Reflect.apply(toParentMessage, undefined, [KeyedBinding, childMessage]),
  ).toThrow('requires a decoded key and child Message')
  expect(() =>
    Reflect.apply(toParentMessage, undefined, [{}, childMessage]),
  ).toThrow('requires an actual generated child Binding')
  expect(() =>
    Reflect.apply(toParentMessage, undefined, [
      MessageFreeBinding,
      childMessage,
    ]),
  ).toThrow('Manually mapped and Message-free Bindings are unsupported')
})
