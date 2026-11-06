import { Array, Option } from 'effect'
import { Story } from 'foldkit'
import { Validating } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'
import { toParentMessageFor } from 'foldkit/test'
import { describe, expect } from 'vitest'

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
import { it } from './model.fixture'
import { StepMenuBlock, StepTabsBlock } from './navigationComponents'

type PersonalInfoMessage = typeof PersonalInfoBlock.Message.Type
type WorkHistoryMessage = typeof WorkHistoryBlock.Message.Type
type EducationMessage = typeof EducationBlock.Message.Type
type SkillsMessage = typeof SkillsBlock.Message.Type
type CoverLetterMessage = typeof CoverLetterBlock.Message.Type
type StepMenuMessage = typeof StepMenuBlock.Message.Type
type StepTabsMessage = typeof StepTabsBlock.Message.Type

const personalInfoMessage = (message: PersonalInfoMessage) =>
  Story.messageIn(PersonalInfoBinding, message)

const workHistoryMessage = (message: WorkHistoryMessage) =>
  Story.messageIn(WorkHistoryBinding, message)

const educationMessage = (message: EducationMessage) =>
  Story.messageIn(EducationBinding, message)

const skillsMessage = (message: SkillsMessage) =>
  Story.messageIn(SkillsBinding, message)

const coverLetterMessage = (message: CoverLetterMessage) =>
  Story.messageIn(CoverLetterBinding, message)

const stepMenuMessage = (message: StepMenuMessage) =>
  Story.messageIn(StepMenuBinding, message)

