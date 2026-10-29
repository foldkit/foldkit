import { Array } from 'effect'
import { Calendar } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'

import { type Model, Submission } from './model'
import { StepMenuBlock, StepTabsBlock } from './navigationComponents'
import {
  AttachmentsBlock,
  CoverLetterBlock,
  EducationBlock,
  PersonalInfoBlock,
  SkillsBlock,
  WorkHistoryBlock,
} from './step'

export const today = Calendar.make(2026, 4, 16)

export const initialModel: Model = {
  currentStep: 'PersonalInfo',
  personalInfo: PersonalInfoBlock.init(today).model,
  workHistory: WorkHistoryBlock.init(today, 'work-history-entry-1').model,
  education: EducationBlock.init(today, 'education-entry-1').model,
  skills: SkillsBlock.init('skills-entry-1').model,
  coverLetter: CoverLetterBlock.init().model,
  attachments: AttachmentsBlock.init().model,
  isPreviewVisible: false,
  submission: Submission.NotSubmitted(),
  stepMenu: StepMenuBlock.init({ id: 'step-menu' }).model,
  stepTabs: StepTabsBlock.init({ id: 'step-tabs' }).model,
  isSubmitAttempted: false,
}

export const completeModel: Model = modifyFields(initialModel, {
  personalInfo: personalInfo =>
    modifyFields(personalInfo, {
      firstName: () => Valid({ value: 'Jane' }),
      lastName: () => Valid({ value: 'Doe' }),
      email: () => Valid({ value: 'jane@example.com' }),
    }),
  workHistory: workHistory =>
    modifyFields(workHistory, {
      entries: Array.map(entry =>
        modifyFields(entry, {
          company: () => Valid({ value: 'Foldkit' }),
          title: () => Valid({ value: 'Engineer' }),
        }),
      ),
    }),
  education: education =>
    modifyFields(education, {
      entries: Array.map(entry =>
        modifyFields(entry, {
          school: () => Valid({ value: 'MIT' }),
          degree: () => Valid({ value: 'BS' }),
          fieldOfStudy: () => Valid({ value: 'CS' }),
        }),
      ),
    }),
  skills: skills =>
    modifyFields(skills, {
      entries: Array.map(entry =>
        modifyFields(entry, {
          name: () => Valid({ value: 'TypeScript' }),
        }),
      ),
    }),
})
