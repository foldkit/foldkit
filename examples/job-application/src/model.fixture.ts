import { Array, Effect, Layer } from 'effect'
import { Calendar } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { withBlock } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { test as baseTest } from 'vitest'

import { ApplicationBlock } from './block'
import { EducationEntry } from './blocks/education/blocks'
import { SkillsEntry } from './blocks/skills/blocks'
import { WorkHistoryEntry } from './blocks/workHistory/blocks'
import { Flags } from './flags'
import { type Model } from './model'

export const today = Calendar.make(2026, 4, 16)
export const initialFlags = Flags.make({
  today,
  initialWorkHistoryEntryId: 'work-history-entry-1',
  initialEducationEntryId: 'education-entry-1',
  initialSkillsEntryId: 'skills-entry-1',
})

const models = withBlock(ApplicationBlock, application =>
  Effect.gen(function* () {
    const workHistoryEntry = yield* WorkHistoryEntry.WorkHistoryEntryBlock.get
    const educationEntry = yield* EducationEntry.EducationEntryBlock.get
    const skillsEntry = yield* SkillsEntry.SkillsEntryBlock.get
    const initialModel = application.init(initialFlags).model

    const completeModel: Model = modifyFields(initialModel, {
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

    return {
      initialModel,
      completeModel,
      secondWorkHistoryEntry: workHistoryEntry.init(
        'work-history-entry-2',
        today,
      ).model,
      secondEducationEntry: educationEntry.init('education-entry-2').model,
      secondSkillsEntry: skillsEntry.init('skills-entry-2').model,
    }
  }),
).pipe(
  Effect.provide(
    Layer.mergeAll(
      WorkHistoryEntry.layer,
      EducationEntry.layer,
      SkillsEntry.layer,
    ),
  ),
)

export const test = baseTest.extend<{ models: Effect.Success<typeof models> }>({
  models: async ({}, use) => {
    await Effect.runPromise(
      models.pipe(Effect.flatMap(models => Effect.promise(() => use(models)))),
    )
  },
})
