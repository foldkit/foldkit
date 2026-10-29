import { Effect, Schema } from 'effect'
import { Program, Runtime } from 'foldkit'

import { ApplicationBlock } from './application'
import { FixtureConfig } from './config'
import './style.css'

const program = Program.make({
  block: ApplicationBlock,
  container: document.getElementById('root'),
  Flags: FixtureConfig,
})

Runtime.run(program, {
  flags: Effect.suspend(() => {
    const parameters = new URLSearchParams(window.location.search)

    return Schema.decodeUnknownEffect(FixtureConfig)({
      scrollMode: parameters.get('scroll') ?? 'Ancestor',
      layout: parameters.get('layout') ?? 'Spacers',
      isDynamic: parameters.get('dynamic') === 'true',
      isShort: parameters.get('short') === 'true',
    }).pipe(Effect.orDie)
  }),
})
