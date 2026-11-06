import { Option } from 'effect'
import { Calendar, Story } from 'foldkit'
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
      Story.story(
        application,
        Story.init({ today }, urlOrThrow('http://localhost/')),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Home')
        }),
      ),
    )

    it.effect('/button resolves to Button', () =>
      Story.story(
        application,
        Story.init({ today }, urlOrThrow('http://localhost/')),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/button') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Button')
        }),
      ),
    )

    it.effect('/calendar resolves to Calendar', () =>
      Story.story(
        application,
        Story.init({ today }, urlOrThrow('http://localhost/')),
        Story.message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/calendar'),
          }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Calendar')
        }),
      ),
    )

    it.effect('/date-picker resolves to DatePicker', () =>
      Story.story(
        application,
        Story.init({ today }, urlOrThrow('http://localhost/')),
        Story.message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/date-picker'),
          }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('DatePicker')
        }),
      ),
    )

    it.effect('an unknown path resolves to NotFound', () =>
      Story.story(
        application,
        Story.init({ today }, urlOrThrow('http://localhost/')),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/unknown') }),
        ),
        Story.model(model => {
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
      Story.story(
        application,
        Story.init({ today }, urlOrThrow('http://localhost/')),
        Story.message(Message.ClickedOpenMobileMenu()),
        Story.Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.DialogBlock.Message.SucceededShowDialog(),
        ),
        Story.message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/button') }),
        ),
        Story.Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.DialogBlock.Message.CompletedCloseDialog(),
        ),
        Story.model(model => {
          expect(model.uiModel.mobileMenuDialog.isOpen).toBe(false)
        }),
      ),
    )
  })
})
