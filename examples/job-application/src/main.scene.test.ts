import { Calendar, Scene, Ui } from 'foldkit'
import { describe, test } from 'vitest'

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
  stepMenu: Ui.Menu.init({ id: 'step-menu' }),
}

describe('scene', () => {
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
        Scene.role('navigation', { name: 'Application steps' }),
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

  test('an incomplete application disables Submit and shows a blocking notice', () => {
    Scene.scene(
      { update, view },
      Scene.with({ ...initialModel, currentStep: 'Review' }),
      Scene.expect(
        Scene.role('button', { name: 'Submit Application' }),
      ).toBeDisabled(),
      Scene.expect(
        Scene.text('Fix the errors in the highlighted steps', { exact: false }),
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
