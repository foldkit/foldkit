import { Array, Effect, Option, Schema, Tuple } from 'effect'
import { expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { makeDefinition } from './define.js'
import * as Block from './public.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
type ChildModel = typeof ChildModel.Type
const ChildMessage = defineMessageUnion({
  CompletedRead: { value: Schema.Number },
})
type ChildMessage = typeof ChildMessage.Type
const Child = makeDefinition('NumericIdentityChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const Read = Child.makeCommand('Read', {
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedRead({ value: 4 }))
  },
})
const initialized = vi.fn()
const ChildComposition = Child.makeComposition()
const prepareChild = () =>
  ChildComposition.prepareBlock({
    init: ChildComposition.makeInit(() => {
      initialized()
      return { model: { count: 0 }, commands: [Read()] }
    }),
    update: ChildComposition.makeUpdate({
      CompletedRead: (model, { value }) => ({
        model: modifyFields(model, { count: () => value }),
      }),
    }),
    EffectsLayer: Read.layer,
  })
const child: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof ChildModel,
  typeof prepareChild
> = Block.assemble(prepareChild)
const Model = Schema.Struct({
  entries: Schema.Array(
    Schema.Struct({ id: Schema.Number, child: ChildModel }),
  ),
})
type Model = typeof Model.Type
const Parent = makeDefinition('NumericIdentityParent', {
  Model,
  Message: Schema.Never,
})
const EntriesBinding = Parent.makeBinding(child, {
  field: 'entries',
  key: 'id',
  childField: 'child',
})
const ParentComposition = Parent.makeComposition({
  bindings: [EntriesBinding],
})

it('uses one zero identity for connected initialization and later dispatch', async () => {
  const init = ParentComposition.makeInit(() =>
    EntriesBinding.init({
      key: -0,
      args: [],
      toParentModel: child => Model.make({ entries: [{ id: 0, child }] }),
    }),
  )
  const prepareParent = () =>
    ParentComposition.prepareBlock({
      init,
      update: ParentComposition.makeUpdate({}),
    })
  const parent: Block.FromAssemblyWithoutViewOrOutMessage<
    typeof Model,
    typeof prepareParent
  > = Block.assemble(prepareParent)
  const parentInit = init()
  const command = Option.getOrThrow(Array.head(parentInit.commands ?? []))
  const completed = await Effect.runPromise(
    command.effect.pipe(Effect.provide(parent.EffectsLayer)),
  )
  const updated = parent.update(parentInit.model, completed)

  expect(Option.getOrThrow(Array.head(updated.model.entries)).child.count).toBe(
    4,
  )
  expect(
    parent.update(updated.model, {
      _tag: 'GotNumericIdentityChildMessage',
      placement: 'NumericIdentityChild',
      generation: 0,
      key: 0,
      message: ChildMessage.CompletedRead({ value: 9 }),
    }).model.entries,
  ).toEqual([{ id: 0, child: { count: 9 } }])
})

it('rejects zero and negative zero as duplicate occurrences of the requested key', () => {
  const init = ParentComposition.makeInit(() =>
    EntriesBinding.init({
      key: -0,
      args: [],
      toParentModel: child =>
        Model.make({
          entries: [
            { id: 0, child },
            { id: -0, child },
          ],
        }),
    }),
  )

  expect(init).toThrow('must store exactly one occurrence at key "0"')
})

it('retains automatic startup Commands when Schema storage normalizes a zero key', () => {
  const StartupBinding = Parent.makeBinding(child, {
    field: 'entries',
    key: 'id',
    childField: 'child',
    init: {
      instances: () => [{ key: -0, args: Tuple.make() }],
      toItem: (_occurrence, child) => ({ id: 0, child }),
    },
  })
  const StartupComposition = Parent.makeComposition({
    bindings: [StartupBinding],
  })
  const init = StartupComposition.makeInit(() => ({ model: {} }))

  expect(init().commands).toHaveLength(1)
})

it('rejects duplicate signed-zero startup keys before initializing either occurrence', () => {
  const StartupBinding = Parent.makeBinding(child, {
    field: 'entries',
    key: 'id',
    childField: 'child',
    init: {
      instances: () => [
        { key: -0, args: Tuple.make() },
        { key: 0, args: Tuple.make() },
      ],
      toItem: ({ key }, child) => ({ id: key, child }),
    },
  })
  const StartupComposition = Parent.makeComposition({
    bindings: [StartupBinding],
  })
  const init = StartupComposition.makeInit(() => ({ model: {} }))
  initialized.mockClear()

  expect(init).toThrow('duplicate')
  expect(initialized).not.toHaveBeenCalled()
})
