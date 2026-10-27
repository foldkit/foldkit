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
  flags: Effect.sync(() => {
    const parameters = new URLSearchParams(window.location.search)

    return Schema.decodeUnknownSync(FixtureConfig)({
      scrollMode: parameters.get('scroll') ?? 'Ancestor',
      layout: parameters.get('layout') ?? 'Spacers',
      isDynamic: parameters.get('dynamic') === 'true',
      isShort: parameters.get('short') === 'true',
    })
  }),
})
