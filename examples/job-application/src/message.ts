import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Step } from './domain'
import * as Attachments from './step/attachments'
import * as CoverLetter from './step/coverLetter'
import * as Education from './step/education'
import * as PersonalInfo from './step/personalInfo'
import * as Skills from './step/skills'
import * as WorkHistory from './step/workHistory'

// STEP SUBMODELS

export const GotPersonalInfoMessage = m('GotPersonalInfoMessage', {
  message: PersonalInfo.Message,
})
export const GotWorkHistoryMessage = m('GotWorkHistoryMessage', {
  message: WorkHistory.Message,
})
export const GotEducationMessage = m('GotEducationMessage', {
  message: Education.Message,
})
export const GotSkillsMessage = m('GotSkillsMessage', {
  message: Skills.Message,
})
export const GotCoverLetterMessage = m('GotCoverLetterMessage', {
  message: CoverLetter.Message,
})
export const GotAttachmentsMessage = m('GotAttachmentsMessage', {
  message: Attachments.Message,
})
export const GotStepMenuMessage = m('GotStepMenuMessage', {
  message: Ui.Menu.Message,
})

// NAVIGATION

export const NavigatedToStep = m('NavigatedToStep', { step: Step.Step })
export const ClickedNext = m('ClickedNext')
export const ClickedPrevious = m('ClickedPrevious')

// PREVIEW

export const ToggledPreview = m('ToggledPreview')

// SUBMISSION

export const SubmittedApplication = m('SubmittedApplication')
export const SucceededSubmitApplication = m('SucceededSubmitApplication')
export const FailedSubmitApplication = m('FailedSubmitApplication', {
  error: S.String,
})

// UNION

export const Message = S.Union([
  GotPersonalInfoMessage,
  GotWorkHistoryMessage,
  GotEducationMessage,
  GotSkillsMessage,
  GotCoverLetterMessage,
  GotAttachmentsMessage,
  GotStepMenuMessage,
  NavigatedToStep,
  ClickedNext,
  ClickedPrevious,
  ToggledPreview,
  SubmittedApplication,
  SucceededSubmitApplication,
  FailedSubmitApplication,
])
export type Message = typeof Message.Type
