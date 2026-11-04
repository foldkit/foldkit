import { Array, Option } from 'effect'
import { Validating } from 'foldkit/fieldValidation'
import { Command, given, message, model, story } from 'foldkit/story'
import { messageFrom, withBlock } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { toParentMessageFor } from 'foldkit/test'
import { describe, expect } from 'vitest'

import { FileDropBlock } from '@foldkit/ui/fileDrop'
import { test as MenuTest } from '@foldkit/ui/menu'
import { test as TabsTest } from '@foldkit/ui/tabs'

import { ApplicationBlock, layer } from './block'
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
  messageFrom(PersonalInfoBinding, message)

const workHistoryMessage = (message: WorkHistoryMessage) =>
  messageFrom(WorkHistoryBinding, message)

const educationMessage = (message: EducationMessage) =>
  messageFrom(EducationBinding, message)

const skillsMessage = (message: SkillsMessage) =>
  messageFrom(SkillsBinding, message)

const coverLetterMessage = (message: CoverLetterMessage) =>
  messageFrom(CoverLetterBinding, message)

const stepMenuMessage = (message: StepMenuMessage) =>
  messageFrom(StepMenuBinding, message)

const stepTabsMessage = (message: StepTabsMessage) =>
  messageFrom(StepTabsBinding, message)

const resolveFocusTab = Command.resolve(
  TabsTest.FocusTab,
  StepTabsBlock.Message.CompletedFocusTab(),
)

const resolveFocusMenuButton = Command.resolve(
  MenuTest.FocusMenuButton,
  StepMenuBlock.Message.CompletedFocusMenuButton(),
)

