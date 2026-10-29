import { Crypto, Effect, Schema } from 'effect'
import { Calendar } from 'foldkit'

export const Flags = Schema.Struct({
  today: Calendar.CalendarDate,
  initialWorkHistoryEntryId: Schema.String,
  initialEducationEntryId: Schema.String,
  initialSkillsEntryId: Schema.String,
})
export type Flags = typeof Flags.Type

export const flags = Effect.gen(function* () {
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
