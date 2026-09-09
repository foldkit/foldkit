import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Menu, Tabs } from '@foldkit/ui'

import { Step } from './domain'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './step'

// STEP SUBMODELS

// NAVIGATION

// PREVIEW

// SUBMISSION

// UNION

export const Message = defineMessageUnion({
  GotPersonalInfoMessage: { message: PersonalInfo.Message },
  GotWorkHistoryMessage: { message: WorkHistory.Message },
  GotEducationMessage: { message: Education.Message },
  GotSkillsMessage: { message: Skills.Message },
  GotCoverLetterMessage: { message: CoverLetter.Message },
  GotAttachmentsMessage: { message: Attachments.Message },
  GotStepMenuMessage: { message: Menu.Message },
  GotStepTabsMessage: { message: Tabs.Message },
  NavigatedToStep: { step: Step.Step },
  ClickedNext: {},
  ClickedPrevious: {},
  ToggledPreview: {},
  ClickedSubmit: {},
  SucceededSubmitApplication: {},
  FailedSubmitApplication: { error: Schema.String },
})

export type Message = typeof Message.Type
