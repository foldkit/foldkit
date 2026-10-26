import { Array, Option, Tuple, pipe } from 'effect'
import { Update } from 'foldkit'

import { ScrollTarget } from '@foldkit/ui/virtualList'

import { UiDefinition, makeFieldsStep, makeStep } from './definition'
import { ChatVirtualListBlock } from './demo/components'
import {
  type VirtualListChatMessage,
  VirtualListChatStartProximity,
} from './domain/domain'
import { Model } from './model'

const VIRTUAL_LIST_CHAT_START_THRESHOLD_PX = 48
const VIRTUAL_LIST_CHAT_HISTORY_BATCH_SIZE = 8

const olderVirtualListChatMessages = (model: typeof Model.Type) => {
  const firstId = pipe(
    model.virtualListChatMessages,
    Array.head,
    Option.match({
      onNone: () => model.virtualListChatNextId,
      onSome: message => message.id,
    }),
  )
  const olderMessages = Array.makeBy(
    VIRTUAL_LIST_CHAT_HISTORY_BATCH_SIZE,
    index => {
      const id = firstId - VIRTUAL_LIST_CHAT_HISTORY_BATCH_SIZE + index
      return {
        id,
        body: `Older message ${id} loaded above the viewport.`,
        isExpanded: id % 3 === 0,
      }
    },
  )

  return [...olderMessages, ...model.virtualListChatMessages]
}

export const VirtualListChatDemoBinding = UiDefinition.makeBinding(
  ChatVirtualListBlock,
  {
    field: 'virtualListChatDemo',
    init: {
      contextToArgs: () =>
        Tuple.make({
          id: 'virtual-list-chat-demo',
          rowHeightPx: 64,
          initialScroll: { target: ScrollTarget.End() },
          followEnd: { thresholdPx: 8 },
        }),
    },
  },
)

const foldVirtualListChatOutMessage = UiDefinition.makeOutMessageFold(
  ChatVirtualListBlock,
  {
    ObservedContainerScroll: ({ scrollTop }) =>
      makeStep(model => {
        const isNearStart = scrollTop <= VIRTUAL_LIST_CHAT_START_THRESHOLD_PX
        const nextVirtualListChatStartProximity = isNearStart
          ? VirtualListChatStartProximity.Near()
          : VirtualListChatStartProximity.Away()
        const updateStartProximityStep = makeFieldsStep(() => ({
          virtualListChatStartProximity: () =>
            nextVirtualListChatStartProximity,
        }))

        if (
          !isNearStart ||
          model.virtualListChatStartProximity._tag === 'Near'
        ) {
          return updateStartProximityStep
        }

        const nextMessages = olderVirtualListChatMessages(model)
        const updateMessagesStep = makeFieldsStep(() => ({
          virtualListChatMessages: () => nextMessages,
        }))

        return Update.combineSteps([
          updateStartProximityStep,
          updateMessagesStep,
          VirtualListChatDemoBinding.informItemsChanged(
            Array.map(nextMessages, message => globalThis.String(message.id)),
          ),
        ])
      }),
  },
)

export const VirtualListChatDemoBindingWithOutMessagePolicy =
  VirtualListChatDemoBinding.withOutMessagePolicy({
    fold: foldVirtualListChatOutMessage,
  })

export const updateVirtualListChatMessagesStep = (
  nextMessages: ReadonlyArray<typeof VirtualListChatMessage.Type>,
  nextId?: number,
) =>
  makeStep(model => {
    const nextVirtualListChatNextId =
      nextId === undefined ? model.virtualListChatNextId : nextId
    const updateMessagesStep = makeFieldsStep(() => ({
      virtualListChatMessages: () => nextMessages,
      virtualListChatNextId: () => nextVirtualListChatNextId,
    }))

    return Update.combineSteps([
      updateMessagesStep,
      VirtualListChatDemoBinding.informItemsChanged(
        Array.map(nextMessages, message => globalThis.String(message.id)),
      ),
    ])
  })

export const prependVirtualListChatMessagesStep = makeStep(model =>
  updateVirtualListChatMessagesStep(olderVirtualListChatMessages(model)),
)
