import { Option, pipe } from 'effect'
import { Calendar, Url } from 'foldkit'
import { expect, given, role, scene, selector, type } from 'foldkit/scene'
import { describe, test } from 'vitest'

import { Deployment } from '../../deployment'
import { init, update, view } from '../../main'

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

describe('newsletter', () => {
  test('the email field reflects input while the form uses native submission', () => {
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
  })
})
