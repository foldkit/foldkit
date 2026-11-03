import { Effect } from 'effect'
import * as Story from 'foldkit/story'
import { expect, expectTypeOf } from 'vitest'

import { it } from '@effect/vitest'

import * as Dialog from './dialog/public.js'
import * as VirtualList from './virtualList/public.js'

it.effect(
  'Dialog distinguishes the Model close transition from native cleanup completion',
  () =>
    Story.withBlock(Dialog.DialogBlock, dialog => {
      const opened = dialog.inMessageUpdate(
        dialog.init({ id: 'routing-proof' }).model,
        dialog.InMessage.RequestedOpen(),
      )
      const transitioned = dialog.inMessageUpdate(
        opened.model,
        dialog.InMessage.RequestedClose(),
      )
      const completed = dialog.update(
        transitioned.model,
        dialog.Message.CompletedCloseDialog(),
      )

      expect(transitioned.outMessage).toEqual(dialog.OutMessage.Closed())
      expect(completed.outMessage).toEqual(dialog.OutMessage.CompletedClose())
    }).pipe(Effect.provide(Dialog.layer)),
)

it.effect(
  'Dialog reports every completed native close, including after a reopen',
  () =>
    Story.withBlock(Dialog.DialogBlock, dialog => {
      const opened = dialog.inMessageUpdate(
        dialog.init({ id: 'routing-proof' }).model,
        dialog.InMessage.RequestedOpen(),
      )
      const transitioned = dialog.inMessageUpdate(
        opened.model,
        dialog.InMessage.RequestedClose(),
      )
      const reopened = dialog.inMessageUpdate(
        transitioned.model,
        dialog.InMessage.RequestedOpen(),
      )
      const lateCompletion = dialog.update(
        reopened.model,
        dialog.Message.CompletedCloseDialog(),
      )
      const repeatedCompletion = dialog.update(
        lateCompletion.model,
        dialog.Message.CompletedCloseDialog(),
      )

      expect(lateCompletion.model.isOpen).toBe(true)
      expect(lateCompletion.outMessage).toEqual(
        dialog.OutMessage.CompletedClose(),
      )
      expect(repeatedCompletion.outMessage).toEqual(
        dialog.OutMessage.CompletedClose(),
      )
    }).pipe(Effect.provide(Dialog.layer)),
)

it.effect(
  'VirtualList exposes the full observed scroll snapshot as an OutMessage',
  () =>
    Story.withBlock(VirtualList.makeBlock<string>(), virtualList => {
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
      const observed = virtualList.update(
        virtualList.init({ id: 'routing-proof', rowHeightPx: 40 }).model,
        virtualList.Message.ObservedContainerScroll(snapshot),
      )

      expect(observed.model.scrollTop).toBe(40)
      expect(observed.outMessage).toEqual(
        virtualList.OutMessage.ObservedContainerScroll(snapshot),
      )

      const applied = virtualList.update(
        observed.model,
        virtualList.Message.CompletedApplyScroll({
          version: observed.model.pendingScrollVersion,
          outcome: VirtualList.ApplyScrollOutcome.Applied(snapshot),
        }),
      )

      expect(applied.model.scrollTop).toBe(40)
      expect(applied.outMessage).toBeUndefined()

      const RefinedVirtualList = VirtualList.makeBlock<{ id: string }>()
      expectTypeOf(RefinedVirtualList.OutMessage).toEqualTypeOf(
        virtualList.OutMessage,
      )
    }).pipe(Effect.provide(VirtualList.layer)),
)
