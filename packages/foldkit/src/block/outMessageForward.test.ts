import { Layer, Schema } from 'effect'
import { expect, expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import * as Block from './public.js'

const Choice = Schema.Literals(['Apple', 'Pear'])
type Choice = typeof Choice.Type
const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({ RequestedClose: {} })
type ChildMessage = typeof ChildMessage.Type
const ChildOutMessage = defineMessageUnion({
  Selected: { value: Choice },
  Closed: {},
})
type ChildOutMessage = typeof ChildOutMessage.Type
const ChildDefinition = Block.makeDefinition('ForwardChild', {
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
})
const ChildComposition = ChildDefinition.makeComposition()
const prepareChildBlock = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => ({ model: { count: 0 } })),
    update: ChildComposition.makeUpdate({
      RequestedClose: model => ({ model }),
    }),
    operations: { requestClose: ChildMessage.RequestedClose },
    EffectsLayer: Layer.empty,
  })
const ChildBlock: Block.FromAssemblyWithOutMessage<
  typeof ChildModel,
  typeof prepareChildBlock
> = Block.assemble(prepareChildBlock)

const ParentModel = Schema.Struct({ choice: Choice })
type ParentModel = typeof ParentModel.Type
const ParentMessage = defineMessageUnion({ RequestedReset: {} })
type ParentMessage = typeof ParentMessage.Type
const ParentOutMessage = defineMessageUnion({
  Chose: { value: Choice },
  Dismissed: {},
})
type ParentOutMessage = typeof ParentOutMessage.Type
const ForeignOutMessage = defineMessageUnion({ Escaped: {} })
type ForeignOutMessage = typeof ForeignOutMessage.Type
const ParentDefinition = Block.makeDefinition('ForwardParent', {
  Model: ParentModel,
  Message: ParentMessage,
  OutMessage: ParentOutMessage,
})

it('forwards exact child payloads into the declared parent OutMessage union', () => {
  const forward = ParentDefinition.makeOutMessageForward(ChildBlock, {
    Selected: ({ value }) => {
      expectTypeOf(value).toEqualTypeOf<'Apple' | 'Pear'>()
      return ParentOutMessage.Chose({ value })
    },
    Closed: () => undefined,
  })

  expect(forward(ChildOutMessage.Selected({ value: 'Pear' }))).toEqual(
    ParentOutMessage.Chose({ value: 'Pear' }),
  )
  expect(forward(ChildOutMessage.Closed())).toBeUndefined()
  expectTypeOf<Parameters<typeof forward>[0]>().toEqualTypeOf<
    typeof ChildOutMessage.Type
  >()
  expectTypeOf<ReturnType<typeof forward>>().toEqualTypeOf<
    typeof ParentOutMessage.Type | undefined
  >()
})

it('rejects invalid runtime authoring inputs', () => {
  const makeForward = ParentDefinition.makeOutMessageForward

  expect(() =>
    Reflect.apply(makeForward, undefined, [ChildDefinition, {}]),
  ).toThrow('requires a completed child Block')
  expect(() =>
    Reflect.apply(makeForward, undefined, [
      ChildBlock,
      { Selected: () => ParentOutMessage.Dismissed() },
    ]),
  ).toThrow('is missing handlers for: Closed')
  expect(() =>
    Reflect.apply(makeForward, undefined, [
      ChildBlock,
      {
        Selected: () => ParentOutMessage.Dismissed(),
        Closed: () => undefined,
        Unexpected: () => undefined,
      },
    ]),
  ).toThrow('received unexpected handlers for: Unexpected')
  expect(() =>
    Reflect.apply(makeForward, undefined, [
      ChildBlock,
      {
        Selected: () => ParentOutMessage.Dismissed(),
        Closed: 'invalid',
      },
    ]),
  ).toThrow('handler "Closed" must be a function')
})

if (false) {
  const DefinitionWithoutOutMessage = Block.makeDefinition(
    'ForwardParentWithoutOutMessage',
    { Model: ParentModel, Message: ParentMessage },
  )

  // @ts-expect-error A Definition without an OutMessage contract cannot author forwarding.
  DefinitionWithoutOutMessage.makeOutMessageForward(ChildBlock, {})

  // @ts-expect-error Every child OutMessage variant must be named.
  ParentDefinition.makeOutMessageForward(ChildBlock, {
    Selected: ({ value }) => ParentOutMessage.Chose({ value }),
  })

  ParentDefinition.makeOutMessageForward(ChildBlock, {
    Selected: ({ value }) => ParentOutMessage.Chose({ value }),
    Closed: () => undefined,
    // @ts-expect-error Undeclared child OutMessage variants are rejected.
    Unexpected: () => undefined,
  })

  ParentDefinition.makeOutMessageForward(ChildBlock, {
    // @ts-expect-error A foreign OutMessage cannot enter the parent channel.
    Selected: () => ForeignOutMessage.Escaped(),
    Closed: () => undefined,
  })

  // @ts-expect-error A forwarding policy must forward at least one parent OutMessage.
  ParentDefinition.makeOutMessageForward(ChildBlock, {
    Selected: () => undefined,
    Closed: () => undefined,
  })

  ParentDefinition.makeOutMessageForward(ChildBlock, {
    // @ts-expect-error `any` cannot bypass the parent OutMessage contract.
    Selected: (): any => ParentOutMessage.Dismissed(),
    Closed: () => undefined,
  })

  ParentDefinition.makeOutMessageForward(ChildBlock, {
    // @ts-expect-error `unknown` cannot bypass the parent OutMessage contract.
    Selected: (): unknown => ParentOutMessage.Dismissed(),
    Closed: () => undefined,
  })

  ParentDefinition.makeOutMessageForward(ChildBlock, {
    // @ts-expect-error `never` cannot bypass the parent OutMessage contract.
    Selected: (): never => {
      throw new Error('unreachable')
    },
    Closed: () => ParentOutMessage.Dismissed(),
  })
}

it('validates contextual forwarding against the selected child without running handlers', () => {
  const BindingDefinition = Block.makeDefinition('ContextualForwardParent', {
    Model: Schema.Struct({ child: ChildModel }),
    Message: ParentMessage,
    OutMessage: ParentOutMessage,
  })
  const ChildBinding = BindingDefinition.makeBinding(ChildBlock, {
    field: 'child',
    init: false,
  })
  const incomplete = Reflect.apply(
    BindingDefinition.makeOutMessageForward,
    undefined,
    [{ Selected: () => ParentOutMessage.Dismissed() }],
  )

  expect(() =>
    Reflect.apply(ChildBinding.withOutMessagePolicy, undefined, [
      { forward: incomplete },
    ]),
  ).toThrow('missing handlers for: Closed')
})
