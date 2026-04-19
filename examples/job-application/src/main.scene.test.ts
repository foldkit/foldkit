import { Array, Option, flow } from 'effect'
import { Calendar, Scene, Ui } from 'foldkit'
import { Valid } from 'foldkit/fieldValidation'
import { evo } from 'foldkit/struct'
import { describe, test } from 'vitest'

import { SubmitApplication } from './command'
import { SucceededSubmitApplication } from './message'
import { type Model, NotSubmitted } from './model'
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
  workHistory: WorkHistory.init(today),
  education: Education.init(today),
  skills: Skills.init(),
  coverLetter: CoverLetter.init(),
  attachments: Attachments.init(),
  isPreviewVisible: false,
  submission: NotSubmitted(),
  stepMenu: Ui.Menu.init({ id: 'step-menu' }),
}

const headOrThrow = flow(Array.head, Option.getOrThrow)

const completeModel: Model = evo(initialModel, {
  currentStep: () => 'Review',
  personalInfo: () =>
    evo(initialModel.personalInfo, {
      firstName: () => Valid({ value: 'Jane' }),
      lastName: () => Valid({ value: 'Doe' }),
      email: () => Valid({ value: 'jane@example.com' }),
    }),
  workHistory: () =>
    evo(initialModel.workHistory, {
      entries: () => [
        evo(headOrThrow(initialModel.workHistory.entries), {
          company: () => Valid({ value: 'Acme Corp' }),
          title: () => Valid({ value: 'Engineer' }),
        }),
      ],
    }),
  education: () =>
    evo(initialModel.education, {
      entries: () => [
        evo(headOrThrow(initialModel.education.entries), {
          school: () => Valid({ value: 'MIT' }),
          degree: () => Valid({ value: "Bachelor's" }),
          fieldOfStudy: () => Valid({ value: 'Computer Science' }),
        }),
      ],
    }),
  skills: () =>
    evo(initialModel.skills, {
      entries: () => [
        evo(headOrThrow(initialModel.skills.entries), {
          name: () => Valid({ value: 'TypeScript' }),
        }),
      ],
    }),
})

describe('Job Application scene', () => {
  test('initial view shows the page heading and personal info fields', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.expect(
        Scene.role('heading', { name: 'Apply to Work on Foldkit' }),
      ).toExist(),
      Scene.expect(Scene.role('heading', { name: 'Personal Info' })).toExist(),
      Scene.expect(Scene.label('First Name')).toExist(),
      Scene.expect(Scene.label('Last Name')).toExist(),
      Scene.expect(Scene.label('Email')).toExist(),
      Scene.expect(Scene.role('button', { name: 'Next \u2192' })).toExist(),
    )
  })

  test('clicking Next advances from Personal Info to Work History', () => {
    Scene.scene(
      { update, view },
      Scene.with(initialModel),
      Scene.click(Scene.role('button', { name: 'Next \u2192' })),
      Scene.expect(Scene.role('heading', { name: 'Work History' })).toExist(),
      Scene.expect(Scene.label('Company')).toExist(),
      Scene.expect(Scene.label('Job Title')).toExist(),
    )
  })

  test('removing the first of two work entries diffs down to one', () => {
    const workHistoryModel = evo(initialModel, {
      currentStep: () => 'WorkHistory',
      workHistory: () =>
        evo(initialModel.workHistory, {
          entries: () => [
            WorkHistory.Entry.init('entry-1', today),
            WorkHistory.Entry.init('entry-2', today),
          ],
        }),
    })

    Scene.scene(
      { update, view },
      Scene.with(workHistoryModel),
      Scene.expectAll(Scene.all.label('Company')).toHaveCount(2),
      Scene.click(
        Scene.first(Scene.all.role('button', { name: 'Remove position' })),
      ),
      Scene.expectAll(Scene.all.label('Company')).toHaveCount(1),
    )
  })

  test('Review with incomplete model disables submit and shows blocked notice', () => {
    const reviewIncompleteModel = evo(initialModel, {
      currentStep: () => 'Review',
    })

    Scene.scene(
      { update, view },
      Scene.with(reviewIncompleteModel),
      Scene.expect(
        Scene.role('button', { name: 'Submit Application' }),
      ).toBeDisabled(),
      Scene.expect(
        Scene.text(
          'Fix the errors in the highlighted steps before submitting.',
        ),
      ).toExist(),
    )
  })

  test('Review with complete model enables submit and completes the flow', () => {
    Scene.scene(
      { update, view },
      Scene.with(completeModel),
      Scene.expect(
        Scene.role('button', { name: 'Submit Application' }),
      ).toBeEnabled(),
      Scene.click(Scene.role('button', { name: 'Submit Application' })),
      Scene.expect(Scene.role('button', { name: 'Submitting...' })).toExist(),
      Scene.expectExactCommands(SubmitApplication),
      Scene.resolve(SubmitApplication, SucceededSubmitApplication()),
      Scene.expect(Scene.role('status')).toContainText(
        'Application Submitted!',
      ),
    )
  })
})
