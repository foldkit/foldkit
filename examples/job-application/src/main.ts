import { Crypto, Effect, Layer, Schema } from 'effect'
import { Calendar } from 'foldkit'

import * as UI from '@foldkit/ui'
import { Menu, Tabs } from '@foldkit/ui'

import { SubmitApplication } from './command'
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

export const flags: Effect.Effect<Flags, never, Crypto.Crypto> = Effect.gen(
  function* () {
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
  },
)

// INIT

export const init = ({
  today,
  initialWorkHistoryEntryId,
  initialEducationEntryId,
  initialSkillsEntryId,
}: Flags) => ({
  model: Model.make({
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
  }),
})

export const EffectsLayer = Layer.mergeAll(
  UI.EffectsLayer,
  SubmitApplication.layer,
  PersonalInfo.EffectsLayer,
  WorkHistory.EffectsLayer,
  Education.EffectsLayer,
  Skills.EffectsLayer,
)

export { Message, Model, update, view }

export const mounts = UI.mounts
