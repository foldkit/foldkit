import { Array, Option } from 'effect'
import { Validating } from 'foldkit/fieldValidation'
import { Command, given, message, model, story } from 'foldkit/story'
import { modifyFields } from 'foldkit/struct'
import { toParentMessage } from 'foldkit/test'
import { describe, expect, test } from 'vitest'

import { FileDropBlock } from '@foldkit/ui'
import { Menu, Tabs } from '@foldkit/ui'

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
import { completeModel, initialModel, today } from './model.fixture'
import { StepMenuBlock, StepTabsBlock } from './navigationComponents'
import {
  AttachmentsBlock,
  CoverLetterBlock,
  EducationBlock,
  EducationEntryBlock,
  PersonalInfoBlock,
  SkillsBlock,
  SkillsEntryBlock,
  WorkHistoryBlock,
  WorkHistoryEntryBlock,
} from './step'
import { ResumeDropBinding } from './step/attachments/composition'
import { update } from './update'

const givenInitial = given(initialModel)

const personalInfoMessage = (message: typeof PersonalInfoBlock.Message.Type) =>
  toParentMessage(PersonalInfoBinding, message)

const workHistoryMessage = (message: typeof WorkHistoryBlock.Message.Type) =>
  toParentMessage(WorkHistoryBinding, message)

const educationMessage = (message: typeof EducationBlock.Message.Type) =>
  toParentMessage(EducationBinding, message)

const skillsMessage = (message: typeof SkillsBlock.Message.Type) =>
  toParentMessage(SkillsBinding, message)

const coverLetterMessage = (message: typeof CoverLetterBlock.Message.Type) =>
  toParentMessage(CoverLetterBinding, message)

const attachmentsMessage = (message: typeof AttachmentsBlock.Message.Type) =>
  toParentMessage(AttachmentsBinding, message)

const stepMenuMessage = (message: typeof StepMenuBlock.Message.Type) =>
  toParentMessage(StepMenuBinding, message)

