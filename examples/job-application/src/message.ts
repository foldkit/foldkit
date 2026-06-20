import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

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
  message: Menu.Message,
})
export const GotStepTabsMessage = m('GotStepTabsMessage', {
  message: Tabs.Message,
})

// NAVIGATION

export const NavigatedToStep = m('NavigatedToStep', { step: Step.Step })
export const ClickedNext = m('ClickedNext')
export const ClickedPrevious = m('ClickedPrevious')

// PREVIEW

export const ToggledPreview = m('ToggledPreview')

// SUBMISSION

export const ClickedSubmit = m('ClickedSubmit')
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
  GotStepTabsMessage,
  NavigatedToStep,
  ClickedNext,
  ClickedPrevious,
  ToggledPreview,
  ClickedSubmit,
  SucceededSubmitApplication,
  FailedSubmitApplication,
])
export type Message = typeof Message.Type
