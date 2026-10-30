import { Array, Effect, Option } from 'effect'
import { Block } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { Command, message, model, story } from 'foldkit/story'

import { BrowserCrypto } from '@effect/platform-browser'
import { describe, expect, it } from '@effect/vitest'
import { FileDrop, Menu, Tabs } from '@foldkit/ui'

import { ApplicationLive, Message, StepMenu, StepTabs } from './application'
import * as Step from './domain/step'
import { args } from './flags.fixture'
import { Preview } from './preview'
import { Review, SubmitApplication } from './review'
import { CoverLetter } from './step/coverLetter'
import { Education } from './step/education/education'
import { EducationEntry } from './step/education/educationEntry'
import { PersonalInfo, ValidateEmailAsync } from './step/personalInfo'
import { Skills } from './step/skills/skills'
import { SkillsEntry } from './step/skills/skillsEntry'
import { WorkHistory } from './step/workHistory/workHistory'
import { WorkHistoryEntry } from './step/workHistory/workHistoryEntry'

const workHistoryEntryPath = (entryId: string) => [
  'workHistory',
  'entries',
  entryId,
]
const educationEntryPath = (entryId: string) => [
  'education',
  'entries',
  entryId,
]
const skillsEntryPath = (entryId: string) => ['skills', 'entries', entryId]

const goToStep = (step: Step.Step) =>
  Array.makeBy(Step.indexOf(step), () => message(Message.ClickedNext()))

const fillPersonalInfo = [
  message(
    Block.deliver(
      PersonalInfo,
      'personalInfo',
      PersonalInfo.Message.UpdatedFirstName({ value: 'Jane' }),
    ),
  ),
  message(
    Block.deliver(
      PersonalInfo,
      'personalInfo',
      PersonalInfo.Message.UpdatedLastName({ value: 'Doe' }),
    ),
  ),
  message(
    Block.deliver(
      PersonalInfo,
      'personalInfo',
      PersonalInfo.Message.UpdatedEmail({ value: 'jane@example.com' }),
    ),
  ),
]

const resolveEmailValidation = Command.resolve(
  ValidateEmailAsync,
  PersonalInfo.Message.CompletedValidateEmailAsync({
    validationId: 1,
    field: Valid({ value: 'jane@example.com' }),
  }),
)

const fillEntries = [
  message(
    Block.deliver(
      WorkHistoryEntry,
      workHistoryEntryPath('work-history-entry-1'),
      WorkHistoryEntry.Message.UpdatedCompany({ value: 'Foldkit' }),
    ),
  ),
  message(
    Block.deliver(
      WorkHistoryEntry,
      workHistoryEntryPath('work-history-entry-1'),
      WorkHistoryEntry.Message.UpdatedTitle({ value: 'Engineer' }),
    ),
  ),
  message(
    Block.deliver(
      EducationEntry,
      educationEntryPath('education-entry-1'),
      EducationEntry.Message.UpdatedSchool({ value: 'MIT' }),
    ),
  ),
  message(
    Block.deliver(
      EducationEntry,
      educationEntryPath('education-entry-1'),
      EducationEntry.Message.UpdatedDegree({ value: 'BS' }),
    ),
  ),
  message(
    Block.deliver(
      EducationEntry,
      educationEntryPath('education-entry-1'),
      EducationEntry.Message.UpdatedFieldOfStudy({ value: 'CS' }),
    ),
  ),
  message(
    Block.deliver(
      SkillsEntry,
      skillsEntryPath('skills-entry-1'),
      SkillsEntry.Message.UpdatedName({ value: 'TypeScript' }),
    ),
  ),
]

const completeApplication = [
  ...fillPersonalInfo,
  resolveEmailValidation,
  ...fillEntries,
]

const clickSubmit = message(
  Block.deliver(Review, 'review', Review.Message.ClickedSubmit()),
)

const togglePreview = message(
  Block.deliver(Preview, 'preview', Preview.Message.ToggledPreview()),
)

const resolveFocusTab = Command.resolve(
  Tabs.test.FocusTab,
  StepTabs.Message.CompletedFocusTab(),
)

const resolveFocusMenuButton = Command.resolve(
  Menu.test.FocusMenuButton,
  StepMenu.Message.CompletedFocusMenuButton(),
)

