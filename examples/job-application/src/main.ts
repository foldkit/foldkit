import { Crypto, Effect, Schema as S } from 'effect'
import { Calendar, Runtime } from 'foldkit'

import { BrowserCrypto } from '@effect/platform-browser'
import { Menu, Tabs } from '@foldkit/ui'

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
  const crypto = yield* Crypto.Crypto
  const initialWorkHistoryEntryId = yield* Effect.orDie(crypto.randomUUIDv4)
  const initialEducationEntryId = yield* Effect.orDie(crypto.randomUUIDv4)
  const initialSkillsEntryId = yield* Effect.orDie(crypto.randomUUIDv4)
  return {
    today,
    initialWorkHistoryEntryId,
    initialEducationEntryId,
    initialSkillsEntryId,
  }
}).pipe(Effect.provide(BrowserCrypto.layer))

// INIT

export const init: Runtime.ApplicationInit<Model, Message, Flags> = ({
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
    stepMenu: Menu.init({ id: 'step-menu' }),
    stepTabs: Tabs.init({ id: 'step-tabs' }),
    isSubmitAttempted: false,
  },
  [],
]

export { Message, Model, update, view }
