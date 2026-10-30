import { Crypto, Effect, Layer } from 'effect'
import { Calendar, Program, Runtime } from 'foldkit'

import { Application, ApplicationLive, Flags } from './application'
import { ApplicationLayer } from './services'

const flags = Effect.gen(function* () {
  const crypto = yield* Crypto.Crypto

  const today = yield* Calendar.today.local
  const initialWorkHistoryEntryId = yield* Effect.orDie(crypto.randomUUIDv4)
  const initialEducationEntryId = yield* Effect.orDie(crypto.randomUUIDv4)
  const initialSkillsEntryId = yield* Effect.orDie(crypto.randomUUIDv4)

  return {
    today,
    initialWorkHistoryEntryId,
    initialEducationEntryId,
    initialSkillsEntryId,
  }
})

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(Layer.provide(ApplicationLayer)),
  Flags,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program, { flags: flags.pipe(Effect.provide(ApplicationLayer)) })
