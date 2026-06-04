import { BrowserCrypto } from '@effect/platform-browser'
import { Crypto, Effect, Schema as S } from 'effect'
import { Calendar, Runtime, Ui } from 'foldkit'

import { Message } from './message'
import { Model, NotSubmitted } from './model'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './step'
import { update } from './update'
import { view } from './view'

const randomUUIDv4: Effect.Effect<string> = Effect.gen(function* () {
  const crypto = yield* Crypto.Crypto
  return yield* crypto.randomUUIDv4
}).pipe(Effect.provide(BrowserCrypto.layer), Effect.orDie)

// FLAGS

export const Flags = S.Struct({
  today: Calendar.CalendarDate,
  initialWorkHistoryEntryId: S.String,
  initialEducationEntryId: S.String,
  initialSkillsEntryId: S.String,
})
export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const today = yield* Calendar.today.local
  const initialWorkHistoryEntryId = yield* randomUUIDv4
  const initialEducationEntryId = yield* randomUUIDv4
  const initialSkillsEntryId = yield* randomUUIDv4
  return {
    today,
    initialWorkHistoryEntryId,
    initialEducationEntryId,
    initialSkillsEntryId,
  }
})

// INIT

export const init: Runtime.ProgramInit<Model, Message, Flags> = ({
  today,
  initialWorkHistoryEntryId,
  initialEducationEntryId,
  initialSkillsEntryId,
}) => [
  {
    currentStep: 'PersonalInfo',
    personalInfo: PersonalInfo.init(today),
    workHistory: WorkHistory.init(today, initialWorkHistoryEntryId),
    education: Education.init(today, initialEducationEntryId),
    skills: Skills.init(initialSkillsEntryId),
    coverLetter: CoverLetter.init(),
    attachments: Attachments.init(),
    isPreviewVisible: false,
    submission: NotSubmitted(),
    stepMenu: Ui.Menu.init({ id: 'step-menu' }),
  },
  [],
]

export { Message, Model, update, view }
