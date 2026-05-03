import { Array, Option, pipe } from 'effect'
import { Calendar, Story, Ui } from 'foldkit'
import { Valid, Validating } from 'foldkit/fieldValidation'
import { describe, expect, test } from 'vitest'

import { SubmitApplication } from './command'
import {
  ClickedNext,
  ClickedPrevious,
  FailedSubmitApplication,
  GotAttachmentsMessage,
  GotCoverLetterMessage,
  GotEducationMessage,
  GotPersonalInfoMessage,
  GotSkillsMessage,
  GotWorkHistoryMessage,
  NavigatedToStep,
  SubmittedApplication,
  SucceededSubmitApplication,
  ToggledPreview,
} from './message'
import { type Model, NotSubmitted, Submitting } from './model'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './step'
import { update } from './update'

const today = Calendar.make(2026, 4, 16)

const initialModel: Model = {
  currentStep: 'PersonalInfo',
  personalInfo: PersonalInfo.init(today),
  workHistory: WorkHistory.init(today),
  education: Education.init(today),
  skills: Skills.init(),
  coverLetter: CoverLetter.init(),
  attachments: Attachments.init(),
  isPreviewVisible: false,
  submission: NotSubmitted(),
  stepMenu: Ui.Menu.init({ id: 'step-menu' }),
}

const withInitial = Story.with(initialModel)

