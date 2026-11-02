import { Option } from 'effect'
import { Block, Calendar } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'

import { describe, expect, it } from '@effect/vitest'
import { Dialog } from '@foldkit/ui'

import { Application, ApplicationLive } from './application'
import { Navigation } from './navigation'

const { Message } = Application

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

const args = {
  flags: { today: Calendar.make(2026, 4, 16) },
  url: urlOrThrow('http://localhost/'),
}

describe('update', () => {
  describe('routing', () => {
    it.effect('the root URL resolves to Home', () =>
      story(
        ApplicationLive,
        args,
        message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
        model(model => {
          expect(model.route._tag).toBe('Home')
        }),
      ),
    )

    it.effect('/button resolves to Button', () =>
      story(
        ApplicationLive,
        args,
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
        ApplicationLive,
        args,
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/calendar') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Calendar')
        }),
      ),
    )

    it.effect('/date-picker resolves to DatePicker', () =>
      story(
        ApplicationLive,
        args,
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
        ApplicationLive,
        args,
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
        ApplicationLive,
        args,
        message(
          Block.deliver(
            Navigation,
            'navigation',
            Navigation.Message.ClickedOpenMobileMenu(),
          ),
        ),
        Command.resolve(
          Dialog.test.ShowDialog,
          Dialog.Dialog.Message.SucceededShowDialog(),
        ),
        model(model => {
          expect(model.navigation.mobileMenuDialog.isOpen).toBe(true)
        }),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/button') }),
        ),
        Command.resolve(
          Dialog.test.CloseDialog,
          Dialog.Dialog.Message.CompletedCloseDialog(),
        ),
        model(model => {
          expect(model.navigation.mobileMenuDialog.isOpen).toBe(false)
        }),
      ),
    )
  })
})
