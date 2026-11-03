import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './blocks'
import { Step } from './domain'
import { StepMenuBlock, StepTabsBlock } from './navigationComponents'

export const Submission = defineTaggedUnion({
  NotSubmitted: {},
  Submitting: {},
  SubmitSuccess: {},
  SubmitError: { error: Schema.String },
})
export type Submission = typeof Submission.Type

export const Model = Schema.Struct({
  currentStep: Step.Step,
  personalInfo: PersonalInfo.PersonalInfoBlock.Model,
  workHistory: WorkHistory.WorkHistoryBlock.Model,
  education: Education.EducationBlock.Model,
  skills: Skills.SkillsBlock.Model,
  coverLetter: CoverLetter.CoverLetterBlock.Model,
  attachments: Attachments.AttachmentsBlock.Model,
  isPreviewVisible: Schema.Boolean,
  submission: Submission,
  stepMenu: StepMenuBlock.Model,
  stepTabs: StepTabsBlock.Model,
  isSubmitAttempted: Schema.Boolean,
})
export type Model = typeof Model.Type
