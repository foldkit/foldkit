import { Array, Effect } from 'effect'
import { Valid } from 'foldkit/fieldValidation'
import {
  Command,
  click,
  expect,
  inside,
  label,
  role,
  scene,
  text,
  type,
} from 'foldkit/scene'

import { BrowserCrypto } from '@effect/platform-browser'
import { describe, it } from '@effect/vitest'
import { Tabs } from '@foldkit/ui'

import { ApplicationLive, StepTabs } from './application'
import { args } from './flags.fixture'
import { Review, SubmitApplication } from './review'
import { PersonalInfo, ValidateEmailAsync } from './step/personalInfo'

const clickNext = click(role('button', { name: 'Next →' }))

const clickNextTimes = (count: number) => Array.makeBy(count, () => clickNext)

const resolveFocusTab = Command.resolve(
  Tabs.test.FocusTab,
  StepTabs.Message.CompletedFocusTab(),
)

const fillPersonalInfo = [
  type(label('First Name'), 'Jane'),
  type(label('Last Name'), 'Doe'),
  type(label('Email'), 'jane@example.com'),
]

const resolveEmailValidation = Command.resolve(
  ValidateEmailAsync,
  PersonalInfo.Message.CompletedValidateEmailAsync({
    validationId: 1,
    field: Valid({ value: 'jane@example.com' }),
  }),
)

const resolveEmailValidationWithStaleResult = Command.resolve(
  ValidateEmailAsync,
  PersonalInfo.Message.CompletedValidateEmailAsync({
    validationId: 0,
    field: Valid({ value: 'jane@example.com' }),
  }),
)

const fillRemainingStepsToReview = [
  clickNext,
  type(label('Company'), 'Foldkit'),
  type(label('Job Title'), 'Engineer'),
  clickNext,
  type(label('School'), 'MIT'),
  type(label('Degree'), 'BS'),
  type(label('Field of Study'), 'CS'),
  clickNext,
  type(label('Skill'), 'TypeScript'),
  ...clickNextTimes(3),
]

const completeApplicationToReview = [
  ...fillPersonalInfo,
  resolveEmailValidation,
  ...fillRemainingStepsToReview,
]

const clickSubmit = click(role('button', { name: 'Submit Application' }))

describe('view', () => {
  it.effect(
    'initial view shows the page heading and the PersonalInfo step',
    () =>
      scene(
        ApplicationLive,
        args,
        expect(role('heading', { name: 'Apply to Work on Foldkit' })).toExist(),
        expect(role('heading', { name: 'Personal Info' })).toExist(),
        expect(role('button', { name: 'Next →' })).toExist(),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('the step nav lists every step', () =>
    scene(
      ApplicationLive,
      args,
      inside(
        role('tablist', { name: 'Application steps' }),
        expect(text('Personal Info')).toExist(),
        expect(text('Work History')).toExist(),
        expect(text('Education')).toExist(),
        expect(text('Skills')).toExist(),
        expect(text('Cover Letter')).toExist(),
        expect(text('Attachments')).toExist(),
        expect(text('Review')).toExist(),
      ),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('tabs can jump directly to any step', () =>
    scene(
      ApplicationLive,
      args,
      inside(
        role('tablist', { name: 'Application steps' }),
        click(role('tab', { name: /Review$/ })),
      ),
      resolveFocusTab,
      expect(role('heading', { name: 'Review' })).toExist(),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('clicking Next advances to the Work History step', () =>
    scene(
      ApplicationLive,
      args,
      clickNext,
      expect(role('heading', { name: 'Work History' })).toExist(),
      expect(role('button', { name: '← Previous' })).toExist(),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('Previous on a later step returns to the prior step', () =>
    scene(
      ApplicationLive,
      args,
      ...clickNextTimes(2),
      expect(role('heading', { name: 'Education' })).toExist(),
      click(role('button', { name: '← Previous' })),
      expect(role('heading', { name: 'Work History' })).toExist(),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('the first step does not render a Previous button', () =>
    scene(
      ApplicationLive,
      args,
      expect(role('button', { name: '← Previous' })).toBeAbsent(),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('the Review step exposes a Submit button and hides Next', () =>
    scene(
      ApplicationLive,
      args,
      ...clickNextTimes(6),
      expect(role('button', { name: 'Submit Application' })).toExist(),
      expect(role('button', { name: 'Next →' })).toBeAbsent(),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect(
    'clicking Submit on an incomplete application shows a blocking notice',
    () =>
      scene(
        ApplicationLive,
        args,
        ...clickNextTimes(6),
        expect(role('button', { name: 'Submit Application' })).toBeEnabled(),
        expect(
          text(
            'Review Personal Info, Work History, Education, Skills before submitting.',
          ),
        ).not.toExist(),
        clickSubmit,
        expect(
          text(
            'Review Personal Info, Work History, Education, Skills before submitting.',
          ),
        ).toExist(),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('a pending validation notice names the incomplete step', () =>
    scene(
      ApplicationLive,
      args,
      ...fillPersonalInfo,
      resolveEmailValidationWithStaleResult,
      ...fillRemainingStepsToReview,
      expect(role('button', { name: 'Submit Application' })).toBeEnabled(),
      clickSubmit,
      expect(text('Review Personal Info before submitting.')).toExist(),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect(
    'submit blocking notices include multiple incomplete required steps',
    () =>
      scene(
        ApplicationLive,
        args,
        ...fillPersonalInfo,
        resolveEmailValidation,
        clickNext,
        click(role('button', { name: 'Remove position' })),
        clickNext,
        click(role('button', { name: 'Remove education' })),
        clickNext,
        click(role('button', { name: 'Remove skill' })),
        ...clickNextTimes(3),
        expect(role('button', { name: 'Submit Application' })).toBeEnabled(),
        clickSubmit,
        expect(
          text('Review Work History, Education, Skills before submitting.'),
        ).toExist(),
      ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('a submitting application shows a Submitting button', () =>
    scene(
      ApplicationLive,
      args,
      ...completeApplicationToReview,
      clickSubmit,
      expect(role('button', { name: 'Submitting...' })).toExist(),
      Command.resolve(
        SubmitApplication,
        Review.Message.SucceededSubmitApplication(),
      ),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('a successful submission swaps the form for a success panel', () =>
    scene(
      ApplicationLive,
      args,
      ...completeApplicationToReview,
      clickSubmit,
      Command.resolve(
        SubmitApplication,
        Review.Message.SucceededSubmitApplication(),
      ),
      expect(text('Application Submitted', { exact: false })).toExist(),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )

  it.effect('a failed submission shows the error and a Try Again control', () =>
    scene(
      ApplicationLive,
      args,
      ...completeApplicationToReview,
      clickSubmit,
      Command.resolve(
        SubmitApplication,
        Review.Message.FailedSubmitApplication({ error: 'Network down' }),
      ),
      expect(text('Network down')).toExist(),
      expect(role('button', { name: 'Try Again' })).toExist(),
    ).pipe(Effect.provide(BrowserCrypto.layer)),
  )
})
