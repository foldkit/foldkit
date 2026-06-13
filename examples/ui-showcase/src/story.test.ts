import { Option } from 'effect'
import { Calendar, Story, Ui } from 'foldkit'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { ChangedUrl, GotUiMessage, HomeRoute, type Model, update } from './main'
import { uiInit } from './ui/init'
import { GotMobileMenuDialogMessage } from './ui/message'

const today = Calendar.make(2026, 4, 16)
const [initialUiModel] = uiInit(today)

const initialModel: Model = {
  route: HomeRoute(),
  uiModel: initialUiModel,
}

const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('routing', () => {
    test('the root URL resolves to Home', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(ChangedUrl({ url: urlOrThrow('http://localhost/') })),
        Story.model(model => {
          expect(model.route._tag).toBe('Home')
        }),
      )
    })

    test('/button resolves to Button', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/button') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Button')
        }),
      )
    })

    test('/calendar resolves to Calendar', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/calendar') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('Calendar')
        }),
      )
    })

    test('/date-picker resolves to DatePicker', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/date-picker') }),
        ),
        Story.model(model => {
          expect(model.route._tag).toBe('DatePicker')
        }),
      )
    })

    test('an unknown path resolves to NotFound', () => {
      Story.story(
        update,
        Story.with(initialModel),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/unknown') }),
        ),
        Story.model(model => {
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
      const modelWithOpenMenu: Model = {
        ...initialModel,
        uiModel: {
          ...initialModel.uiModel,
          mobileMenuDialog: Ui.Dialog.init({
            id: 'mobile-menu',
            isOpen: true,
          }),
        },
      }

      Story.story(
        update,
        Story.with(modelWithOpenMenu),
        Story.message(
          ChangedUrl({ url: urlOrThrow('http://localhost/button') }),
        ),
        Story.Command.resolve(
          Ui.Dialog.CloseDialog,
          Ui.Dialog.CompletedCloseDialog(),
          dialogMessage =>
            GotUiMessage({
              message: GotMobileMenuDialogMessage({ message: dialogMessage }),
            }),
        ),
        Story.model(model => {
          expect(model.uiModel.mobileMenuDialog.isOpen).toBe(false)
        }),
      )
    })
  })
})