const stepTabsMessage = (message: StepTabsMessage) =>
  Story.messageIn(StepTabsBinding, message)

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
    it.effect(
      'ClickedNext advances to the next step',
      ({ models: { initialModel } }) =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          Story.message(Message.ClickedNext()),
          Story.Command.expectNone(),
          Story.model(model => {
            expect(model.currentStep).toBe('WorkHistory')
          }),
        ),
    )

    it.effect(
      'ClickedPrevious goes back to the previous step',
      ({ models: { initialModel } }) =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(
            modifyFields(initialModel, { currentStep: () => 'Education' }),
          ),
          Story.message(Message.ClickedPrevious()),
          Story.model(model => {
            expect(model.currentStep).toBe('WorkHistory')
          }),
        ),
    )

    it.effect(
      'ClickedPrevious on the first step stays put',
      ({ models: { initialModel } }) =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          Story.message(Message.ClickedPrevious()),
          Story.model(model => {
            expect(model.currentStep).toBe('PersonalInfo')
          }),
        ),
    )

    it.effect(
      'ClickedNext on the last step stays put',
      ({ models: { initialModel } }) =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(
            modifyFields(initialModel, { currentStep: () => 'Review' }),
          ),
          Story.message(Message.ClickedNext()),
          Story.model(model => {
            expect(model.currentStep).toBe('Review')
          }),
        ),
    )

    it.effect(
      'a generated Tabs Message selects the matching step',
      ({ models: { initialModel } }) =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          stepTabsMessage(
            StepTabsBlock.Message.SelectedTab({ index: 6, value: 'Review' }),
          ),
          Story.model(model => {
            expect(model.currentStep).toBe('Review')
          }),
          resolveFocusTab,
        ),
    )

    it.effect(
      'a generated Menu Message selects the matching step',
      ({ models: { initialModel } }) =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          stepMenuMessage(
            StepMenuBlock.Message.Opened({
              maybeActiveItemIndex: Option.none(),
            }),
          ),
          Story.Command.resolve(
            Menu.test.FocusMenuItems,
            StepMenuBlock.Message.CompletedFocusMenuItems(),
          ),
          stepMenuMessage(
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
    it.effect(
      'ToggledPreview flips visibility',
      ({ models: { initialModel } }) =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
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
    it.effect(
      'a generated PersonalInfo Message writes through',
      ({ models: { initialModel } }) =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          personalInfoMessage(
            PersonalInfoBlock.Message.UpdatedFirstName({ value: 'Jane' }),
          ),
          Story.model(model => {
            expect(model.personalInfo.firstName.value).toBe('Jane')
          }),
        ),
    )

    it.effect(
      'a generated WorkHistory Message writes through',
      ({ models: { initialModel } }) =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          workHistoryMessage(
            WorkHistoryBlock.Message.CompletedGenerateWorkHistoryEntryId({
              entryId: 'test-work-1',
            }),
          ),
          Story.model(model => {
            expect(model.workHistory.entries).toHaveLength(2)
          }),
        ),
    )

    it.effect(
      'a generated Education Message writes through',
      ({ models: { initialModel } }) =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          educationMessage(
            EducationBlock.Message.CompletedGenerateEducationEntryId({
              entryId: 'test-edu-1',
            }),
          ),
          Story.model(model => {
            expect(model.education.entries).toHaveLength(2)
          }),
        ),
    )

    it.effect(
      'a generated Skills Message writes through',
      ({ models: { initialModel } }) =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          skillsMessage(
            SkillsBlock.Message.CompletedGenerateSkillsEntryId({
              entryId: 'test-skill-1',
            }),
          ),
          Story.model(model => {
            expect(model.skills.entries).toHaveLength(2)
          }),
        ),
    )

    it.effect(
      'a generated CoverLetter Message writes through',
      ({ models: { initialModel } }) =>
        Story.story(
          { block: ApplicationBlock, layer },
          Story.given(initialModel),
          coverLetterMessage(
            CoverLetterBlock.Message.UpdatedContent({
              value: 'I love the Elm Architecture.',
            }),
          ),
          Story.model(model => {
            expect(model.coverLetter.content).toBe(
              'I love the Elm Architecture.',
            )
          }),
        ),
    )

    it.effect(
      'a nested generated FileDrop Message writes through',
      ({ models: { initialModel } }) => {
        const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
          type: 'application/pdf',
        })

        return Story.withBlock(
          { block: ApplicationBlock, layer },
          application => {
            const toApplicationMessage = toParentMessageFor(application)
            const toAttachmentsMessage = toParentMessageFor(
              application,
              AttachmentsBinding,
            )

            Story.story(
              application.update,
              Story.given(initialModel),
              Story.message(
                toApplicationMessage(
                  AttachmentsBinding,
                  toAttachmentsMessage(
                    ResumeDropBinding,
                    FileDrop.FileDropBlock.Message.DroppedFiles({
                      files: [resume],
                    }),
                  ),
                ),
              ),
              Story.model(model => {
                expect(model.attachments.maybeResume._tag).toBe('Some')
              }),
            )
          },
        )
      },
    )
  })

  describe('submission', () => {
    it.effect(
      'ClickedSubmit on a complete application transitions to Submitting and fires command',
      ({ models: { completeModel } }) =>
        Story.story(
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
        ),
    )

    it.effect(
      'ClickedSubmit reveals errors through every section and nested entry without submitting',
      ({
        models: {
          initialModel,
          secondWorkHistoryEntry,
          secondEducationEntry,
          secondSkillsEntry,
        },
      }) => {
        const modelWithMultipleEntries = modifyFields(initialModel, {
          currentStep: () => 'Review',
          workHistory: workHistory =>
            modifyFields(workHistory, {
              entries: Array.append(secondWorkHistoryEntry),
            }),
          education: education =>
            modifyFields(education, {
              entries: Array.append(secondEducationEntry),
            }),
          skills: skills =>
            modifyFields(skills, {
              entries: Array.append(secondSkillsEntry),
            }),
        })

        return Story.story(
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
      },
    )

    it.effect(
      'ClickedSubmit with pending validation does not submit',
      ({ models: { completeModel } }) =>
        Story.story(
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
        ),
    )

    it.effect(
      'ClickedSubmit preserves Valid fields rather than re-running validation',
      ({ models: { completeModel } }) =>
        Story.story(
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
        ),
    )

    it.effect(
      'successful submission shows success',
      ({ models: { initialModel } }) =>
        Story.story(
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
        ),
    )

    it.effect('failed submission shows error', ({ models: { initialModel } }) =>
      Story.story(
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
      ),
    )
  })
})
