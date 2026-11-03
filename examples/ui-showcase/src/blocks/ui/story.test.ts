import { Effect } from 'effect'
import { Calendar } from 'foldkit'
import { Command, inMessage, init, model, story } from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'
import { DialogBlock, test as DialogTest } from '@foldkit/ui/dialog'

import { layer } from './block'
import { UiBlock } from './definition'
import { InMessage } from './inMessage'

it.effect(
  'parent requests open and close the mobile menu through its Dialog',
  () =>
    story(
      UiBlock,
      init(Calendar.make(2026, 4, 16)),
      inMessage(InMessage.RequestedOpenMobileMenu()),
      Command.expectHas(DialogTest.ShowDialog),
      Command.resolve(
        DialogTest.ShowDialog,
        DialogBlock.Message.SucceededShowDialog(),
      ),
      model(model => expect(model.mobileMenuDialog.isOpen).toBe(true)),
      inMessage(InMessage.RequestedCloseMobileMenu()),
      Command.expectHas(DialogTest.CloseDialog),
      Command.resolve(
        DialogTest.CloseDialog,
        DialogBlock.Message.CompletedCloseDialog(),
      ),
      model(model => expect(model.mobileMenuDialog.isOpen).toBe(false)),
    ).pipe(Effect.provide(layer)),
)
