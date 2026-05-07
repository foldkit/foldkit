import { Effect, Random, Schema as S } from 'effect'
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

// FLAGS

const Flags = S.Struct({
  today: Calendar.CalendarDate,
  initialWorkHistoryEntryId: S.String,
  initialEducationEntryId: S.String,
  initialSkillsEntryId: S.String,
})
type Flags = typeof Flags.Type

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const today = yield* Calendar.today.local
  const initialWorkHistoryEntryId = yield* Random.nextUUIDv4
  const initialEducationEntryId = yield* Random.nextUUIDv4
  const initialSkillsEntryId = yield* Random.nextUUIDv4
  return {
    today,
    initialWorkHistoryEntryId,
    initialEducationEntryId,
    initialSkillsEntryId,
  }
})

// INIT

const init: Runtime.ProgramInit<Model, Message, Flags> = ({
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

// RUN

const program = Runtime.makeProgram({
  Model,
  Flags,
  flags,
  init,
  update,
  view,
  container: document.getElementById('root')!,
  devTools: {
    Message,
  },
})

Runtime.run(program)
