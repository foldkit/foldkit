import { Effect } from 'effect'
import { Calendar, Story } from 'foldkit'
import { expect } from 'vitest'

import { it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import { UiBlock } from './block'
import { InMessage } from './inMessage'
import { layer } from './layer'

it.effect(
  'parent requests open and close the mobile menu through its Dialog',
  () =>
    Story.story(
      UiBlock,
      Story.init(Calendar.make(2026, 4, 16)),
      Story.inMessage(InMessage.RequestedOpenMobileMenu()),
      Story.Command.expectHas(Dialog.test.ShowDialog),
      Story.Command.resolve(
        Dialog.test.ShowDialog,
        Dialog.DialogBlock.Message.SucceededShowDialog(),
      ),
      Story.model(model => expect(model.mobileMenuDialog.isOpen).toBe(true)),
      Story.inMessage(InMessage.RequestedCloseMobileMenu()),
      Story.Command.expectHas(Dialog.test.CloseDialog),
      Story.Command.resolve(
        Dialog.test.CloseDialog,
        Dialog.DialogBlock.Message.CompletedCloseDialog(),
      ),
      Story.model(model => expect(model.mobileMenuDialog.isOpen).toBe(false)),
    ).pipe(Effect.provide(layer)),
)
