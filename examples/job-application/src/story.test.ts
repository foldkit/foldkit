import { Effect } from 'effect'
import { Array, Option } from 'effect'
import { Validating } from 'foldkit/fieldValidation'
import { Command, given, message, model, story } from 'foldkit/story'
import { messageFrom, withBlock } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { toParentMessageFor } from 'foldkit/test'
import { describe, expect } from 'vitest'

import { FileDropBlock } from '@foldkit/ui'
import { Menu, Tabs } from '@foldkit/ui'

import { ApplicationBlock } from './block'
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
import { test } from './model.fixture'
import { StepMenuBlock, StepTabsBlock } from './navigationComponents'
import {
  CoverLetterBlock,
  EducationBlock,
  PersonalInfoBlock,
  SkillsBlock,
  WorkHistoryBlock,
} from './step'
import { ResumeDropBinding } from './step/attachments/composition'

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
  Tabs.test.FocusTab,
  StepTabsBlock.Message.CompletedFocusTab(),
)

const resolveFocusMenuButton = Command.resolve(
  Menu.test.FocusMenuButton,
  StepMenuBlock.Message.CompletedFocusMenuButton(),
)

describe('update', () => {
  describe('navigation', () => {
    test('ClickedNext advances to the next step', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(initialModel),
          message(Message.ClickedNext()),
          Command.expectNone(),
          model(model => {
            expect(model.currentStep).toBe('WorkHistory')
          }),
        ),
      )
    })

    test('ClickedPrevious goes back to the previous step', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(modifyFields(initialModel, { currentStep: () => 'Education' })),
          message(Message.ClickedPrevious()),
          model(model => {
            expect(model.currentStep).toBe('WorkHistory')
          }),
        ),
      )
    })

    test('ClickedPrevious on the first step stays put', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(initialModel),
          message(Message.ClickedPrevious()),
          model(model => {
            expect(model.currentStep).toBe('PersonalInfo')
          }),
        ),
      )
    })

    test('ClickedNext on the last step stays put', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(modifyFields(initialModel, { currentStep: () => 'Review' })),
          message(Message.ClickedNext()),
          model(model => {
            expect(model.currentStep).toBe('Review')
          }),
        ),
      )
    })

    test('a generated Tabs Message selects the matching step', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('a generated Menu Message selects the matching step', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(initialModel),
          stepMenuMessage(
            StepMenuBlock.Message.Opened({
              maybeActiveItemIndex: Option.none(),
            }),
          ),
          Command.resolve(
            Menu.test.FocusMenuItems,
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
  })

  describe('preview toggle', () => {
    test('ToggledPreview flips visibility', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
  })

  describe('child folding', () => {
    test('a generated PersonalInfo Message writes through', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
          given(initialModel),
          personalInfoMessage(
            PersonalInfoBlock.Message.UpdatedFirstName({ value: 'Jane' }),
          ),
          model(model => {
            expect(model.personalInfo.firstName.value).toBe('Jane')
          }),
        ),
      )
    })

    test('a generated WorkHistory Message writes through', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('a generated Education Message writes through', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('a generated Skills Message writes through', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('a generated CoverLetter Message writes through', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('a nested generated FileDrop Message writes through', async ({
      models: { initialModel },
    }) => {
      const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
        type: 'application/pdf',
      })

      await Effect.runPromise(
        withBlock(ApplicationBlock, application => {
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
        }),
      )
    })
  })

  describe('submission', () => {
    test('ClickedSubmit on a complete application transitions to Submitting and fires command', async ({
      models: { completeModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('ClickedSubmit reveals errors through every section and nested entry without submitting', async ({
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

      await Effect.runPromise(
        story(
          ApplicationBlock,
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
        ),
      )
    })

    test('ClickedSubmit with pending validation does not submit', async ({
      models: { completeModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('ClickedSubmit preserves Valid fields rather than re-running validation', async ({
      models: { completeModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('successful submission shows success', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
    })

    test('failed submission shows error', async ({
      models: { initialModel },
    }) => {
      await Effect.runPromise(
        story(
          ApplicationBlock,
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
})
