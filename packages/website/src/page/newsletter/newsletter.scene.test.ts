import { Option, pipe } from 'effect'
import { Calendar, Scene, Url } from 'foldkit'
import { describe } from 'vitest'

import { it } from '@effect/vitest'

import { Deployment } from '../../deployment'
import { ApplicationBlock, layer } from '../../index'
import { resolveApiData, resolveBrowserStartup } from '../../scene.fixture'

const application = { block: ApplicationBlock, layer }

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
  it.effect(
    'the email field reflects input while the form uses native submission',
    () => {
      const emailField = Scene.role('textbox', { name: 'Email address' })

      return Scene.scene(
        application,
        Scene.init(flags, url),
        resolveBrowserStartup(flags),
        resolveApiData,
        Scene.expect(Scene.selector('form')).toHaveAttr(
          'action',
          'https://buttondown.com/api/emails/embed-subscribe/foldkit',
        ),
        Scene.expect(Scene.selector('form')).toHaveAttr('method', 'post'),
        Scene.expect(Scene.selector('form')).toHaveAttr(
          'target',
          'popupwindow',
        ),
        Scene.expect(emailField).toHaveValue(''),
        Scene.type(emailField, 'alice@example.com'),
        Scene.expect(emailField).toHaveValue('alice@example.com'),
      )
    },
  )
})
