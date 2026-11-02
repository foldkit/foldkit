import { DateTime, Effect, Exit, Layer } from 'effect'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { expect, test } from 'vitest'

import { ChatRoomBlock } from '../src/chatRoom'
import {
  SendMessage,
  TimestampReceivedMessage,
  TimestampSentMessage,
} from '../src/chatRoom/command'
import { ChatRoomContract } from '../src/chatRoom/definition'
import { managedResources } from '../src/chatRoom/managedResource'
import { Message } from '../src/chatRoom/message'
import { subscriptions } from '../src/chatRoom/subscription'
import {
  makeMessageComposerBlock,
  MessageComposerBlock,
} from '../src/messageComposer/block'
import { MessageComposerContract } from '../src/messageComposer/definition'
import { Message as ComposerMessage } from '../src/messageComposer/message'
import { FocusInput } from '../src/messageComposer/mount'
import { ChatRoomLayer, ChatRoomWithComposerBlock } from '../src/provided'

const zoned = DateTime.makeZonedUnsafe(0, { timeZone: 'UTC' })

const trackedLifetime = (name: string, events: Array<string>) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      events.push(`${name}: acquired`)
    }),
    () =>
      Effect.sync(() => {
        events.push(`${name}: released`)
      }),
  )

test('public contracts remain passive and ordinary Layers select independent Composer implementations', async () => {
  const events: Array<string> = []
  const firstComposer = makeMessageComposerBlock(
    trackedLifetime('first', events),
  )
  const secondComposer = makeMessageComposerBlock(
    trackedLifetime('second', events),
  )
  const firstRoom = ChatRoomBlock.provide(firstComposer.layer)
  const secondRoomLayer = ChatRoomBlock.layer.pipe(
    Layer.provide(secondComposer.layer),
  )

  expect('layer' in MessageComposerContract).toBe(false)
  expect(events).toEqual([])

  const inspect = (title: string, inputId: string) =>
    Effect.gen(function* () {
      const room = yield* ChatRoomContract.get
      const roomInit = room.init({ title, inputId })
      const draft = modifyFields(roomInit.model, {
        messageComposer: composer =>
          modifyFields(composer, { text: () => 'Hello' }),
      })
      const sentMessage = room.update(
        draft,
        Message.SucceededSendMessage({ text: 'Hello' }),
      )

      expect(sentMessage.model.title).toBe(title)
      expect(sentMessage.model.messageComposer.id).toBe(inputId)
      expect(sentMessage.model.messageComposer.text).toBe('')
      expect(sentMessage.commands).toHaveLength(1)
    })

  await Effect.runPromise(
    Effect.all(
      [
        inspect('First', 'first-input').pipe(Effect.provide(firstRoom.layer)),
        inspect('Second', 'second-input').pipe(Effect.provide(secondRoomLayer)),
      ],
      { concurrency: 'unbounded' },
    ),
  )

  expect(events.filter(event => event === 'first: acquired')).toHaveLength(1)
  expect(events.filter(event => event === 'first: released')).toHaveLength(1)
  expect(events.filter(event => event === 'second: acquired')).toHaveLength(1)
  expect(events.filter(event => event === 'second: released')).toHaveLength(1)
})

test('silent and emitting operations keep their declared behavior through the independent contract', async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const composer = yield* MessageComposerContract.get
      const composerInit = composer.init('message-input')
      const updatedText = composer.update(
        composerInit.model,
        ComposerMessage.UpdatedText({ value: '  Hello  ' }),
      )
      const submitted = composer.operations.requestSubmit(updatedText.model)
      const cleared = composer.operations.requestClear(submitted.model)

      expect(submitted.outMessage).toEqual({ _tag: 'Submitted', text: 'Hello' })
      expect(cleared.model.text).toBe('')
      expect(cleared.outMessage).toBeUndefined()
    }).pipe(Effect.provide(MessageComposerBlock.layer)),
  )
})

test('a supplied child graph releases its constructor scope when a Story assertion fails', async () => {
  const events: Array<string> = []
  const composer = makeMessageComposerBlock(trackedLifetime('story', events))
  const room = ChatRoomBlock.provide(composer.layer)
  const exit = await Effect.runPromiseExit(
    Story.story(
      room,
      Story.init({ title: 'General', inputId: 'message-input' }),
      Story.model(() => {
        throw new Error('Expected assertion failure')
      }),
    ),
  )

  expect(Exit.isFailure(exit)).toBe(true)
  expect(events).toEqual(['story: acquired', 'story: released'])
})

test('a provisioned Room uses ordinary Story Steps and its extracted connected transition', () =>
  Effect.runPromise(
    Story.story(
      ChatRoomWithComposerBlock,
      Story.init({ title: 'General', inputId: 'general-message-input' }),
      Story.message(Message.ConnectedChatSocket()),
      Story.message(Message.SucceededSendMessage({ text: 'Hello' })),
      Story.Command.resolve(
        TimestampSentMessage,
        Message.TimestampedMessage({ text: 'Hello', zoned, isSent: true }),
      ),
      Story.model(model => {
        expect(model.messages).toEqual([
          { id: 0, text: 'Hello', zoned, isSent: true },
        ])
      }),
    ),
  ))

test('private Focus Mounts and streamed replies work through the supplied Composer implementation', () =>
  Effect.runPromise(
    Scene.scene(
      ChatRoomWithComposerBlock,
      Scene.init({ title: 'General', inputId: 'general-message-input' }),
      Scene.click(Scene.role('button', { name: 'Connect' })),
      Scene.ManagedResource.acquire(managedResources.chatSocket),
      Scene.Mount.resolve(FocusInput, ComposerMessage.CompletedFocusInput()),
      Scene.type(Scene.label('Message'), 'Hello'),
      Scene.click(Scene.role('button', { name: 'Send' })),
      Scene.Command.expectExact(SendMessage({ text: 'Hello' })),
      Scene.expect(Scene.label('Message')).toHaveValue('Hello'),
      Scene.Command.resolve(
        SendMessage,
        Message.SucceededSendMessage({ text: 'Hello' }),
      ),
      Scene.expect(Scene.label('Message')).toHaveValue(''),
      Scene.Command.resolve(
        TimestampSentMessage,
        Message.TimestampedMessage({ text: 'Hello', zoned, isSent: true }),
      ),
      Scene.Subscription.emit(
        subscriptions.chatSocketMessages,
        Message.ReceivedMessage({ text: 'Echo' }),
      ),
      Scene.Command.resolve(
        TimestampReceivedMessage,
        Message.TimestampedMessage({ text: 'Echo', zoned, isSent: false }),
      ),
      Scene.expect(Scene.text('Hello')).toExist(),
      Scene.expect(Scene.text('Echo')).toExist(),
    ),
  ))

test('ordinary Layer composition also exposes the root contract without an implementation import in ChatRoom', async () => {
  await Effect.runPromise(
    Effect.gen(function* () {
      const room = yield* ChatRoomContract.get

      expect(
        room.init({ title: 'General', inputId: 'normal-layer-input' }).model
          .messageComposer.id,
      ).toBe('normal-layer-input')
    }).pipe(Effect.provide(ChatRoomLayer)),
  )
})
