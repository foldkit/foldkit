import { Array } from 'effect'
import { Calendar } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'

import { Menu, Tabs } from '@foldkit/ui'

import { type Model, Submission } from './model'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './step'

export const today = Calendar.make(2026, 4, 16)

export const initialModel: Model = {
  currentStep: 'PersonalInfo',
  personalInfo: PersonalInfo.init(today),
  workHistory: WorkHistory.init(today, 'work-history-entry-1'),
  education: Education.init(today, 'education-entry-1'),
  skills: Skills.init('skills-entry-1'),
  coverLetter: CoverLetter.init(),
  attachments: Attachments.init(),
  isPreviewVisible: false,
  submission: Submission.NotSubmitted(),
  stepMenu: Menu.init({ id: 'step-menu' }),
  stepTabs: Tabs.init({ id: 'step-tabs' }),
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
