import { expect, expectTypeOf, test } from 'vitest'

import * as Dialog from './dialog/block.js'
import * as VirtualList from './virtualList/virtualList.js'

test('Dialog distinguishes the Model close transition from native cleanup completion', () => {
  const opened = Dialog.update(
    Dialog.init({ id: 'routing-proof' }).model,
    Dialog.Message.RequestedOpen(),
  )
  const transitioned = Dialog.update(
    opened.model,
    Dialog.Message.RequestedClose(),
  )
  const completed = Dialog.update(
    transitioned.model,
    Dialog.Message.CompletedCloseDialog(),
  )

  expect(transitioned.outMessage).toEqual(Dialog.OutMessage.Closed())
  expect(completed.outMessage).toEqual(Dialog.OutMessage.CompletedClose())
})

test('Dialog reports every completed native close, including after a reopen', () => {
  const opened = Dialog.update(
    Dialog.init({ id: 'routing-proof' }).model,
    Dialog.Message.RequestedOpen(),
  )
  const transitioned = Dialog.update(
    opened.model,
    Dialog.Message.RequestedClose(),
  )
  const reopened = Dialog.update(
    transitioned.model,
    Dialog.Message.RequestedOpen(),
  )
  const lateCompletion = Dialog.update(
    reopened.model,
    Dialog.Message.CompletedCloseDialog(),
  )
  const repeatedCompletion = Dialog.update(
    lateCompletion.model,
    Dialog.Message.CompletedCloseDialog(),
  )

  expect(lateCompletion.model.isOpen).toBe(true)
  expect(lateCompletion.outMessage).toEqual(Dialog.OutMessage.CompletedClose())
  expect(repeatedCompletion.outMessage).toEqual(
    Dialog.OutMessage.CompletedClose(),
  )
})

test('VirtualList exposes the full observed scroll snapshot as an OutMessage', () => {
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
  const observed = VirtualList.update(
    VirtualList.init({ id: 'routing-proof', rowHeightPx: 40 }).model,
    VirtualList.Message.ObservedContainerScroll(snapshot),
  )

  expect(observed.model.scrollTop).toBe(40)
  expect(observed.outMessage).toEqual(
    VirtualList.OutMessage.ObservedContainerScroll(snapshot),
  )

  const applied = VirtualList.update(
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
