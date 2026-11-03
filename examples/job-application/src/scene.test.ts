import { Effect } from 'effect'
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

import { ApplicationBlock } from './block'
import { Submission } from './model'
import { test } from './model.fixture'
import { StepTabsBlock } from './navigationComponents'

const resolveFocusTab = Command.resolve(
  TabsTest.FocusTab,
  StepTabsBlock.Message.CompletedFocusTab(),
)

describe('view', () => {
  test('initial view shows the page heading and the PersonalInfo step', async ({
    models: { initialModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        expect(role('heading', { name: 'Apply to Work on Foldkit' })).toExist(),
        expect(role('heading', { name: 'Personal Info' })).toExist(),
        expect(role('button', { name: 'Next →' })).toExist(),
      ),
    )
  })

  test('the step nav lists every step', async ({
    models: { initialModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
  })

  test('tabs can jump directly to any step', async ({
    models: { initialModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        inside(
          role('tablist', { name: 'Application steps' }),
          click(role('tab', { name: /Review$/ })),
        ),
        resolveFocusTab,
        expect(role('heading', { name: 'Review' })).toExist(),
      ),
    )
  })

  test('clicking Next advances to the Work History step', async ({
    models: { initialModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        click(role('button', { name: 'Next →' })),
        expect(role('heading', { name: 'Work History' })).toExist(),
        expect(role('button', { name: '← Previous' })).toExist(),
      ),
    )
  })

  test('Previous on a later step returns to the prior step', async ({
    models: { initialModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(modifyFields(initialModel, { currentStep: () => 'Education' })),
        expect(role('heading', { name: 'Education' })).toExist(),
        click(role('button', { name: '← Previous' })),
        expect(role('heading', { name: 'Work History' })).toExist(),
      ),
    )
  })

  test('the first step does not render a Previous button', async ({
    models: { initialModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(initialModel),
        expect(role('button', { name: '← Previous' })).toBeAbsent(),
      ),
    )
  })

  test('the Review step exposes a Submit button and hides Next', async ({
    models: { initialModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(modifyFields(initialModel, { currentStep: () => 'Review' })),
        expect(role('button', { name: 'Submit Application' })).toExist(),
        expect(role('button', { name: 'Next →' })).toBeAbsent(),
      ),
    )
  })

  test('clicking Submit on an incomplete application shows a blocking notice', async ({
    models: { initialModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
  })

  test('a pending validation notice names the incomplete step', async ({
    models: { completeModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
  })

  test('submit blocking notices include multiple incomplete required steps', async ({
    models: { completeModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
  })

  test('a submitting application shows a Submitting button', async ({
    models: { initialModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(
          modifyFields(initialModel, {
            currentStep: () => 'Review',
            submission: () => Submission.Submitting(),
          }),
        ),
        expect(role('button', { name: 'Submitting...' })).toExist(),
      ),
    )
  })

  test('a successful submission swaps the form for a success panel', async ({
    models: { initialModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
        given(
          modifyFields(initialModel, {
            currentStep: () => 'Review',
            submission: () => Submission.SubmitSuccess(),
          }),
        ),
        expect(text('Application Submitted', { exact: false })).toExist(),
      ),
    )
  })

  test('a failed submission shows the error and a Try Again control', async ({
    models: { initialModel },
  }) => {
    await Effect.runPromise(
      scene(
        ApplicationBlock,
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
})
