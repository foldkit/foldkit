import { Array, DateTime, Effect } from 'effect'
import { Update } from 'foldkit'
import type { Html } from 'foldkit/html'

import { SendMessage, TimestampReceivedMessage } from './chatRoom/command'
import { TimestampSentMessage } from './chatRoom/command'
import type { ChatRoomViewBuilder } from './chatRoom/composition'
import {
  makeBinding,
  makeBlock,
  makeComposition,
  makeOutMessageFold,
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
} from './chatRoom/definition'
import { EffectsLayer } from './chatRoom/layer'
import { managedResources } from './chatRoom/managedResource'
import { Message } from './chatRoom/message'
import { ChatMessage, ConnectionState } from './chatRoom/model'
import { subscriptions } from './chatRoom/subscription'
import { MessageComposerContract } from './messageComposer/definition'

const messagesView = (
  messages: ReadonlyArray<ChatMessage>,
  h: ChatRoomViewBuilder,
): Html =>
  Array.match(messages, {
    onEmpty: () => h.p([h.Class('empty')], ['No messages yet']),
    onNonEmpty: messages =>
      h.ol(
        [h.Class('messages'), h.AriaLabel('Messages')],
        Array.map(messages, message =>
          h.keyed('li')(
            message.id,
            [h.Class(message.isSent ? 'sent' : 'received')],
            [
              h.p([], [message.text]),
              h.time(
                [],
                [
                  DateTime.format(message.zoned, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                ],
              ),
            ],
          ),
        ),
      ),
  })

export const LocalChatRoomBlock = makeBlock(
  Effect.gen(function* () {
    const MessageComposerBinding = makeBinding(MessageComposerContract, {
      field: 'messageComposer',
      init: { contextToArgs: ({ inputId }) => [inputId] },
    }).withOutMessagePolicy({
      fold: makeOutMessageFold(MessageComposerContract, {
        Submitted: ({ text }) =>
          makeCommandsStep(() => [SendMessage({ text })]),
      }),
    })
    const ChatRoomComposition = makeComposition({
      bindings: [MessageComposerBinding],
    })
    const messageComposer = yield* MessageComposerBinding
    const recordSentMessage = (text: string) =>
      Update.combineSteps([
        MessageComposerBinding.requestClear(),
        makeCommandsStep(() => [TimestampSentMessage({ text })]),
      ])
    const init = ChatRoomComposition.makeInit(({ title, inputId }) => ({
      model: {
        title,
        connection: ConnectionState.Disconnected(),
        messages: [],
        nextMessageId: 0,
      },
      childInitContext: { inputId },
    }))
    const update = ChatRoomComposition.makeUpdate({
      ClickedConnect: makeFieldsStep(() => ({
        connection: () => ConnectionState.Connecting(),
      })),
      RequestedDisconnect: makeFieldsStep(() => ({
        connection: () => ConnectionState.Disconnected(),
      })),
      ConnectedChatSocket: makeFieldsStep(() => ({
        connection: () => ConnectionState.Connected(),
      })),
      DisconnectedChatSocket: makeFieldsStep(() => ({
        connection: () => ConnectionState.Disconnected(),
        messages: () => [],
      })),
      ReleasedChatSocket: makeNoopStep(),
      FailedConnectChatSocket: makeFieldsStep.fromMessage(({ error }) => ({
        connection: () => ConnectionState.Error({ error }),
      })),
      FailedChatSocket: makeFieldsStep.fromMessage(({ error }) => ({
        connection: () => ConnectionState.Error({ error }),
      })),
      FailedSendMessage: makeFieldsStep.fromMessage(({ error }) => ({
        connection: () => ConnectionState.Error({ error }),
      })),
      SucceededSendMessage: makeStep.fromMessage(({ text }) =>
        recordSentMessage(text),
      ),
      ReceivedMessage: makeCommandsStep.fromMessage(({ text }) => [
        TimestampReceivedMessage({ text }),
      ]),
      TimestampedMessage: makeFieldsStep((model, { text, zoned, isSent }) => ({
        messages: Array.append(
          ChatMessage.make({ id: model.nextMessageId, text, zoned, isSent }),
        ),
        nextMessageId: id => id + 1,
      })),
    })
    const view = ChatRoomComposition.makeView((model, h) =>
      h.section(
        [h.Class('room'), h.AriaLabel(model.title)],
        [
          h.header(
            [],
            [
              h.h2([], [model.title]),
              h.p([h.Role('status')], [model.connection._tag]),
            ],
          ),
          h.div([h.Class('conversation')], [messagesView(model.messages, h)]),
          ConnectionState.match(model.connection, {
            Disconnected: () =>
              h.button([h.OnClick(Message.ClickedConnect())], ['Connect']),
            Connecting: () => h.p([], ['Connecting…']),
            Connected: () =>
              h.div(
                [],
                [
                  h.block(
                    MessageComposerBinding.embedView({
                      slotId: model.messageComposer.id,
                      model: model.messageComposer,
                    }),
                  ),
                  h.button(
                    [h.OnClick(Message.RequestedDisconnect())],
                    ['Disconnect'],
                  ),
                ],
              ),
            Error: ({ error }) =>
              h.div(
                [],
                [
                  h.p([h.Role('alert')], [error]),
                  h.button(
                    [h.OnClick(Message.ClickedConnect())],
                    ['Reconnect'],
                  ),
                ],
              ),
          }),
        ],
      ),
    )
    return {
      children: [messageComposer],
      init,
      update,
      view,
      subscriptions,
      managedResources,
      EffectsLayer,
    }
  }),
)

export const InlineChatRoomBlock = makeBlock(
  Effect.gen(function* () {
    const ChatRoomComposition = makeComposition({
      bindings: [
        makeBinding(MessageComposerContract, {
          field: 'messageComposer',
          init: { contextToArgs: ({ inputId }) => [inputId] },
        }).withOutMessagePolicy({
          fold: makeOutMessageFold(MessageComposerContract, {
            Submitted: ({ text }) =>
              makeCommandsStep(() => [SendMessage({ text })]),
          }),
        }),
      ],
    })
    const MessageComposerBinding = Array.headNonEmpty(
      ChatRoomComposition.bindings,
    )
    const recordSentMessage = (text: string) =>
      Update.combineSteps([
        MessageComposerBinding.requestClear(),
        makeCommandsStep(() => [TimestampSentMessage({ text })]),
      ])
    return {
      children: [yield* MessageComposerBinding],
      init: ChatRoomComposition.makeInit(({ title, inputId }) => ({
        model: {
          title,
          connection: ConnectionState.Disconnected(),
          messages: [],
          nextMessageId: 0,
        },
        childInitContext: { inputId },
      })),
      update: ChatRoomComposition.makeUpdate({
        ClickedConnect: makeFieldsStep(() => ({
          connection: () => ConnectionState.Connecting(),
        })),
        RequestedDisconnect: makeFieldsStep(() => ({
          connection: () => ConnectionState.Disconnected(),
        })),
        ConnectedChatSocket: makeFieldsStep(() => ({
          connection: () => ConnectionState.Connected(),
        })),
        DisconnectedChatSocket: makeFieldsStep(() => ({
          connection: () => ConnectionState.Disconnected(),
          messages: () => [],
        })),
        ReleasedChatSocket: makeNoopStep(),
        FailedConnectChatSocket: makeFieldsStep.fromMessage(({ error }) => ({
          connection: () => ConnectionState.Error({ error }),
        })),
        FailedChatSocket: makeFieldsStep.fromMessage(({ error }) => ({
          connection: () => ConnectionState.Error({ error }),
        })),
        FailedSendMessage: makeFieldsStep.fromMessage(({ error }) => ({
          connection: () => ConnectionState.Error({ error }),
        })),
        SucceededSendMessage: makeStep.fromMessage(({ text }) =>
          recordSentMessage(text),
        ),
        ReceivedMessage: makeCommandsStep.fromMessage(({ text }) => [
          TimestampReceivedMessage({ text }),
        ]),
        TimestampedMessage: makeFieldsStep(
          (model, { text, zoned, isSent }) => ({
            messages: Array.append(
              ChatMessage.make({
                id: model.nextMessageId,
                text,
                zoned,
                isSent,
              }),
            ),
            nextMessageId: id => id + 1,
          }),
        ),
      }),
      view: ChatRoomComposition.makeView((model, h) =>
        h.section(
          [h.Class('room'), h.AriaLabel(model.title)],
          [
            h.header(
              [],
              [
                h.h2([], [model.title]),
                h.p([h.Role('status')], [model.connection._tag]),
              ],
            ),
            h.div([h.Class('conversation')], [messagesView(model.messages, h)]),
            ConnectionState.match(model.connection, {
              Disconnected: () =>
                h.button([h.OnClick(Message.ClickedConnect())], ['Connect']),
              Connecting: () => h.p([], ['Connecting…']),
              Connected: () =>
                h.div(
                  [],
                  [
                    h.block(
                      MessageComposerBinding.embedView({
                        slotId: model.messageComposer.id,
                        model: model.messageComposer,
                      }),
                    ),
                    h.button(
                      [h.OnClick(Message.RequestedDisconnect())],
                      ['Disconnect'],
                    ),
                  ],
                ),
              Error: ({ error }) =>
                h.div(
                  [],
                  [
                    h.p([h.Role('alert')], [error]),
                    h.button(
                      [h.OnClick(Message.ClickedConnect())],
                      ['Reconnect'],
                    ),
                  ],
                ),
            }),
          ],
        ),
      ),
      subscriptions,
      managedResources,
      EffectsLayer,
    }
  }),
)
