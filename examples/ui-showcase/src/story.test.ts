import { Option } from 'effect'
import { Calendar } from 'foldkit'
import { Command, init, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import { ApplicationBlock, layer } from './index'
import { Message } from './message'

const application = { block: ApplicationBlock, layer }

const today = Calendar.make(2026, 4, 16)
const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('routing', () => {
    it.effect('the root URL resolves to Home', () =>
      story(
        application,
        init({ today }, urlOrThrow('http://localhost/')),
        message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
        model(model => {
          expect(model.route._tag).toBe('Home')
        }),
      ),
    )

    it.effect('/button resolves to Button', () =>
      story(
        application,
        init({ today }, urlOrThrow('http://localhost/')),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/button') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Button')
        }),
      ),
    )

    it.effect('/calendar resolves to Calendar', () =>
      story(
        application,
        init({ today }, urlOrThrow('http://localhost/')),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/calendar'),
          }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Calendar')
        }),
      ),
    )

    it.effect('/date-picker resolves to DatePicker', () =>
      story(
        application,
        init({ today }, urlOrThrow('http://localhost/')),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/date-picker'),
          }),
        ),
        model(model => {
          expect(model.route._tag).toBe('DatePicker')
        }),
      ),
    )

    it.effect('an unknown path resolves to NotFound', () =>
      story(
        application,
        init({ today }, urlOrThrow('http://localhost/')),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/unknown') }),
        ),
        model(model => {
          if (model.route._tag === 'NotFound') {
            expect(model.route.path).toBe('/unknown')
          } else {
            throw new Error('Expected NotFound')
          }
        }),
      ),
    )
  })

  describe('mobile menu', () => {
    it.effect('navigating to a new URL closes the mobile menu dialog', () =>
      story(
        application,
        init({ today }, urlOrThrow('http://localhost/')),
        message(Message.ClickedOpenMobileMenu()),
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/button') }),
        ),
        Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
        model(model => {
          expect(model.uiModel.mobileMenuDialog.isOpen).toBe(false)
        }),
      ),
    )
  })
})
