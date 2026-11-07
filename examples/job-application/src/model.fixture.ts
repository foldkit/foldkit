import { Array, Effect } from 'effect'
import { Calendar, Story } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'

import { EducationEntry } from './blocks/education/blocks'
import { SkillsEntry } from './blocks/skills/blocks'
import { WorkHistoryEntry } from './blocks/workHistory/blocks'
import { Flags } from './flags'
import { ApplicationBlock, layer } from './index'
import type { Model } from './model'

export const today = Calendar.make(2026, 4, 16)
export const initialFlags = Flags.make({
  today,
  initialWorkHistoryEntryId: 'work-history-entry-1',
  initialEducationEntryId: 'education-entry-1',
  initialSkillsEntryId: 'skills-entry-1',
})

const initialModel = Story.story(
  { block: ApplicationBlock, layer },
  Story.init(initialFlags),
)

const completeModel = Effect.map(initialModel, initialModel => {
  const model: Model = modifyFields(initialModel, {
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

  return model
})

const secondWorkHistoryEntry = Story.story(
  {
    block: WorkHistoryEntry.WorkHistoryEntryBlock,
    layer: WorkHistoryEntry.layer,
  },
  Story.init('work-history-entry-2', today),
)
const secondEducationEntry = Story.story(
  {
    block: EducationEntry.EducationEntryBlock,
    layer: EducationEntry.layer,
  },
  Story.init('education-entry-2'),
)
const secondSkillsEntry = Story.story(
  {
    block: SkillsEntry.SkillsEntryBlock,
    layer: SkillsEntry.layer,
  },
  Story.init('skills-entry-2'),
)

export const fixtureEffects = {
  initialModel,
  completeModel,
  secondWorkHistoryEntry,
  secondEducationEntry,
  secondSkillsEntry,
}
