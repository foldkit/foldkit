import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { ts } from 'foldkit/schema'

import { Step } from './domain'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './step'

// SUBMISSION

export const NotSubmitted = ts('NotSubmitted')
export const Submitting = ts('Submitting')
export const SubmitSuccess = ts('SubmitSuccess')
export const SubmitError = ts('SubmitError', { error: S.String })

export const Submission = S.Union(
  NotSubmitted,
  Submitting,
  SubmitSuccess,
  SubmitError,
)
export type Submission = typeof Submission.Type

// MODEL

export const Model = S.Struct({
  currentStep: Step.Step,
  personalInfo: PersonalInfo.Model,
  workHistory: WorkHistory.Model,
  education: Education.Model,
  skills: Skills.Model,
  coverLetter: CoverLetter.Model,
  attachments: Attachments.Model,
  isPreviewVisible: S.Boolean,
  submission: Submission,
  stepMenu: Ui.Menu.Model,
  hasAttemptedSubmit: S.Boolean,
})
export type Model = typeof Model.Type
