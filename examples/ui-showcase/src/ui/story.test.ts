import { Effect } from 'effect'
import { Calendar } from 'foldkit'
import { Command, inMessage, init, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { Dialog, DialogBlock } from '@foldkit/ui'

import { layer } from './block'
import { UiBlock } from './definition'
import { InMessage } from './inMessage'

test('parent requests open and close the mobile menu through its Dialog', () =>
  Effect.runPromise(
    story(
      UiBlock,
      init(Calendar.make(2026, 4, 16)),
      inMessage(InMessage.RequestedOpenMobileMenu()),
      Command.expectHas(Dialog.test.ShowDialog),
      Command.resolve(
        Dialog.test.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      model(model => expect(model.mobileMenuDialog.isOpen).toBe(true)),
      inMessage(InMessage.RequestedCloseMobileMenu()),
      Command.expectHas(Dialog.test.CloseDialog),
      Command.resolve(
        Dialog.test.CloseDialog,
        DialogBlock.Message.CompletedCloseDialog(),
      ),
      model(model => expect(model.mobileMenuDialog.isOpen).toBe(false)),
    ).pipe(Effect.provide(layer)),
  ))
