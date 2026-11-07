import { Array, Effect, Option } from 'effect'
import { Story } from 'foldkit'
import { Validating } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'
import { describe, expect } from 'vitest'

import { it } from '@effect/vitest'
import { FileDrop, Menu, Tabs } from '@foldkit/ui'

import {
  CoverLetterBlock,
  EducationBlock,
  PersonalInfoBlock,
  SkillsBlock,
  WorkHistoryBlock,
} from './blocks'
import { ResumeDropBinding } from './blocks/attachments/composition'
import { SubmitApplication } from './command'
import {
  AttachmentsBinding,
  CoverLetterBinding,
  EducationBinding,
  PersonalInfoBinding,
  SkillsBinding,
  StepMenuBinding,
  StepTabsBinding,
  WorkHistoryBinding,
} from './composition'
import { ApplicationBlock, layer } from './index'
import { Message } from './message'
import { Submission } from './model'
import { fixtureEffects, initialFlags } from './model.fixture'
import { StepMenuBlock, StepTabsBlock } from './navigationComponents'

const resolveFocusTab = Story.Command.resolve(
  Tabs.test.FocusTab,
  StepTabsBlock.Message.CompletedFocusTab(),
)

const resolveFocusMenuButton = Story.Command.resolve(
  Menu.test.FocusMenuButton,
  StepMenuBlock.Message.CompletedFocusMenuButton(),
)

