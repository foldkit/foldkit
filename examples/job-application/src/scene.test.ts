import { Calendar, Scene } from 'foldkit'
import { Valid, Validating } from 'foldkit/fieldValidation'
import { describe, test } from 'vitest'

import { Menu, Tabs } from '@foldkit/ui'

import { GotStepTabsMessage } from './message'
import {
  type Model,
  NotSubmitted,
  SubmitError,
  SubmitSuccess,
  Submitting,
} from './model'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './step'
import { update } from './update'
import { view } from './view'

const today = Calendar.make(2026, 4, 16)

const initialModel: Model = {
  currentStep: 'PersonalInfo',
  personalInfo: PersonalInfo.init(today),
  workHistory: WorkHistory.init(today, 'work-history-entry-1'),
  education: Education.init(today, 'education-entry-1'),
  skills: Skills.init('skills-entry-1'),
  coverLetter: CoverLetter.init(),
  attachments: Attachments.init(),
  isPreviewVisible: false,
  submission: NotSubmitted(),
  stepMenu: Menu.init({ id: 'step-menu' }),
  stepTabs: Tabs.init({ id: 'step-tabs' }),
  isSubmitAttempted: false,
}

const completeModel: Model = {
  ...initialModel,
  personalInfo: {
    ...initialModel.personalInfo,
    firstName: Valid({ value: 'Jane' }),
    lastName: Valid({ value: 'Doe' }),
    email: Valid({ value: 'jane@example.com' }),
  },
  workHistory: {
    ...initialModel.workHistory,
    entries: initialModel.workHistory.entries.map(entry => ({
      ...entry,
      company: Valid({ value: 'Foldkit' }),
      title: Valid({ value: 'Engineer' }),
    })),
  },
  education: {
    ...initialModel.education,
    entries: initialModel.education.entries.map(entry => ({
      ...entry,
      school: Valid({ value: 'MIT' }),
      degree: Valid({ value: 'BS' }),
      fieldOfStudy: Valid({ value: 'CS' }),
    })),
  },
  skills: {
    ...initialModel.skills,
    entries: initialModel.skills.entries.map(entry => ({
      ...entry,
      name: Valid({ value: 'TypeScript' }),
    })),
  },
}

const resolveFocusTab = Scene.Command.resolve(
  Tabs.FocusTab,
  Tabs.CompletedFocusTab(),
  message => GotStepTabsMessage({ message }),
)

describe('view', () => {
  test('initial view shows the page heading and the PersonalInfo step', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(
        Scene.role('heading', { name: 'Apply to Work on Foldkit' }),
      ).toExist(),
      Scene.expect(Scene.role('heading', { name: 'Personal Info' })).toExist(),
      Scene.expect(Scene.role('button', { name: 'Next →' })).toExist(),
    )
  })

  test('the step nav lists every step', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.inside(
        Scene.role('tablist', { name: 'Application steps' }),
        Scene.expect(Scene.text('Personal Info')).toExist(),
        Scene.expect(Scene.text('Work History')).toExist(),
        Scene.expect(Scene.text('Education')).toExist(),
        Scene.expect(Scene.text('Skills')).toExist(),
        Scene.expect(Scene.text('Cover Letter')).toExist(),
        Scene.expect(Scene.text('Attachments')).toExist(),
        Scene.expect(Scene.text('Review')).toExist(),
      ),
    )
  })

  test('tabs can jump directly to any step', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.inside(
        Scene.role('tablist', { name: 'Application steps' }),
        Scene.click(Scene.role('tab', { name: /Review$/ })),
      ),
      resolveFocusTab,
      Scene.expect(Scene.role('heading', { name: 'Review' })).toExist(),
    )
  })

  test('clicking Next advances to the Work History step', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('button', { name: 'Next →' })),
      Scene.expect(Scene.role('heading', { name: 'Work History' })).toExist(),
      Scene.expect(Scene.role('button', { name: '← Previous' })).toExist(),
    )
  })

  test('Previous on a later step returns to the prior step', () => {
    Scene.scene(
      { update, view },
      Scene.with({ ...initialModel, currentStep: 'Education' }),
      Scene.expect(Scene.role('heading', { name: 'Education' })).toExist(),
      Scene.click(Scene.role('button', { name: '← Previous' })),
      Scene.expect(Scene.role('heading', { name: 'Work History' })).toExist(),
    )
  })

  test('the first step does not render a Previous button', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(Scene.role('button', { name: '← Previous' })).toBeAbsent(),
    )
  })

  test('the Review step exposes a Submit button and hides Next', () => {
    Scene.scene(
      { update, view },
      Scene.with({ ...initialModel, currentStep: 'Review' }),
      Scene.expect(
        Scene.role('button', { name: 'Submit Application' }),
      ).toExist(),
      Scene.expect(Scene.role('button', { name: 'Next →' })).toBeAbsent(),
    )
  })

  test('clicking Submit on an incomplete application shows a blocking notice', () => {
    Scene.scene(
      { update, view },
      Scene.with({ ...initialModel, currentStep: 'Review' }),
      Scene.expect(
        Scene.role('button', { name: 'Submit Application' }),
      ).toBeEnabled(),
      Scene.expect(
        Scene.text(
          'Review Personal Info, Work History, Education, Skills before submitting.',
        ),
      ).not.toExist(),
      Scene.click(Scene.role('button', { name: 'Submit Application' })),
      Scene.expect(
        Scene.text(
          'Review Personal Info, Work History, Education, Skills before submitting.',
        ),
      ).toExist(),
    )
  })

  test('a pending validation notice names the incomplete step', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...completeModel,
        currentStep: 'Review',
        personalInfo: {
          ...completeModel.personalInfo,
          email: Validating({ value: 'jane@example.com' }),
        },
      }),
      Scene.expect(
        Scene.role('button', { name: 'Submit Application' }),
      ).toBeEnabled(),
      Scene.click(Scene.role('button', { name: 'Submit Application' })),
      Scene.expect(
        Scene.text('Review Personal Info before submitting.'),
      ).toExist(),
    )
  })

  test('submit blocking notices include multiple incomplete required steps', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...completeModel,
        currentStep: 'Review',
        workHistory: {
          ...completeModel.workHistory,
          entries: [],
        },
        education: {
          ...completeModel.education,
          entries: [],
        },
        skills: {
          ...completeModel.skills,
          entries: [],
        },
      }),
      Scene.expect(
        Scene.role('button', { name: 'Submit Application' }),
      ).toBeEnabled(),
      Scene.click(Scene.role('button', { name: 'Submit Application' })),
      Scene.expect(
        Scene.text('Review Work History, Education, Skills before submitting.'),
      ).toExist(),
    )
  })

  test('a submitting application shows a Submitting button', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...initialModel,
        currentStep: 'Review',
        submission: Submitting(),
      }),
      Scene.expect(Scene.role('button', { name: 'Submitting...' })).toExist(),
    )
  })

  test('a successful submission swaps the form for a success panel', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...initialModel,
        currentStep: 'Review',
        submission: SubmitSuccess(),
      }),
      Scene.expect(
        Scene.text('Application Submitted', { exact: false }),
      ).toExist(),
    )
  })

  test('a failed submission shows the error and a Try Again control', () => {
    Scene.scene(
      { update, view },
      Scene.with({
        ...initialModel,
        currentStep: 'Review',
        submission: SubmitError({ error: 'Network down' }),
      }),
      Scene.expect(Scene.text('Network down')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Try Again' })).toExist(),
    )
  })
})
