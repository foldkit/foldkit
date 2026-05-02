import { Effect, Schema as S } from 'effect'
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
})
type Flags = typeof Flags.Type

const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const today = yield* Calendar.today.local
  return { today }
})

// INIT

const init: Runtime.ProgramInit<Model, Message, Flags> = ({ today }) => [
  {
    currentStep: 'PersonalInfo',
    personalInfo: PersonalInfo.init(today),
    workHistory: WorkHistory.init(today),
    education: Education.init(today),
    skills: Skills.init(),
    coverLetter: CoverLetter.init(),
    attachments: Attachments.init(),
    isPreviewVisible: false,
    submission: NotSubmitted(),
    stepMenu: Ui.Menu.init({ id: 'step-menu' }),
    hasAttemptedSubmit: false,
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
