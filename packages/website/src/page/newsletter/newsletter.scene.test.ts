import { Effect } from 'effect'
import { Option, pipe } from 'effect'
import { Calendar, Url } from 'foldkit'
import { expect, given, role, scene, selector, type } from 'foldkit/scene'
import { type TestBlock, withBlock } from 'foldkit/story'
import { describe, test } from 'vitest'

import { ApplicationBlock } from '../../block'
import { Deployment } from '../../deployment'

const url = pipe(
  Url.fromString('https://foldkit.dev/newsletter'),
  Option.getOrThrow,
)

const flags = {
  currentYear: 2026,
  today: Calendar.make(2026, 8, 30),
  deployment: Deployment.Production(),
  maybeApiData: Option.none(),
  maybeExampleSources: Option.none(),
}

const makeFixture = (block: TestBlock<typeof ApplicationBlock>) => {
  const init = block.init
  const update = block.update
  const view = block.view

  return { block, init, update, view }
}

describe('newsletter', () => {
  test('the email field reflects input while the form uses native submission', async () => {
    await Effect.runPromise(
      withBlock(ApplicationBlock, executable => {
        const { init, update, view } = makeFixture(executable)

        const emailField = role('textbox', { name: 'Email address' })

        scene(
          { update, view },
          given(init(flags, url).model),
          expect(selector('form')).toHaveAttr(
            'action',
            'https://buttondown.com/api/emails/embed-subscribe/foldkit',
          ),
          expect(selector('form')).toHaveAttr('method', 'post'),
          expect(selector('form')).toHaveAttr('target', 'popupwindow'),
          expect(emailField).toHaveValue(''),
          type(emailField, 'alice@example.com'),
          expect(emailField).toHaveValue('alice@example.com'),
        )
      }),
    )
  })
})
