import { Array, Option, pipe } from 'effect'
import { Validating } from 'foldkit/fieldValidation'
import { Command, given, message, model, story } from 'foldkit/story'
import { evo } from 'foldkit/struct'
import { describe, expect, test } from 'vitest'

import { FileDrop, Menu, Tabs } from '@foldkit/ui'

import { SubmitApplication } from './command'
import { completeModel, initialModel } from './main.fixture'
import { Message } from './message'
import { Submission } from './model'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './step'
import { update } from './update'

const givenInitial = given(initialModel)

const resolveFocusTab = Command.resolve(
  Tabs.FocusTab,
  Tabs.Message.CompletedFocusTab(),
)

const resolveFocusMenuButton = Command.resolve(
  Menu.FocusButton,
  Menu.Message.CompletedFocusButton(),
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
        given(evo(initialModel, { currentStep: () => 'Education' })),
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
        given(evo(initialModel, { currentStep: () => 'Review' })),
        message(Message.ClickedNext()),
        model(model => {
          expect(model.currentStep).toBe('Review')
        }),
      )
    })

    test('NavigatedToStep jumps directly to a step', () => {
      story(
        update,
        givenInitial,
        message(Message.NavigatedToStep({ step: 'Skills' })),
        model(model => {
          expect(model.currentStep).toBe('Skills')
        }),
      )
    })

    test('GotStepTabsMessage selects the matching step', () => {
      story(
        update,
        givenInitial,
        message(
          Message.GotStepTabsMessage({
            message: Tabs.Message.SelectedTab({ index: 6, value: 'Review' }),
          }),
        ),
        model(model => {
          expect(model.currentStep).toBe('Review')
        }),
        resolveFocusTab,
      )
    })

    test('GotStepMenuMessage selects the matching step', () => {
      story(
        update,
        givenInitial,
        message(
          Message.GotStepMenuMessage({
            message: Menu.Message.Opened({
              maybeActiveItemIndex: Option.none(),
            }),
          }),
        ),
        Command.resolve(Menu.FocusItems, Menu.Message.CompletedFocusItems()),
        message(
          Message.GotStepMenuMessage({
            message: Menu.Message.SelectedItem({
              index: 5,
              item: 'Attachments',
            }),
          }),
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
    test('GotPersonalInfoMessage writes through to personalInfo', () => {
      story(
        update,
        givenInitial,
        message(
          Message.GotPersonalInfoMessage({
            message: PersonalInfo.Message.UpdatedFirstName({ value: 'Jane' }),
          }),
        ),
        model(model => {
          expect(model.personalInfo.firstName.value).toBe('Jane')
        }),
      )
    })

    test('GotWorkHistoryMessage writes through to workHistory', () => {
      story(
        update,
        givenInitial,
        message(
          Message.GotWorkHistoryMessage({
            message: WorkHistory.Message.SucceededGenerateEntryId({
              entryId: 'test-work-1',
            }),
          }),
        ),
        model(model => {
          expect(model.workHistory.entries).toHaveLength(2)
        }),
      )
    })

    test('GotEducationMessage writes through to education', () => {
      story(
        update,
        givenInitial,
        message(
          Message.GotEducationMessage({
            message: Education.Message.SucceededGenerateEntryId({
              entryId: 'test-edu-1',
            }),
          }),
        ),
        model(model => {
          expect(model.education.entries).toHaveLength(2)
        }),
      )
    })

    test('GotSkillsMessage writes through to skills', () => {
      story(
        update,
        givenInitial,
        message(
          Message.GotSkillsMessage({
            message: Skills.Message.SucceededGenerateEntryId({
              entryId: 'test-skill-1',
            }),
          }),
        ),
        model(model => {
          expect(model.skills.entries).toHaveLength(2)
        }),
      )
    })

    test('GotCoverLetterMessage writes through to coverLetter', () => {
      story(
        update,
        givenInitial,
        message(
          Message.GotCoverLetterMessage({
            message: CoverLetter.Message.UpdatedContent({
              value: 'I love the Elm Architecture.',
            }),
          }),
        ),
        model(model => {
          expect(model.coverLetter.content).toBe('I love the Elm Architecture.')
        }),
      )
    })

    test('GotAttachmentsMessage writes through to attachments', () => {
      const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
        type: 'application/pdf',
      })

      story(
        update,
        givenInitial,
        message(
          Message.GotAttachmentsMessage({
            message: Attachments.Message.GotResumeDropMessage({
              message: FileDrop.Message.DroppedFiles({ files: [resume] }),
            }),
          }),
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
        given(evo(completeModel, { currentStep: () => 'Review' })),
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

    test('ClickedSubmit on an incomplete application reveals errors and does not submit', () => {
      story(
        update,
        given(evo(initialModel, { currentStep: () => 'Review' })),
        message(Message.ClickedSubmit()),
        Command.expectNone(),
        model(model => {
          expect(model.submission._tag).toBe('NotSubmitted')
          expect(model.isSubmitAttempted).toBe(true)
          expect(model.personalInfo.firstName._tag).toBe('Invalid')
          expect(model.personalInfo.lastName._tag).toBe('Invalid')
          expect(model.personalInfo.email._tag).toBe('Invalid')
          expect(
            pipe(
              model.workHistory.entries,
              Array.head,
              Option.map(entry => entry.company._tag),
              Option.getOrThrow,
            ),
          ).toBe('Invalid')
          expect(
            pipe(
              model.education.entries,
              Array.head,
              Option.map(entry => entry.school._tag),
              Option.getOrThrow,
            ),
          ).toBe('Invalid')
          expect(
            pipe(
              model.skills.entries,
              Array.head,
              Option.map(entry => entry.name._tag),
              Option.getOrThrow,
            ),
          ).toBe('Invalid')
        }),
      )
    })

    test('ClickedSubmit with pending validation does not submit', () => {
      story(
        update,
        given(
          evo(completeModel, {
            currentStep: () => 'Review',
            personalInfo: evo({
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
        given(evo(completeModel, { currentStep: () => 'Review' })),
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
          evo(initialModel, {
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
          evo(initialModel, {
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
