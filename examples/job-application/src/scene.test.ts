import { Validating } from 'foldkit/fieldValidation'
import {
  Command,
  click,
  expect,
  given,
  inside,
  role,
  scene,
  text,
} from 'foldkit/scene'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { test as TabsTest } from '@foldkit/ui/tabs'

import { ApplicationBlock, layer } from './index'
import { Submission } from './model'
import { it } from './model.fixture'
import { StepTabsBlock } from './navigationComponents'

const resolveFocusTab = Command.resolve(
  TabsTest.FocusTab,
  StepTabsBlock.Message.CompletedFocusTab(),
)

describe('view', () => {
  it.effect(
    'initial view shows the page heading and the PersonalInfo step',
    ({ models: { initialModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(initialModel),
        expect(role('heading', { name: 'Apply to Work on Foldkit' })).toExist(),
        expect(role('heading', { name: 'Personal Info' })).toExist(),
        expect(role('button', { name: 'Next →' })).toExist(),
      ),
  )

  it.effect('the step nav lists every step', ({ models: { initialModel } }) =>
    scene(
      { block: ApplicationBlock, layer },
      given(initialModel),
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
    ),
  )

  it.effect(
    'tabs can jump directly to any step',
    ({ models: { initialModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(initialModel),
        inside(
          role('tablist', { name: 'Application steps' }),
          click(role('tab', { name: /Review$/ })),
        ),
        resolveFocusTab,
        expect(role('heading', { name: 'Review' })).toExist(),
      ),
  )

  it.effect(
    'clicking Next advances to the Work History step',
    ({ models: { initialModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(initialModel),
        click(role('button', { name: 'Next →' })),
        expect(role('heading', { name: 'Work History' })).toExist(),
        expect(role('button', { name: '← Previous' })).toExist(),
      ),
  )

  it.effect(
    'Previous on a later step returns to the prior step',
    ({ models: { initialModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(modifyFields(initialModel, { currentStep: () => 'Education' })),
        expect(role('heading', { name: 'Education' })).toExist(),
        click(role('button', { name: '← Previous' })),
        expect(role('heading', { name: 'Work History' })).toExist(),
      ),
  )

  it.effect(
    'the first step does not render a Previous button',
    ({ models: { initialModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(initialModel),
        expect(role('button', { name: '← Previous' })).toBeAbsent(),
      ),
  )

  it.effect(
    'the Review step exposes a Submit button and hides Next',
    ({ models: { initialModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(modifyFields(initialModel, { currentStep: () => 'Review' })),
        expect(role('button', { name: 'Submit Application' })).toExist(),
        expect(role('button', { name: 'Next →' })).toBeAbsent(),
      ),
  )

  it.effect(
    'clicking Submit on an incomplete application shows a blocking notice',
    ({ models: { initialModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(modifyFields(initialModel, { currentStep: () => 'Review' })),
        expect(role('button', { name: 'Submit Application' })).toBeEnabled(),
        expect(
          text(
            'Review Personal Info, Work History, Education, Skills before submitting.',
          ),
        ).not.toExist(),
        click(role('button', { name: 'Submit Application' })),
        expect(
          text(
            'Review Personal Info, Work History, Education, Skills before submitting.',
          ),
        ).toExist(),
      ),
  )

  it.effect(
    'a pending validation notice names the incomplete step',
    ({ models: { completeModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(
          modifyFields(completeModel, {
            currentStep: () => 'Review',
            personalInfo: modifyFields({
              email: () => Validating({ value: 'jane@example.com' }),
            }),
          }),
        ),
        expect(role('button', { name: 'Submit Application' })).toBeEnabled(),
        click(role('button', { name: 'Submit Application' })),
        expect(text('Review Personal Info before submitting.')).toExist(),
      ),
  )

  it.effect(
    'submit blocking notices include multiple incomplete required steps',
    ({ models: { completeModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(
          modifyFields(completeModel, {
            currentStep: () => 'Review',
            workHistory: modifyFields({
              entries: () => [],
            }),
            education: modifyFields({
              entries: () => [],
            }),
            skills: modifyFields({
              entries: () => [],
            }),
          }),
        ),
        expect(role('button', { name: 'Submit Application' })).toBeEnabled(),
        click(role('button', { name: 'Submit Application' })),
        expect(
          text('Review Work History, Education, Skills before submitting.'),
        ).toExist(),
      ),
  )

  it.effect(
    'a submitting application shows a Submitting button',
    ({ models: { initialModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(
          modifyFields(initialModel, {
            currentStep: () => 'Review',
            submission: () => Submission.Submitting(),
          }),
        ),
        expect(role('button', { name: 'Submitting...' })).toExist(),
      ),
  )

  it.effect(
    'a successful submission swaps the form for a success panel',
    ({ models: { initialModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(
          modifyFields(initialModel, {
            currentStep: () => 'Review',
            submission: () => Submission.SubmitSuccess(),
          }),
        ),
        expect(text('Application Submitted', { exact: false })).toExist(),
      ),
  )

  it.effect(
    'a failed submission shows the error and a Try Again control',
    ({ models: { initialModel } }) =>
      scene(
        { block: ApplicationBlock, layer },
        given(
          modifyFields(initialModel, {
            currentStep: () => 'Review',
            submission: () => Submission.SubmitError({ error: 'Network down' }),
          }),
        ),
        expect(text('Network down')).toExist(),
        expect(role('button', { name: 'Try Again' })).toExist(),
      ),
  )
})
