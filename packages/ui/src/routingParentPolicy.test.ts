import type { Result } from 'foldkit/block'
import * as Story from 'foldkit/story'
import { expect, expectTypeOf } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Dialog from './dialog/block.js'
import * as VirtualList from './virtualList/virtualList.js'

const tagOf = (message: Readonly<{ _tag: string }>): string => message._tag

const dialogArgs = { id: 'routing-proof' }

describe('Dialog close OutMessages', () => {
  it.effect(
    'distinguishes the Model close transition from native cleanup completion',
    () =>
      Story.story(
        Dialog.DialogLive,
        dialogArgs,
        Story.message(Dialog.Message.RequestedOpen()),
        Story.Command.resolve(
          Dialog.ShowDialog,
          Dialog.Message.SucceededShowDialog(),
        ),
        Story.message(Dialog.Message.RequestedClose()),
        Story.expectOutMessage(Dialog.OutMessage.Closed()),
        Story.Command.resolve(
          Dialog.CloseDialog,
          Dialog.Message.CompletedCloseDialog(),
        ),
        Story.expectOutMessage(Dialog.OutMessage.CompletedClose()),
      ),
  )

  it.effect(
    'reports every completed native close, including after a reopen',
    () =>
      Story.story(
        Dialog.DialogLive,
        dialogArgs,
        Story.message(Dialog.Message.RequestedOpen()),
        Story.Command.resolve(
          Dialog.ShowDialog,
          Dialog.Message.SucceededShowDialog(),
        ),
        Story.message(Dialog.Message.RequestedClose()),
        Story.message(Dialog.Message.RequestedOpen()),
        Story.Command.resolve(
          Dialog.CloseDialog,
          Dialog.Message.CompletedCloseDialog(),
        ),
        Story.expectOutMessage(Dialog.OutMessage.CompletedClose()),
        Story.model(model => {
          expect(model.isOpen).toBe(true)
        }),
        Story.message(Dialog.Message.CompletedCloseDialog()),
        Story.expectOutMessage(Dialog.OutMessage.CompletedClose()),
        Story.Command.resolve(
          Dialog.ShowDialog,
          Dialog.Message.SucceededShowDialog(),
        ),
      ),
  )
})

type VirtualListUpdateResult = Result<
  VirtualList.Model,
  unknown,
  ReturnType<typeof VirtualList.ApplyScroll>
>

const updateVirtualList = (
  model: VirtualList.Model,
  message: VirtualList.Message,
): VirtualListUpdateResult => {
  const handler: (
    model: VirtualList.Model,
    message: VirtualList.Message,
  ) => VirtualListUpdateResult = Reflect.get(VirtualList.update, tagOf(message))
  return handler(model, message)
}

describe('VirtualList scroll OutMessages', () => {
  it('exposes the full observed scroll snapshot as an OutMessage', () => {
    const snapshot = {
      scrollTop: 40,
      scrollHeight: 2_000,
      containerHeight: 400,
      anchor: VirtualList.ObservedAnchor.Row({
        key: '12',
        index: 12,
        viewportOffset: 4,
      }),
    }
    const observed = updateVirtualList(
      VirtualList.initialModel({ id: 'routing-proof', rowHeightPx: 40 }),
      VirtualList.Message.ObservedContainerScroll(snapshot),
    )

    expect(observed.model.scrollTop).toBe(40)
    expect(observed.outMessage).toEqual(
      VirtualList.OutMessage.ObservedContainerScroll(snapshot),
    )

    const applied = updateVirtualList(
      observed.model,
      VirtualList.Message.CompletedApplyScroll({
        version: observed.model.pendingScrollVersion,
        outcome: VirtualList.ApplyScrollOutcome.Applied(snapshot),
      }),
    )

    expect(applied.model.scrollTop).toBe(40)
    expect(applied.outMessage).toBeUndefined()

    const RefinedVirtualList = VirtualList.makeBlock<{ id: string }>()
    expectTypeOf(RefinedVirtualList.OutMessage).toEqualTypeOf(
      VirtualList.OutMessage,
    )
  })
})
