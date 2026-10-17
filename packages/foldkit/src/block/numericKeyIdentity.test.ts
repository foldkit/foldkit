import { Array, Effect, Option, Schema, Tuple } from 'effect'
import { expect, it, vi } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import { modifyFields } from '../struct/index.js'
import { define } from './define.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const ChildMessage = defineMessageUnion({
  CompletedRead: { value: Schema.Number },
})
const Child = define('NumericIdentityChild', {
  Model: ChildModel,
  Message: ChildMessage,
})
const Read = Child.command('Read', {
  messages: [ChildMessage.CompletedRead],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.CompletedRead({ value: 4 }))
  },
})
const initialized = vi.fn()
const ChildComposition = Child.makeComposition()
const child = ChildComposition.makeBlock({
  init: ChildComposition.makeInit(() => {
    initialized()
    return { model: { count: 0 }, commands: [Read()] }
  }),
  update: ChildComposition.makeUpdate((model, { value }) => ({
    model: modifyFields(model, { count: () => value }),
  })),
  EffectsLayer: Read.layer,
})
const Model = Schema.Struct({
  entries: Schema.Array(
    Schema.Struct({ id: Schema.Number, child: ChildModel }),
  ),
})
const Message = defineMessageUnion({
  GotChildMessage: { id: Schema.Number, message: ChildMessage },
})
const Parent = define('NumericIdentityParent', { Model, Message })
const EntriesBinding = Parent.bindChild(child, {
  field: 'entries',
  key: 'id',
  childField: 'child',
  toParentMessage: (id, message) => Message.GotChildMessage({ id, message }),
  fromParentMessage: {
    parentMessage: Message.GotChildMessage,
    args: (_model, { id, message }) => Option.some([id, message]),
  },
})
const ParentComposition = Parent.makeComposition({
  childBindings: [EntriesBinding],
})

it('uses one zero identity for connected initialization and later dispatch', async () => {
  const init = ParentComposition.makeInit(() =>
    EntriesBinding.init({
      key: -0,
      args: [],
      toParentModel: child => Model.make({ entries: [{ id: 0, child }] }),
    }),
  )
  const parent = ParentComposition.makeBlock({
    init,
    update: ParentComposition.makeUpdate(),
  })
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
    parent.update(
      updated.model,
      Message.GotChildMessage({
        id: 0,
        message: ChildMessage.CompletedRead({ value: 9 }),
      }),
    ).model.entries,
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
  const StartupBinding = Parent.bindChild(child, {
    field: 'entries',
    key: 'id',
    childField: 'child',
    toParentMessage: (id, message) => Message.GotChildMessage({ id, message }),
    fromParentMessage: false,
    init: {
      occurrences: () => [{ key: -0, args: Tuple.make() }],
      toItem: (_occurrence, child) => ({ id: 0, child }),
    },
  })
  const StartupComposition = Parent.makeComposition({
    childBindings: [StartupBinding],
  })
  const init = StartupComposition.makeInit(() => ({ model: {} }))

  expect(init().commands).toHaveLength(1)
})

it('rejects duplicate signed-zero startup keys before initializing either occurrence', () => {
  const StartupBinding = Parent.bindChild(child, {
    field: 'entries',
    key: 'id',
    childField: 'child',
    toParentMessage: (id, message) => Message.GotChildMessage({ id, message }),
    fromParentMessage: false,
    init: {
      occurrences: () => [
        { key: -0, args: Tuple.make() },
        { key: 0, args: Tuple.make() },
      ],
      toItem: ({ key }, child) => ({ id: key, child }),
    },
  })
  const StartupComposition = Parent.makeComposition({
    childBindings: [StartupBinding],
  })
  const init = StartupComposition.makeInit(() => ({ model: {} }))
  initialized.mockClear()

  expect(init).toThrow('duplicate')
  expect(initialized).not.toHaveBeenCalled()
})
