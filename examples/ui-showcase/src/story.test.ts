import { Option } from 'effect'
import { Calendar } from 'foldkit'
import { Command, given, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { Dialog, DialogBlock } from '@foldkit/ui'

import { Message } from './message'
import { type Model } from './model'
import { ApplicationRoute } from './route'
import { init } from './ui/init'
import { update } from './update'

const today = Calendar.make(2026, 4, 16)
const init_ = init(today)

const initialModel: Model = {
  route: ApplicationRoute.Home(),
  uiModel: init_.model,
}

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('routing', () => {
    test('the root URL resolves to Home', () => {
      story(
        update,
        given(initialModel),
        message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
        model(model => {
          expect(model.route._tag).toBe('Home')
        }),
      )
    })

    test('/button resolves to Button', () => {
      story(
        update,
        given(initialModel),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/button') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Button')
        }),
      )
    })

    test('/calendar resolves to Calendar', () => {
      story(
        update,
        given(initialModel),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/calendar') }),
        ),
        model(model => {
          expect(model.route._tag).toBe('Calendar')
        }),
      )
    })

    test('/date-picker resolves to DatePicker', () => {
      story(
        update,
        given(initialModel),
        message(
          Message.ChangedUrl({
            url: urlOrThrow('http://localhost/date-picker'),
          }),
        ),
        model(model => {
          expect(model.route._tag).toBe('DatePicker')
        }),
      )
    })

    test('an unknown path resolves to NotFound', () => {
      story(
        update,
        given(initialModel),
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
      )
    })
  })

  describe('mobile menu', () => {
    test('navigating to a new URL closes the mobile menu dialog', () => {
      story(
        update,
        given(initialModel),
        message(Message.ClickedOpenMobileMenu()),
        Command.resolve(
          Dialog.test.ShowDialog,
          DialogBlock.Message.SucceededShowDialog(),
        ),
        message(
          Message.ChangedUrl({ url: urlOrThrow('http://localhost/button') }),
        ),
        Command.resolve(
          Dialog.test.CloseDialog,
          DialogBlock.Message.CompletedCloseDialog(),
        ),
        model(model => {
          expect(model.uiModel.mobileMenuDialog.isOpen).toBe(false)
        }),
      )
    })
  })
})