describe('update', () => {
  describe('navigation', () => {
    it.effect('ClickedNext advances to the next step', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(initialFlags),
        Story.message(Message.ClickedNext()),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.currentStep).toBe('WorkHistory')
        }),
      ),
    )

    it.effect('ClickedPrevious goes back to the previous step', () =>
      Effect.gen(function* () {
        const initialModel = yield* fixtureEffects.initialModel

        return yield* Story.story(
          { block: ApplicationBlock, layer },
          Story.given(
            modifyFields(initialModel, { currentStep: () => 'Education' }),
          ),
          Story.message(Message.ClickedPrevious()),
          Story.model(model => {
            expect(model.currentStep).toBe('WorkHistory')
          }),
        )
      }),
    )

    it.effect('ClickedPrevious on the first step stays put', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(initialFlags),
        Story.message(Message.ClickedPrevious()),
        Story.model(model => {
          expect(model.currentStep).toBe('PersonalInfo')
        }),
      ),
    )

    it.effect('ClickedNext on the last step stays put', () =>
      Effect.gen(function* () {
        const initialModel = yield* fixtureEffects.initialModel

        return yield* Story.story(
          { block: ApplicationBlock, layer },
          Story.given(
            modifyFields(initialModel, { currentStep: () => 'Review' }),
          ),
          Story.message(Message.ClickedNext()),
          Story.model(model => {
            expect(model.currentStep).toBe('Review')
          }),
        )
      }),
    )

    it.effect('a generated Tabs Message selects the matching step', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(initialFlags),
        Story.messageIn(
          StepTabsBinding,
          StepTabsBlock.Message.SelectedTab({ index: 6, value: 'Review' }),
        ),
        Story.model(model => {
          expect(model.currentStep).toBe('Review')
        }),
        resolveFocusTab,
      ),
    )

    it.effect('a generated Menu Message selects the matching step', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(initialFlags),
        Story.messageIn(
          StepMenuBinding,
          StepMenuBlock.Message.Opened({
            maybeActiveItemIndex: Option.none(),
          }),
        ),
        Story.Command.resolve(
          Menu.test.FocusMenuItems,
          StepMenuBlock.Message.CompletedFocusMenuItems(),
        ),
        Story.messageIn(
          StepMenuBinding,
          StepMenuBlock.Message.SelectedItem({
            index: 5,
            item: 'Attachments',
          }),
        ),
        Story.model(model => {
          expect(model.currentStep).toBe('Attachments')
        }),
        resolveFocusMenuButton,
      ),
    )
  })

  describe('preview toggle', () => {
    it.effect('ToggledPreview flips visibility', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(initialFlags),
        Story.message(Message.ToggledPreview()),
        Story.model(model => {
          expect(model.isPreviewVisible).toBe(true)
        }),
        Story.message(Message.ToggledPreview()),
        Story.model(model => {
          expect(model.isPreviewVisible).toBe(false)
        }),
      ),
    )
  })

  describe('child folding', () => {
    it.effect('a generated PersonalInfo Message writes through', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(initialFlags),
        Story.messageIn(
          PersonalInfoBinding,
          PersonalInfoBlock.Message.UpdatedFirstName({ value: 'Jane' }),
        ),
        Story.model(model => {
          expect(model.personalInfo.firstName.value).toBe('Jane')
        }),
      ),
    )

    it.effect('a generated WorkHistory Message writes through', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(initialFlags),
        Story.messageIn(
          WorkHistoryBinding,
          WorkHistoryBlock.Message.CompletedGenerateWorkHistoryEntryId({
            entryId: 'test-work-1',
          }),
        ),
        Story.model(model => {
          expect(model.workHistory.entries).toHaveLength(2)
        }),
      ),
    )

    it.effect('a generated Education Message writes through', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(initialFlags),
        Story.messageIn(
          EducationBinding,
          EducationBlock.Message.CompletedGenerateEducationEntryId({
            entryId: 'test-edu-1',
          }),
        ),
        Story.model(model => {
          expect(model.education.entries).toHaveLength(2)
        }),
      ),
    )

    it.effect('a generated Skills Message writes through', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(initialFlags),
        Story.messageIn(
          SkillsBinding,
          SkillsBlock.Message.CompletedGenerateSkillsEntryId({
            entryId: 'test-skill-1',
          }),
        ),
        Story.model(model => {
          expect(model.skills.entries).toHaveLength(2)
        }),
      ),
    )

    it.effect('a generated CoverLetter Message writes through', () =>
      Story.story(
        { block: ApplicationBlock, layer },
        Story.init(initialFlags),
        Story.messageIn(
          CoverLetterBinding,
          CoverLetterBlock.Message.UpdatedContent({
            value: 'I love the Elm Architecture.',
          }),
        ),
        Story.model(model => {
          expect(model.coverLetter.content).toBe('I love the Elm Architecture.')
        }),
      ),
    )

    it.effect('a nested generated FileDrop Message writes through', () => {
      const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
        type: 'application/pdf',
      })

      return Story.story(
        { block: ApplicationBlock, layer },
        Story.init(initialFlags),
        Story.messageIn(
          [AttachmentsBinding, ResumeDropBinding],
          FileDrop.FileDropBlock.Message.DroppedFiles({ files: [resume] }),
        ),
        Story.model(model => {
          expect(model.attachments.maybeResume._tag).toBe('Some')
        }),
      )
    })
  })

  describe('submission', () => {
    it.effect(
      'ClickedSubmit on a complete application transitions to Submitting and fires command',
      () =>
        Effect.gen(function* () {
          const completeModel = yield* fixtureEffects.completeModel

          return yield* Story.story(
            { block: ApplicationBlock, layer },
            Story.given(
              modifyFields(completeModel, { currentStep: () => 'Review' }),
            ),
            Story.message(Message.ClickedSubmit()),
            Story.Command.expectExact(SubmitApplication),
            Story.Command.resolve(
              SubmitApplication,
              Message.SucceededSubmitApplication(),
            ),
            Story.model(model => {
              expect(model.submission._tag).toBe('SubmitSuccess')
              expect(model.isSubmitAttempted).toBe(true)
            }),
          )
        }),
    )

    it.effect(
      'ClickedSubmit reveals errors through every section and nested entry without submitting',
      () =>
        Effect.gen(function* () {
          const initialModel = yield* fixtureEffects.initialModel
          const secondWorkHistoryEntry =
            yield* fixtureEffects.secondWorkHistoryEntry
          const secondEducationEntry =
            yield* fixtureEffects.secondEducationEntry
          const secondSkillsEntry = yield* fixtureEffects.secondSkillsEntry
          const modelWithMultipleEntries = modifyFields(initialModel, {
            currentStep: () => 'Review',
            workHistory: modifyFields({
              entries: Array.append(secondWorkHistoryEntry),
            }),
            education: modifyFields({
              entries: Array.append(secondEducationEntry),
            }),
            skills: modifyFields({
              entries: Array.append(secondSkillsEntry),
            }),
          })

          return yield* Story.story(
            { block: ApplicationBlock, layer },
            Story.given(modelWithMultipleEntries),
            Story.message(Message.ClickedSubmit()),
            Story.Command.expectNone(),
            Story.model(model => {
              expect(model.submission._tag).toBe('NotSubmitted')
              expect(model.isSubmitAttempted).toBe(true)
              expect(model.personalInfo.firstName._tag).toBe('Invalid')
              expect(model.personalInfo.lastName._tag).toBe('Invalid')
              expect(model.personalInfo.email._tag).toBe('Invalid')
              expect(
                Array.every(
                  model.education.entries,
                  entry =>
                    entry.school._tag === 'Invalid' &&
                    entry.degree._tag === 'Invalid' &&
                    entry.fieldOfStudy._tag === 'Invalid',
                ),
              ).toBe(true)
              expect(
                Array.every(
                  model.workHistory.entries,
                  entry =>
                    entry.company._tag === 'Invalid' &&
                    entry.title._tag === 'Invalid',
                ),
              ).toBe(true)
              expect(
                Array.every(
                  model.skills.entries,
                  entry => entry.name._tag === 'Invalid',
                ),
              ).toBe(true)
            }),
          )
        }),
    )

    it.effect('ClickedSubmit with pending validation does not submit', () =>
      Effect.gen(function* () {
        const completeModel = yield* fixtureEffects.completeModel

        return yield* Story.story(
          { block: ApplicationBlock, layer },
          Story.given(
            modifyFields(completeModel, {
              currentStep: () => 'Review',
              personalInfo: modifyFields({
                email: () => Validating({ value: 'jane@example.com' }),
              }),
            }),
          ),
          Story.message(Message.ClickedSubmit()),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.submission._tag).toBe('NotSubmitted')
            expect(model.isSubmitAttempted).toBe(true)
            expect(model.personalInfo.email._tag).toBe('Validating')
          }),
        )
      }),
    )

    it.effect(
      'ClickedSubmit preserves Valid fields rather than re-running validation',
      () =>
        Effect.gen(function* () {
          const completeModel = yield* fixtureEffects.completeModel

          return yield* Story.story(
            { block: ApplicationBlock, layer },
            Story.given(
              modifyFields(completeModel, { currentStep: () => 'Review' }),
            ),
            Story.message(Message.ClickedSubmit()),
            Story.Command.resolve(
              SubmitApplication,
              Message.SucceededSubmitApplication(),
            ),
            Story.model(model => {
              expect(model.personalInfo.firstName._tag).toBe('Valid')
              expect(model.personalInfo.firstName.value).toBe('Jane')
            }),
          )
        }),
    )

    it.effect('successful submission shows success', () =>
      Effect.gen(function* () {
        const initialModel = yield* fixtureEffects.initialModel

        return yield* Story.story(
          { block: ApplicationBlock, layer },
          Story.given(
            modifyFields(initialModel, {
              currentStep: () => 'Review',
              submission: () => Submission.Submitting(),
            }),
          ),
          Story.message(Message.SucceededSubmitApplication()),
          Story.model(model => {
            expect(model.submission._tag).toBe('SubmitSuccess')
          }),
        )
      }),
    )

    it.effect('failed submission shows error', () =>
      Effect.gen(function* () {
        const initialModel = yield* fixtureEffects.initialModel

        return yield* Story.story(
          { block: ApplicationBlock, layer },
          Story.given(
            modifyFields(initialModel, {
              currentStep: () => 'Review',
              submission: () => Submission.Submitting(),
            }),
          ),
          Story.message(
            Message.FailedSubmitApplication({ error: 'Server down' }),
          ),
          Story.model(model => {
            expect(model.submission._tag).toBe('SubmitError')
          }),
        )
      }),
    )
  })
})
