import { Effect, Schema } from 'effect'
import { SecureRandom } from 'effect/crypto'
import { Calendar } from 'foldkit'

export const Flags = Schema.Struct({
  today: Calendar.CalendarDate,
  initialWorkHistoryEntryId: Schema.String,
  initialEducationEntryId: Schema.String,
  initialSkillsEntryId: Schema.String,
})
export type Flags = typeof Flags.Type

export const flags = Effect.gen(function* () {
  const secureRandom = yield* SecureRandom.SecureRandom

  const today = yield* Calendar.today.local
  const initialWorkHistoryEntryId = yield* secureRandom.uuidV4()
  const initialEducationEntryId = yield* secureRandom.uuidV4()
  const initialSkillsEntryId = yield* secureRandom.uuidV4()

  return {
    today,
    initialWorkHistoryEntryId,
    initialEducationEntryId,
    initialSkillsEntryId,
  }
})