describe('update', () => {
  describe('navigation', () => {
    it.effect('ClickedNext advances to the next step', () =>
      story(
        ApplicationLive,
        args,
        message(Message.ClickedNext()),
        Command.expectNone(),
        model(model => {
          expect(model.currentStep).toBe('WorkHistory')
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('ClickedPrevious goes back to the previous step', () =>
      story(
        ApplicationLive,
        args,
        ...goToStep('Education'),
        message(Message.ClickedPrevious()),
        model(model => {
          expect(model.currentStep).toBe('WorkHistory')
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('ClickedPrevious on the first step stays put', () =>
      story(
        ApplicationLive,
        args,
        message(Message.ClickedPrevious()),
        model(model => {
          expect(model.currentStep).toBe('PersonalInfo')
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('ClickedNext on the last step stays put', () =>
      story(
        ApplicationLive,
        args,
        ...goToStep('Review'),
        message(Message.ClickedNext()),
        model(model => {
          expect(model.currentStep).toBe('Review')
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('a Tabs Message selects the matching step', () =>
      story(
        ApplicationLive,
        args,
        message(
          Block.deliver(
            StepTabs,
            'stepTabs',
            StepTabs.Message.SelectedTab({ index: 6, value: 'Review' }),
          ),
        ),
        model(model => {
          expect(model.currentStep).toBe('Review')
        }),
        resolveFocusTab,
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('a Menu Message selects the matching step', () =>
      story(
        ApplicationLive,
        args,
        message(
          Block.deliver(
            StepMenu,
            'stepMenu',
            StepMenu.Message.Opened({ maybeActiveItemIndex: Option.none() }),
          ),
        ),
        Command.resolve(
          Menu.test.FocusMenuItems,
          StepMenu.Message.CompletedFocusMenuItems(),
        ),
        message(
          Block.deliver(
            StepMenu,
            'stepMenu',
            StepMenu.Message.SelectedItem({ index: 5, item: 'Attachments' }),
          ),
        ),
        model(model => {
          expect(model.currentStep).toBe('Attachments')
        }),
        resolveFocusMenuButton,
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )
  })

  describe('preview toggle', () => {
    it.effect('ToggledPreview flips visibility', () =>
      story(
        ApplicationLive,
        args,
        togglePreview,
        model(model => {
          expect(model.preview.isVisible).toBe(true)
        }),
        togglePreview,
        model(model => {
          expect(model.preview.isVisible).toBe(false)
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )
  })

  describe('child routing', () => {
    it.effect('a PersonalInfo Message reaches its instance', () =>
      story(
        ApplicationLive,
        args,
        message(
          Block.deliver(
            PersonalInfo,
            'personalInfo',
            PersonalInfo.Message.UpdatedFirstName({ value: 'Jane' }),
          ),
        ),
        model(model => {
          expect(model.personalInfo.firstName.value).toBe('Jane')
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('a WorkHistory Message reaches its instance', () =>
      story(
        ApplicationLive,
        args,
        message(
          Block.deliver(
            WorkHistory,
            'workHistory',
            WorkHistory.Message.SucceededGenerateWorkHistoryEntryId({
              entryId: 'test-work-1',
            }),
          ),
        ),
        model(model => {
          expect(model.workHistory.entries).toHaveLength(2)
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('an Education Message reaches its instance', () =>
      story(
        ApplicationLive,
        args,
        message(
          Block.deliver(
            Education,
            'education',
            Education.Message.SucceededGenerateEducationEntryId({
              entryId: 'test-edu-1',
            }),
          ),
        ),
        model(model => {
          expect(model.education.entries).toHaveLength(2)
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('a Skills Message reaches its instance', () =>
      story(
        ApplicationLive,
        args,
        message(
          Block.deliver(
            Skills,
            'skills',
            Skills.Message.SucceededGenerateSkillsEntryId({
              entryId: 'test-skill-1',
            }),
          ),
        ),
        model(model => {
          expect(model.skills.entries).toHaveLength(2)
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('a CoverLetter Message reaches its instance', () =>
      story(
        ApplicationLive,
        args,
        message(
          Block.deliver(
            CoverLetter,
            'coverLetter',
            CoverLetter.Message.UpdatedContent({
              value: 'I love the Elm Architecture.',
            }),
          ),
        ),
        model(model => {
          expect(model.coverLetter.content).toBe('I love the Elm Architecture.')
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('a nested FileDrop Message reaches its instance', () => {
      const resume = new globalThis.File(['pdf-bytes'], 'resume.pdf', {
        type: 'application/pdf',
      })

      return story(
        ApplicationLive,
        args,
        message(
          Block.deliver(
            FileDrop.FileDrop,
            ['attachments', 'resumeDrop'],
            FileDrop.FileDrop.Message.DroppedFiles({ files: [resume] }),
          ),
        ),
        model(model => {
          expect(model.attachments.maybeResume._tag).toBe('Some')
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer))
    })
  })

  describe('submission', () => {
    it.effect(
      'ClickedSubmit on a complete application transitions to Submitting and fires command',
      () =>
        story(
          ApplicationLive,
          args,
          ...completeApplication,
          ...goToStep('Review'),
          clickSubmit,
          Command.expectExact(SubmitApplication),
          model(model => {
            expect(model.review.submission._tag).toBe('Submitting')
          }),
          Command.resolve(
            SubmitApplication,
            Review.Message.SucceededSubmitApplication(),
          ),
          model(model => {
            expect(model.review.submission._tag).toBe('SubmitSuccess')
            expect(model.review.isSubmitAttempted).toBe(true)
          }),
        ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect(
      'ClickedSubmit reveals errors through every section and nested entry without submitting',
      () =>
        story(
          ApplicationLive,
          args,
          message(
            Block.deliver(
              WorkHistory,
              'workHistory',
              WorkHistory.Message.SucceededGenerateWorkHistoryEntryId({
                entryId: 'work-history-entry-2',
              }),
            ),
          ),
          message(
            Block.deliver(
              Education,
              'education',
              Education.Message.SucceededGenerateEducationEntryId({
                entryId: 'education-entry-2',
              }),
            ),
          ),
          message(
            Block.deliver(
              Skills,
              'skills',
              Skills.Message.SucceededGenerateSkillsEntryId({
                entryId: 'skills-entry-2',
              }),
            ),
          ),
          ...goToStep('Review'),
          clickSubmit,
          Command.expectNone(),
          model(model => {
            expect(model.review.submission._tag).toBe('NotSubmitted')
            expect(model.review.isSubmitAttempted).toBe(true)
            expect(model.personalInfo.firstName._tag).toBe('Invalid')
            expect(model.personalInfo.lastName._tag).toBe('Invalid')
            expect(model.personalInfo.email._tag).toBe('Invalid')
            expect(model.education.entries).toHaveLength(2)
            expect(
              Array.every(
                model.education.entries,
                entry =>
                  entry.school._tag === 'Invalid' &&
                  entry.degree._tag === 'Invalid' &&
                  entry.fieldOfStudy._tag === 'Invalid',
              ),
            ).toBe(true)
            expect(model.workHistory.entries).toHaveLength(2)
            expect(
              Array.every(
                model.workHistory.entries,
                entry =>
                  entry.company._tag === 'Invalid' &&
                  entry.title._tag === 'Invalid',
              ),
            ).toBe(true)
            expect(model.skills.entries).toHaveLength(2)
            expect(
              Array.every(
                model.skills.entries,
                entry => entry.name._tag === 'Invalid',
              ),
            ).toBe(true)
          }),
        ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('ClickedSubmit with pending validation does not submit', () =>
      story(
        ApplicationLive,
        args,
        ...fillPersonalInfo,
        ...fillEntries,
        ...goToStep('Review'),
        clickSubmit,
        Command.expectExact(ValidateEmailAsync),
        model(model => {
          expect(model.review.submission._tag).toBe('NotSubmitted')
          expect(model.review.isSubmitAttempted).toBe(true)
          expect(model.personalInfo.email._tag).toBe('Validating')
        }),
        resolveEmailValidation,
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect(
      'ClickedSubmit preserves Valid fields rather than re-running validation',
      () =>
        story(
          ApplicationLive,
          args,
          ...completeApplication,
          ...goToStep('Review'),
          clickSubmit,
          Command.resolve(
            SubmitApplication,
            Review.Message.SucceededSubmitApplication(),
          ),
          model(model => {
            expect(model.personalInfo.firstName._tag).toBe('Valid')
            expect(model.personalInfo.firstName.value).toBe('Jane')
          }),
        ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('successful submission shows success', () =>
      story(
        ApplicationLive,
        args,
        ...completeApplication,
        ...goToStep('Review'),
        clickSubmit,
        Command.resolve(
          SubmitApplication,
          Review.Message.SucceededSubmitApplication(),
        ),
        model(model => {
          expect(model.review.submission._tag).toBe('SubmitSuccess')
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )

    it.effect('failed submission shows error', () =>
      story(
        ApplicationLive,
        args,
        ...completeApplication,
        ...goToStep('Review'),
        clickSubmit,
        Command.resolve(
          SubmitApplication,
          Review.Message.FailedSubmitApplication({ error: 'Server down' }),
        ),
        model(model => {
          expect(model.review.submission).toEqual(
            expect.objectContaining({
              _tag: 'SubmitError',
              error: 'Server down',
            }),
          )
        }),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
    )
  })
})
