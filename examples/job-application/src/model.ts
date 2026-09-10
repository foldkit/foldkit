import { Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

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

// SUBMISSION

export const Submission = defineTaggedUnion({
  NotSubmitted: {},
  Submitting: {},
  SubmitSuccess: {},
  SubmitError: { error: Schema.String },
})
export type Submission = typeof Submission.Type

// MODEL

export const Model = Schema.Struct({
  currentStep: Step.Step,
  personalInfo: PersonalInfo.Model,
  workHistory: WorkHistory.Model,
  education: Education.Model,
  skills: Skills.Model,
  coverLetter: CoverLetter.Model,
  attachments: Attachments.Model,
  isPreviewVisible: Schema.Boolean,
  submission: Submission,
  stepMenu: Menu.Model,
  stepTabs: Tabs.Model,
  isSubmitAttempted: Schema.Boolean,
})
export type Model = typeof Model.Type