const stepTabsMessage = (message: typeof StepTabsBlock.Message.Type) =>
  toParentMessage(StepTabsBinding, message)

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
    test('ClickedNext advances to the next step', () => {
      story(
        update,
        givenInitial,
        message(Message.ClickedNext()),
        Command.expectNone(),
        model(model => {
          expect(model.currentStep).toBe('WorkHistory')
        }),
      )
    })

    test('ClickedPrevious goes back to the previous step', () => {
      story(
        update,
        given(modifyFields(initialModel, { currentStep: () => 'Education' })),
        message(Message.ClickedPrevious()),
        model(model => {
          expect(model.currentStep).toBe('WorkHistory')
        }),
      )
    })

    test('ClickedPrevious on the first step stays put', () => {
      story(
        update,
        givenInitial,
        message(Message.ClickedPrevious()),
        model(model => {
          expect(model.currentStep).toBe('PersonalInfo')
        }),
      )
    })

    test('ClickedNext on the last step stays put', () => {
      story(
        update,
        given(modifyFields(initialModel, { currentStep: () => 'Review' })),
        message(Message.ClickedNext()),
        model(model => {
          expect(model.currentStep).toBe('Review')
        }),
      )
    })

    test('a generated Tabs Message selects the matching step', () => {
      story(
        update,
        givenInitial,
        message(
          stepTabsMessage(
            StepTabsBlock.Message.SelectedTab({ index: 6, value: 'Review' }),
          ),
        ),
        model(model => {
          expect(model.currentStep).toBe('Review')
        }),
        resolveFocusTab,
      )
    })

    test('a generated Menu Message selects the matching step', () => {
      story(
        update,
        givenInitial,
        message(
          stepMenuMessage(
            StepMenuBlock.Message.Opened({
              maybeActiveItemIndex: Option.none(),
            }),
          ),
        ),
        Command.resolve(
          Menu.test.FocusMenuItems,
          StepMenuBlock.Message.CompletedFocusMenuItems(),
        ),
        message(
          stepMenuMessage(
            StepMenuBlock.Message.SelectedItem({
              index: 5,
              item: 'Attachments',
            }),
          ),
        ),
        model(model => {
          expect(model.currentStep).toBe('Attachments')
        }),
        resolveFocusMenuButton,
      )
    })
  })

  describe('preview toggle', () => {
    test('ToggledPreview flips visibility', () => {
      story(
        update,
        givenInitial,
        message(Message.ToggledPreview()),
        model(model => {
          expect(model.isPreviewVisible).toBe(true)
        }),
        message(Message.ToggledPreview()),
        model(model => {
          expect(model.isPreviewVisible).toBe(false)
        }),
      )
    })
  })

  describe('child folding', () => {
    test('a generated PersonalInfo Message writes through', () => {
      story(
        update,
        givenInitial,
        message(
          personalInfoMessage(
            PersonalInfoBlock.Message.UpdatedFirstName({ value: 'Jane' }),
          ),
        ),
        model(model => {
          expect(model.personalInfo.firstName.value).toBe('Jane')
        }),
      )
    })

    test('a generated WorkHistory Message writes through', () => {
      story(
        update,
        givenInitial,
        message(
          workHistoryMessage(
            WorkHistoryBlock.Message.SucceededGenerateWorkHistoryEntryId({
              entryId: 'test-work-1',
            }),
          ),
        ),
        model(model => {
          expect(model.workHistory.entries).toHaveLength(2)
        }),
      )
    })

    test('a generated Education Message writes through', () => {
      story(
        update,
        givenInitial,
        message(
          educationMessage(
            EducationBlock.Message.SucceededGenerateEducationEntryId({
              entryId: 'test-edu-1',
            }),
          ),
        ),
        model(model => {
          expect(model.education.entries).toHaveLength(2)
        }),
      )
    })

    test('a generated Skills Message writes through', () => {
      story(
        update,
        givenInitial,
        message(
          skillsMessage(
            SkillsBlock.Message.SucceededGenerateSkillsEntryId({
              entryId: 'test-skill-1',
            }),
          ),
        ),
        model(model => {
          expect(model.skills.entries).toHaveLength(2)
        }),
      )
    })

    test('a generated CoverLetter Message writes through', () => {
      story(
        update,
        givenInitial,
        message(
          coverLetterMessage(
            CoverLetterBlock.Message.UpdatedContent({
              value: 'I love the Elm Architecture.',
            }),
          ),
        ),
        model(model => {
          expect(model.coverLetter.content).toBe('I love the Elm Architecture.')
        }),
      )
    })

    test('a nested generated FileDrop Message writes through', () => {
      const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
        type: 'application/pdf',
      })

      story(
        update,
        givenInitial,
        message(
          attachmentsMessage(
            toParentMessage(
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
  })

  describe('submission', () => {
    test('ClickedSubmit on a complete application transitions to Submitting and fires command', () => {
      story(
        update,
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
      )
    })

    test('ClickedSubmit reveals errors through every section and nested entry without submitting', () => {
      const modelWithMultipleEntries = modifyFields(initialModel, {
        currentStep: () => 'Review',
        workHistory: workHistory =>
          modifyFields(workHistory, {
            entries: Array.append(
              WorkHistoryEntryBlock.init('work-history-entry-2', today).model,
            ),
          }),
        education: education =>
          modifyFields(education, {
            entries: Array.append(
              EducationEntryBlock.init('education-entry-2').model,
            ),
          }),
        skills: skills =>
          modifyFields(skills, {
            entries: Array.append(
              SkillsEntryBlock.init('skills-entry-2').model,
            ),
          }),
      })

      story(
        update,
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
    })

    test('ClickedSubmit with pending validation does not submit', () => {
      story(
        update,
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
      )
    })

    test('ClickedSubmit preserves Valid fields rather than re-running validation', () => {
      story(
        update,
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
      )
    })

    test('successful submission shows success', () => {
      story(
        update,
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
      )
    })

    test('failed submission shows error', () => {
      story(
        update,
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
      )
    })
  })
})
