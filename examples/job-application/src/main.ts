import { Effect, Schema } from 'effect'
import { SecureRandom } from 'effect/crypto'
import { Calendar, Runtime } from 'foldkit'

import { BrowserCrypto } from '@effect/platform-browser'
import { Menu, Tabs } from '@foldkit/ui'

import { Message } from './message'
import { Model, Submission } from './model'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './step'
import { update } from './update'
import { view } from './view/view'

// FLAGS

export const Flags = Schema.Struct({
  today: Calendar.CalendarDate,
  initialWorkHistoryEntryId: Schema.String,
  initialEducationEntryId: Schema.String,
  initialSkillsEntryId: Schema.String,
})
export type Flags = typeof Flags.Type

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const today = yield* Calendar.today.local
  const secureRandom = yield* SecureRandom.SecureRandom
  const initialWorkHistoryEntryId = yield* secureRandom.uuidV4()
  const initialEducationEntryId = yield* secureRandom.uuidV4()
  const initialSkillsEntryId = yield* secureRandom.uuidV4()
  return {
    today,
    initialWorkHistoryEntryId,
    initialEducationEntryId,
    initialSkillsEntryId,
  }
}).pipe(Effect.provide(BrowserCrypto.layerSecureRandom))

// INIT

export const init: Runtime.ApplicationInit<Model, Message, Flags> = ({
  today,
  initialWorkHistoryEntryId,
  initialEducationEntryId,
  initialSkillsEntryId,
}) => ({
  model: {
    currentStep: 'PersonalInfo',
    personalInfo: PersonalInfo.init(today),
    workHistory: WorkHistory.init(today, initialWorkHistoryEntryId),
    education: Education.init(today, initialEducationEntryId),
    skills: Skills.init(initialSkillsEntryId),
    coverLetter: CoverLetter.init(),
    attachments: Attachments.init(),
    isPreviewVisible: false,
    submission: Submission.NotSubmitted(),
    stepMenu: Menu.init({ id: 'step-menu' }),
    stepTabs: Tabs.init({ id: 'step-tabs' }),
    isSubmitAttempted: false,
  },
})

export { Message, Model, update, view }
