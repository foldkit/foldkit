import { Array, Effect } from 'effect'
import { Calendar, Story } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'
import { test as baseTest } from 'vitest'

import { makeMethods } from '@effect/vitest'

import { EducationEntry } from './blocks/education/blocks'
import { SkillsEntry } from './blocks/skills/blocks'
import { WorkHistoryEntry } from './blocks/workHistory/blocks'
import { Flags } from './flags'
import { ApplicationBlock, layer } from './index'
import { type Model } from './model'

export const today = Calendar.make(2026, 4, 16)
export const initialFlags = Flags.make({
  today,
  initialWorkHistoryEntryId: 'work-history-entry-1',
  initialEducationEntryId: 'education-entry-1',
  initialSkillsEntryId: 'skills-entry-1',
})

const models = Story.withBlock(
  { block: ApplicationBlock, layer },
  application =>
    Effect.gen(function* () {
      const secondWorkHistoryEntry = yield* Story.withBlock(
        {
          block: WorkHistoryEntry.WorkHistoryEntryBlock,
          layer: WorkHistoryEntry.layer,
        },
        entry => entry.init('work-history-entry-2', today).model,
      )
      const secondEducationEntry = yield* Story.withBlock(
        {
          block: EducationEntry.EducationEntryBlock,
          layer: EducationEntry.layer,
        },
        entry => entry.init('education-entry-2').model,
      )
      const secondSkillsEntry = yield* Story.withBlock(
        { block: SkillsEntry.SkillsEntryBlock, layer: SkillsEntry.layer },
        entry => entry.init('skills-entry-2').model,
      )
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
        secondWorkHistoryEntry,
        secondEducationEntry,
        secondSkillsEntry,
      }
    }),
)

export const it = makeMethods(
  baseTest.extend<{ models: Effect.Success<typeof models> }>({
    models: async ({}, use) => {
      await Effect.runPromise(
        models.pipe(
          Effect.flatMap(models => Effect.promise(() => use(models))),
        ),
      )
    },
  }),
)
