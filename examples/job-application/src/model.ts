import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

import { Step } from './domain'
import { StepMenuBlock, StepTabsBlock } from './navigationComponents'
import * as Attachments from './step/attachments'
import * as CoverLetter from './step/coverLetter'
import * as Education from './step/education'
import * as PersonalInfo from './step/personalInfo'
import * as Skills from './step/skills'
import * as WorkHistory from './step/workHistory'

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