describe('update', () => {
  describe('navigation', () => {
    it.effect(
      'ClickedNext advances to the next step',
      ({ models: { initialModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(initialModel),
          message(Message.ClickedNext()),
          Command.expectNone(),
          model(model => {
            expect(model.currentStep).toBe('WorkHistory')
          }),
        ),
    )

    it.effect(
      'ClickedPrevious goes back to the previous step',
      ({ models: { initialModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(modifyFields(initialModel, { currentStep: () => 'Education' })),
          message(Message.ClickedPrevious()),
          model(model => {
            expect(model.currentStep).toBe('WorkHistory')
          }),
        ),
    )

    it.effect(
      'ClickedPrevious on the first step stays put',
      ({ models: { initialModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(initialModel),
          message(Message.ClickedPrevious()),
          model(model => {
            expect(model.currentStep).toBe('PersonalInfo')
          }),
        ),
    )

    it.effect(
      'ClickedNext on the last step stays put',
      ({ models: { initialModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(modifyFields(initialModel, { currentStep: () => 'Review' })),
          message(Message.ClickedNext()),
          model(model => {
            expect(model.currentStep).toBe('Review')
          }),
        ),
    )

    it.effect(
      'a generated Tabs Message selects the matching step',
      ({ models: { initialModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(initialModel),
          stepTabsMessage(
            StepTabsBlock.Message.SelectedTab({ index: 6, value: 'Review' }),
          ),
          model(model => {
            expect(model.currentStep).toBe('Review')
          }),
          resolveFocusTab,
        ),
    )

    it.effect(
      'a generated Menu Message selects the matching step',
      ({ models: { initialModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(initialModel),
          stepMenuMessage(
            StepMenuBlock.Message.Opened({
              maybeActiveItemIndex: Option.none(),
            }),
          ),
          Command.resolve(
            MenuTest.FocusMenuItems,
            StepMenuBlock.Message.CompletedFocusMenuItems(),
          ),
          stepMenuMessage(
            StepMenuBlock.Message.SelectedItem({
              index: 5,
              item: 'Attachments',
            }),
          ),
          model(model => {
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
        story(
          { block: ApplicationBlock, layer },
          given(initialModel),
          message(Message.ToggledPreview()),
          model(model => {
            expect(model.isPreviewVisible).toBe(true)
          }),
          message(Message.ToggledPreview()),
          model(model => {
            expect(model.isPreviewVisible).toBe(false)
          }),
        ),
    )
  })

  describe('child folding', () => {
    it.effect(
      'a generated PersonalInfo Message writes through',
      ({ models: { initialModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(initialModel),
          personalInfoMessage(
            PersonalInfoBlock.Message.UpdatedFirstName({ value: 'Jane' }),
          ),
          model(model => {
            expect(model.personalInfo.firstName.value).toBe('Jane')
          }),
        ),
    )

    it.effect(
      'a generated WorkHistory Message writes through',
      ({ models: { initialModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(initialModel),
          workHistoryMessage(
            WorkHistoryBlock.Message.CompletedGenerateWorkHistoryEntryId({
              entryId: 'test-work-1',
            }),
          ),
          model(model => {
            expect(model.workHistory.entries).toHaveLength(2)
          }),
        ),
    )

    it.effect(
      'a generated Education Message writes through',
      ({ models: { initialModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(initialModel),
          educationMessage(
            EducationBlock.Message.CompletedGenerateEducationEntryId({
              entryId: 'test-edu-1',
            }),
          ),
          model(model => {
            expect(model.education.entries).toHaveLength(2)
          }),
        ),
    )

    it.effect(
      'a generated Skills Message writes through',
      ({ models: { initialModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(initialModel),
          skillsMessage(
            SkillsBlock.Message.CompletedGenerateSkillsEntryId({
              entryId: 'test-skill-1',
            }),
          ),
          model(model => {
            expect(model.skills.entries).toHaveLength(2)
          }),
        ),
    )

    it.effect(
      'a generated CoverLetter Message writes through',
      ({ models: { initialModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(initialModel),
          coverLetterMessage(
            CoverLetterBlock.Message.UpdatedContent({
              value: 'I love the Elm Architecture.',
            }),
          ),
          model(model => {
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

        return withBlock({ block: ApplicationBlock, layer }, application => {
          const toApplicationMessage = toParentMessageFor(application)
          const toAttachmentsMessage = toParentMessageFor(
            application,
            AttachmentsBinding,
          )

          story(
            application.update,
            given(initialModel),
            message(
              toApplicationMessage(
                AttachmentsBinding,
                toAttachmentsMessage(
                  ResumeDropBinding,
                  FileDropBlock.Message.DroppedFiles({ files: [resume] }),
                ),
              ),
            ),
            model(model => {
              expect(model.attachments.maybeResume._tag).toBe('Some')
            }),
          )
        })
      },
    )
  })

  describe('submission', () => {
    it.effect(
      'ClickedSubmit on a complete application transitions to Submitting and fires command',
      ({ models: { completeModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(modifyFields(completeModel, { currentStep: () => 'Review' })),
          message(Message.ClickedSubmit()),
          Command.expectExact(SubmitApplication),
          Command.resolve(
            SubmitApplication,
            Message.SucceededSubmitApplication(),
          ),
          model(model => {
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

        return story(
          { block: ApplicationBlock, layer },
          given(modelWithMultipleEntries),
          message(Message.ClickedSubmit()),
          Command.expectNone(),
          model(model => {
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
        story(
          { block: ApplicationBlock, layer },
          given(
            modifyFields(completeModel, {
              currentStep: () => 'Review',
              personalInfo: modifyFields({
                email: () => Validating({ value: 'jane@example.com' }),
              }),
            }),
          ),
          message(Message.ClickedSubmit()),
          Command.expectNone(),
          model(model => {
            expect(model.submission._tag).toBe('NotSubmitted')
            expect(model.isSubmitAttempted).toBe(true)
            expect(model.personalInfo.email._tag).toBe('Validating')
          }),
        ),
    )

    it.effect(
      'ClickedSubmit preserves Valid fields rather than re-running validation',
      ({ models: { completeModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(modifyFields(completeModel, { currentStep: () => 'Review' })),
          message(Message.ClickedSubmit()),
          Command.resolve(
            SubmitApplication,
            Message.SucceededSubmitApplication(),
          ),
          model(model => {
            expect(model.personalInfo.firstName._tag).toBe('Valid')
            expect(model.personalInfo.firstName.value).toBe('Jane')
          }),
        ),
    )

    it.effect(
      'successful submission shows success',
      ({ models: { initialModel } }) =>
        story(
          { block: ApplicationBlock, layer },
          given(
            modifyFields(initialModel, {
              currentStep: () => 'Review',
              submission: () => Submission.Submitting(),
            }),
          ),
          message(Message.SucceededSubmitApplication()),
          model(model => {
            expect(model.submission._tag).toBe('SubmitSuccess')
          }),
        ),
    )

    it.effect('failed submission shows error', ({ models: { initialModel } }) =>
      story(
        { block: ApplicationBlock, layer },
        given(
          modifyFields(initialModel, {
            currentStep: () => 'Review',
            submission: () => Submission.Submitting(),
          }),
        ),
        message(Message.FailedSubmitApplication({ error: 'Server down' })),
        model(model => {
          expect(model.submission._tag).toBe('SubmitError')
        }),
      ),
    )
  })
})
