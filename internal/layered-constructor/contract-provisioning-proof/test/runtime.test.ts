import { Effect, Layer, Schema } from 'effect'
import { Program, Runtime } from 'foldkit'
import * as Contracted from 'foldkit/experimental/contracted'
import { Story } from 'foldkit/experimental/layered/testing'
import { defineMessageUnion } from 'foldkit/message'
import { expect, test, vi } from 'vitest'

import {
  Block,
  ChildBinding,
  Contract,
  Message,
  ParentMessage,
  ParentLayer,
  ProvidedParent,
  Send,
  SendText,
} from '../src/basic'

test('a contract has no default implementation and Layer.provide supplies it', async () => {
  expect(Object.hasOwn(Contract, 'layer')).toBe(false)

  const model = await Effect.runPromise(
    Effect.gen(function* () {
      const block = yield* Contract.get
      return block.init('Deferred').model
    }).pipe(Effect.provide(Block.layer)),
  )

  expect(model).toEqual({ text: 'Deferred' })
})

test('extracted parent operations route through the selected child implementation', () =>
  Effect.runPromise(
    Story.story(
      ProvidedParent,
      Story.init(),
      Story.model(model => expect(model.child.text).toBe('Initial')),
      Story.message(ParentMessage.ClickedClear()),
      Story.model(model => expect(model.child.text).toBe('')),
    ),
  ))

test('accepted child OutMessages use the parent Binding policy without building handlers', () =>
  Effect.runPromise(
    Story.story(
      ProvidedParent,
      Story.init(),
      Story.messageIn(ChildBinding, Message.SubmittedText()),
      Story.Command.resolve(SendText, ParentMessage.CompletedSend()),
    ),
  ))

test('Program supplies handler dependencies and executes the selected graph', async () => {
  const sent: Array<string> = []
  const container = document.createElement('div')
  container.id = 'contract-proof-command-runtime'
  const wrapper = document.createElement('div')
  wrapper.appendChild(container)
  document.body.appendChild(wrapper)
  const program = Program.makeElement({
    block: ProvidedParent,
    container,
  }).provide(
    Layer.succeed(Send, {
      send: text =>
        Effect.sync(() => {
          sent.push(text)
        }),
    }),
  )
  const handle = Runtime.embed(program)

  try {
    await vi.waitFor(() => expect(wrapper.textContent).toBe('InitialSend'))
    const button = wrapper.querySelector('button')

    if (button === null) {
      throw new Error(
        'The selected parent view did not render its Send button.',
      )
    }

    button.click()

    await vi.waitFor(() => expect(sent).toEqual(['Initial']))
  } finally {
    handle.dispose()
    wrapper.remove()
  }
})

test('ordinary Layer composition and the descriptor convenience expose the same parent', async () => {
  const initial = await Effect.runPromise(
    Effect.gen(function* () {
      const block = yield* ProvidedParent.get
      return block.init().model
    }).pipe(Effect.provide(ParentLayer)),
  )

  expect(initial.child).toEqual({ text: 'Initial' })
})

test('contract keys distinguish declarations while display IDs may repeat', () => {
  const Model = Schema.Struct({ value: Schema.String })
  const Message = defineMessageUnion({ Changed: { value: Schema.String } })
  const firstKey = Symbol('FirstContract')
  const secondKey = Symbol('SecondContract')
  const config = Object.freeze({
    key: firstKey,
    Model,
    Message,
    Init: Schema.Tuple([]),
  })

  expect(() =>
    Reflect.apply(Contracted.makeDefinition, undefined, ['', config]),
  ).toThrow('nonempty literal Id')

  Contracted.makeDefinition('DuplicateContractProof', config)
  Contracted.makeDefinition('DuplicateContractProof', {
    ...config,
    key: secondKey,
  })

  expect(() => Contracted.makeDefinition('AnotherDisplayId', config)).toThrow(
    'already declared',
  )
})