describe('Job Application', () => {
  describe('navigation', () => {
    test('ClickedNext advances to the next step', () => {
      Story.story(
        update,
        withInitial,
        Story.message(ClickedNext()),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.currentStep).toBe('WorkHistory')
        }),
      )
    })

    test('ClickedPrevious goes back to the previous step', () => {
      Story.story(
        update,
        Story.with({ ...initialModel, currentStep: 'Education' }),
        Story.message(ClickedPrevious()),
        Story.model(model => {
          expect(model.currentStep).toBe('WorkHistory')
        }),
      )
    })

    test('ClickedPrevious on the first step stays put', () => {
      Story.story(
        update,
        withInitial,
        Story.message(ClickedPrevious()),
        Story.model(model => {
          expect(model.currentStep).toBe('PersonalInfo')
        }),
      )
    })

    test('ClickedNext on the last step stays put', () => {
      Story.story(
        update,
        Story.with({ ...initialModel, currentStep: 'Review' }),
        Story.message(ClickedNext()),
        Story.model(model => {
          expect(model.currentStep).toBe('Review')
        }),
      )
    })

    test('NavigatedToStep jumps directly to a step', () => {
      Story.story(
        update,
        withInitial,
        Story.message(NavigatedToStep({ step: 'Skills' })),
        Story.model(model => {
          expect(model.currentStep).toBe('Skills')
        }),
      )
    })
  })

  describe('preview toggle', () => {
    test('ToggledPreview flips visibility', () => {
      Story.story(
        update,
        withInitial,
        Story.message(ToggledPreview()),
        Story.model(model => {
          expect(model.isPreviewVisible).toBe(true)
        }),
        Story.message(ToggledPreview()),
        Story.model(model => {
          expect(model.isPreviewVisible).toBe(false)
        }),
      )
    })
  })

  describe('personal info delegation', () => {
    test('first name update is delegated to personal info step', () => {
      Story.story(
        update,
        withInitial,
        Story.message(
          GotPersonalInfoMessage({
            message: PersonalInfo.UpdatedFirstName({ value: 'Jane' }),
          }),
        ),
        Story.model(model => {
          expect(model.personalInfo.firstName.value).toBe('Jane')
          expect(model.personalInfo.firstName._tag).toBe('Valid')
        }),
      )
    })

    test('short first name produces validation error', () => {
      Story.story(
        update,
        withInitial,
        Story.message(
          GotPersonalInfoMessage({
            message: PersonalInfo.UpdatedFirstName({ value: 'J' }),
          }),
        ),
        Story.model(model => {
          expect(model.personalInfo.firstName._tag).toBe('Invalid')
        }),
      )
    })

    test('email triggers async validation after passing sync checks', () => {
      Story.story(
        update,
        withInitial,
        Story.message(
          GotPersonalInfoMessage({
            message: PersonalInfo.UpdatedEmail({ value: 'jane@example.com' }),
          }),
        ),
        Story.Command.expectHas(PersonalInfo.ValidateEmailAsync),
        Story.Command.resolve(
          PersonalInfo.ValidateEmailAsync,
          PersonalInfo.ValidatedEmail({
            validationId: 1,
            field: Valid({ value: 'jane@example.com' }),
          }),
          message => GotPersonalInfoMessage({ message }),
        ),
        Story.model(model => {
          expect(model.personalInfo.email._tag).toBe('Valid')
        }),
      )
    })

    test('malformed email fails sync validation without async command', () => {
      Story.story(
        update,
        withInitial,
        Story.message(
          GotPersonalInfoMessage({
            message: PersonalInfo.UpdatedEmail({ value: 'not-email' }),
          }),
        ),
        Story.Command.expectNone(),
        Story.model(model => {
          expect(model.personalInfo.email._tag).toBe('Invalid')
        }),
      )
    })

    test('stale email async result is discarded', () => {
      const modelWithInFlightValidation: Model = {
        ...initialModel,
        personalInfo: {
          ...initialModel.personalInfo,
          email: Validating({ value: 'jane@example.com' }),
          emailValidationId: 5,
        },
      }

      Story.story(
        update,
        Story.with(modelWithInFlightValidation),
        Story.message(
          GotPersonalInfoMessage({
            message: PersonalInfo.ValidatedEmail({
              validationId: 3,
              field: Valid({ value: 'old@example.com' }),
            }),
          }),
        ),
        Story.model(model => {
          expect(model.personalInfo.email._tag).toBe('Validating')
          expect(model.personalInfo.email.value).toBe('jane@example.com')
          expect(model.personalInfo.emailValidationId).toBe(5)
        }),
      )
    })
  })

  describe('work history delegation', () => {
    test('adds a new work entry', () => {
      Story.story(
        update,
        withInitial,
        Story.message(
          GotWorkHistoryMessage({
            message: WorkHistory.AddedEntry({ entryId: 'test-work-1' }),
          }),
        ),
        Story.model(model => {
          expect(model.workHistory.entries.length).toBe(2)
        }),
      )
    })

    test('removes a work entry', () => {
      const firstEntry = Option.getOrThrow(
        Array.head(initialModel.workHistory.entries),
      )

      Story.story(
        update,
        withInitial,
        Story.message(
          GotWorkHistoryMessage({
            message: WorkHistory.RemovedEntry({ entryId: firstEntry.id }),
          }),
        ),
        Story.model(model => {
          expect(model.workHistory.entries.length).toBe(0)
        }),
      )
    })

    test('updates company in a work entry', () => {
      const firstEntry = Option.getOrThrow(
        Array.head(initialModel.workHistory.entries),
      )

      Story.story(
        update,
        withInitial,
        Story.message(
          GotWorkHistoryMessage({
            message: WorkHistory.GotEntryMessage({
              entryId: firstEntry.id,
              message: WorkHistory.Entry.UpdatedCompany({
                value: 'Foldkit Inc.',
              }),
            }),
          }),
        ),
        Story.model(model => {
          expect(
            pipe(
              model.workHistory.entries,
              Array.head,
              Option.map(entry => entry.company.value),
              Option.getOrThrow,
            ),
          ).toBe('Foldkit Inc.')
        }),
      )
    })
  })

  describe('education delegation', () => {
    test('adds a new education entry', () => {
      Story.story(
        update,
        withInitial,
        Story.message(
          GotEducationMessage({
            message: Education.AddedEntry({ entryId: 'test-edu-1' }),
          }),
        ),
        Story.model(model => {
          expect(model.education.entries.length).toBe(2)
        }),
      )
    })

    test('removes an education entry', () => {
      const firstEntry = Option.getOrThrow(
        Array.head(initialModel.education.entries),
      )

      Story.story(
        update,
        withInitial,
        Story.message(
          GotEducationMessage({
            message: Education.RemovedEntry({ entryId: firstEntry.id }),
          }),
        ),
        Story.model(model => {
          expect(model.education.entries.length).toBe(0)
        }),
      )
    })

    test('updates school in an education entry', () => {
      const firstEntry = Option.getOrThrow(
        Array.head(initialModel.education.entries),
      )

      Story.story(
        update,
        withInitial,
        Story.message(
          GotEducationMessage({
            message: Education.GotEntryMessage({
              entryId: firstEntry.id,
              message: Education.Entry.UpdatedSchool({ value: 'MIT' }),
            }),
          }),
        ),
        Story.model(model => {
          expect(
            pipe(
              model.education.entries,
              Array.head,
              Option.map(entry => entry.school.value),
              Option.getOrThrow,
            ),
          ).toBe('MIT')
        }),
      )
    })

    test('empty school is Invalid with required message', () => {
      const firstEntry = Option.getOrThrow(
        Array.head(initialModel.education.entries),
      )

      Story.story(
        update,
        withInitial,
        Story.message(
          GotEducationMessage({
            message: Education.GotEntryMessage({
              entryId: firstEntry.id,
              message: Education.Entry.UpdatedSchool({ value: 'MIT' }),
            }),
          }),
        ),
        Story.message(
          GotEducationMessage({
            message: Education.GotEntryMessage({
              entryId: firstEntry.id,
              message: Education.Entry.UpdatedSchool({ value: '' }),
            }),
          }),
        ),
        Story.model(model => {
          expect(
            pipe(
              model.education.entries,
              Array.head,
              Option.map(entry => entry.school._tag),
              Option.getOrThrow,
            ),
          ).toBe('Invalid')
        }),
      )
    })
  })

  describe('skills delegation', () => {
    test('adds a new skill entry', () => {
      Story.story(
        update,
        withInitial,
        Story.message(
          GotSkillsMessage({
            message: Skills.AddedEntry({ entryId: 'test-skill-1' }),
          }),
        ),
        Story.model(model => {
          expect(model.skills.entries.length).toBe(2)
        }),
      )
    })

    test('updates skill name', () => {
      const firstEntry = Option.getOrThrow(
        Array.head(initialModel.skills.entries),
      )

      Story.story(
        update,
        withInitial,
        Story.message(
          GotSkillsMessage({
            message: Skills.GotEntryMessage({
              entryId: firstEntry.id,
              message: Skills.Entry.UpdatedName({
                value: 'TypeScript',
              }),
            }),
          }),
        ),
        Story.model(model => {
          expect(
            pipe(
              model.skills.entries,
              Array.head,
              Option.map(entry => entry.name.value),
              Option.getOrThrow,
            ),
          ).toBe('TypeScript')
        }),
      )
    })
  })

  describe('cover letter delegation', () => {
    test('updates content', () => {
      Story.story(
        update,
        withInitial,
        Story.message(
          GotCoverLetterMessage({
            message: CoverLetter.UpdatedContent({
              value: 'I love the Elm Architecture.',
            }),
          }),
        ),
        Story.model(model => {
          expect(model.coverLetter.content).toBe('I love the Elm Architecture.')
        }),
      )
    })
  })

  describe('attachments delegation', () => {
    test('stores a dropped resume as the maybeResume File', () => {
      const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
        type: 'application/pdf',
      })
      Story.story(
        update,
        withInitial,
        Story.message(
          GotAttachmentsMessage({
            message: Attachments.GotResumeDropMessage({
              message: Ui.FileDrop.DroppedFiles({ files: [resume] }),
            }),
          }),
        ),
        Story.model(model => {
          expect(model.attachments.maybeResume._tag).toBe('Some')
        }),
      )
    })

    test('appends dropped additional files to the list', () => {
      const file = new globalThis.File(['content'], 'portfolio.pdf', {
        type: 'application/pdf',
      })
      Story.story(
        update,
        withInitial,
        Story.message(
          GotAttachmentsMessage({
            message: Attachments.GotAdditionalFilesDropMessage({
              message: Ui.FileDrop.DroppedFiles({ files: [file] }),
            }),
          }),
        ),
        Story.model(model => {
          expect(model.attachments.additionalFiles).toHaveLength(1)
        }),
      )
    })
  })

  describe('submission', () => {
    test('SubmittedApplication sets submitting state and fires command', () => {
      Story.story(
        update,
        Story.with({ ...initialModel, currentStep: 'Review' }),
        Story.message(SubmittedApplication()),
        Story.Command.expectExact(SubmitApplication),
        Story.Command.resolve(SubmitApplication, SucceededSubmitApplication()),
        Story.model(model => {
          expect(model.submission._tag).toBe('SubmitSuccess')
        }),
      )
    })

    test('successful submission shows success', () => {
      Story.story(
        update,
        Story.with({
          ...initialModel,
          currentStep: 'Review',
          submission: Submitting(),
        }),
        Story.message(SucceededSubmitApplication()),
        Story.model(model => {
          expect(model.submission._tag).toBe('SubmitSuccess')
        }),
      )
    })

    test('failed submission shows error', () => {
      Story.story(
        update,
        Story.with({
          ...initialModel,
          currentStep: 'Review',
          submission: Submitting(),
        }),
        Story.message(FailedSubmitApplication({ error: 'Server down' })),
        Story.model(model => {
          expect(model.submission._tag).toBe('SubmitError')
        }),
      )
    })
  })
})
