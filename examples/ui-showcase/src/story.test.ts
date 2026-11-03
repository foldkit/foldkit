import { Effect, Option } from 'effect'
import { Calendar } from 'foldkit'
import { Command, init, message, model, story } from 'foldkit/story'
import { fromString } from 'foldkit/url'
import { describe, expect, test } from 'vitest'

import { DialogBlock, test as DialogTest } from '@foldkit/ui/dialog'

import { ApplicationBlock } from './block'
import { Message } from './message'

const today = Calendar.make(2026, 4, 16)
const urlOrThrow = (raw: string) =>
  Option.getOrThrowWith(
    fromString(raw),
    () => new Error(`Failed to parse url: ${raw}`),
  )

describe('update', () => {
  describe('routing', () => {
    test('the root URL resolves to Home', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          init({ today }, urlOrThrow('http://localhost/')),
          message(Message.ChangedUrl({ url: urlOrThrow('http://localhost/') })),
          model(model => {
            expect(model.route._tag).toBe('Home')
          }),
        ),
      )
    })

    test('/button resolves to Button', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          init({ today }, urlOrThrow('http://localhost/')),
          message(
            Message.ChangedUrl({ url: urlOrThrow('http://localhost/button') }),
          ),
          model(model => {
            expect(model.route._tag).toBe('Button')
          }),
        ),
      )
    })

    test('/calendar resolves to Calendar', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('/date-picker resolves to DatePicker', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('an unknown path resolves to NotFound', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
  })

  describe('mobile menu', () => {
    test('navigating to a new URL closes the mobile menu dialog', async () => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          init({ today }, urlOrThrow('http://localhost/')),
          message(Message.ClickedOpenMobileMenu()),
          Command.resolve(
            DialogTest.ShowDialog,
            DialogBlock.Message.SucceededShowDialog(),
          ),
          message(
            Message.ChangedUrl({ url: urlOrThrow('http://localhost/button') }),
          ),
          Command.resolve(
            DialogTest.CloseDialog,
            DialogBlock.Message.CompletedCloseDialog(),
          ),
          model(model => {
            expect(model.uiModel.mobileMenuDialog.isOpen).toBe(false)
          }),
        ),
      )
    })
  })
})
