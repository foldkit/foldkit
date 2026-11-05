import { Effect } from 'effect'
import { Calendar } from 'foldkit'
import { Command, inMessage, init, model, story } from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import { UiBlock } from './block'
import { InMessage } from './inMessage'
import { layer } from './layer'

it.effect(
  'parent requests open and close the mobile menu through its Dialog',
  () =>
    story(
      UiBlock,
      init(Calendar.make(2026, 4, 16)),
      inMessage(InMessage.RequestedOpenMobileMenu()),
      Command.expectHas(Dialog.test.ShowDialog),
      Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      model(model => expect(model.mobileMenuDialog.isOpen).toBe(true)),
      inMessage(InMessage.RequestedCloseMobileMenu()),
      Command.expectHas(Dialog.test.CloseDialog),
      Command.resolve(
        Dialog.test.CloseDialog,
        Dialog.DialogBlock.Message.CompletedCloseDialog(),
      ),
      model(model => expect(model.mobileMenuDialog.isOpen).toBe(false)),
    ).pipe(Effect.provide(layer)),
)
