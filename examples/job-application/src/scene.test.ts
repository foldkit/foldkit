import { Effect } from 'effect'
import { Scene } from 'foldkit'
import { Validating } from 'foldkit/fieldValidation'
import { modifyFields } from 'foldkit/struct'
import { describe } from 'vitest'

import { it } from '@effect/vitest'
import { Tabs } from '@foldkit/ui'

import { ApplicationBlock, layer } from './index'
import { Submission } from './model'
import { fixtureEffects, initialFlags } from './model.fixture'
import { StepTabsBlock } from './navigationComponents'

const resolveFocusTab = Scene.Command.resolve(
  Tabs.test.FocusTab,
  StepTabsBlock.Message.CompletedFocusTab(),
)

describe('view', () => {
  it.effect(
    'initial view shows the page heading and the PersonalInfo step',
    () =>
      Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.init(initialFlags),
        Scene.expect(
          Scene.role('heading', { name: 'Apply to Work on Foldkit' }),
        ).toExist(),
        Scene.expect(
          Scene.role('heading', { name: 'Personal Info' }),
        ).toExist(),
        Scene.expect(Scene.role('button', { name: 'Next →' })).toExist(),
      ),
  )

  it.effect('the step nav lists every step', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.init(initialFlags),
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
    ),
  )

  it.effect('tabs can jump directly to any step', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.init(initialFlags),
      Scene.inside(
        Scene.role('tablist', { name: 'Application steps' }),
        Scene.click(Scene.role('tab', { name: /Review$/ })),
      ),
      resolveFocusTab,
      Scene.expect(Scene.role('heading', { name: 'Review' })).toExist(),
    ),
  )

  it.effect('clicking Next advances to the Work History step', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.init(initialFlags),
      Scene.click(Scene.role('button', { name: 'Next →' })),
      Scene.expect(Scene.role('heading', { name: 'Work History' })).toExist(),
      Scene.expect(Scene.role('button', { name: '← Previous' })).toExist(),
    ),
  )

  it.effect('Previous on a later step returns to the prior step', () =>
    Effect.gen(function* () {
      const initialModel = yield* fixtureEffects.initialModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(
          modifyFields(initialModel, { currentStep: () => 'Education' }),
        ),
        Scene.expect(Scene.role('heading', { name: 'Education' })).toExist(),
        Scene.click(Scene.role('button', { name: '← Previous' })),
        Scene.expect(Scene.role('heading', { name: 'Work History' })).toExist(),
      )
    }),
  )

  it.effect('the first step does not render a Previous button', () =>
    Scene.scene(
      { block: ApplicationBlock, layer },
      Scene.init(initialFlags),
      Scene.expect(Scene.role('button', { name: '← Previous' })).toBeAbsent(),
    ),
  )

  it.effect('the Review step exposes a Submit button and hides Next', () =>
    Effect.gen(function* () {
      const initialModel = yield* fixtureEffects.initialModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(
          modifyFields(initialModel, { currentStep: () => 'Review' }),
        ),
        Scene.expect(
          Scene.role('button', { name: 'Submit Application' }),
        ).toExist(),
        Scene.expect(Scene.role('button', { name: 'Next →' })).toBeAbsent(),
      )
    }),
  )

  it.effect(
    'clicking Submit on an incomplete application shows a blocking notice',
    () =>
      Effect.gen(function* () {
        const initialModel = yield* fixtureEffects.initialModel

        return yield* Scene.scene(
          { block: ApplicationBlock, layer },
          Scene.given(
            modifyFields(initialModel, { currentStep: () => 'Review' }),
          ),
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
      }),
  )

  it.effect('a pending validation notice names the incomplete step', () =>
    Effect.gen(function* () {
      const completeModel = yield* fixtureEffects.completeModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(
          modifyFields(completeModel, {
            currentStep: () => 'Review',
            personalInfo: modifyFields({
              email: () => Validating({ value: 'jane@example.com' }),
            }),
          }),
        ),
        Scene.expect(
          Scene.role('button', { name: 'Submit Application' }),
        ).toBeEnabled(),
        Scene.click(Scene.role('button', { name: 'Submit Application' })),
        Scene.expect(
          Scene.text('Review Personal Info before submitting.'),
        ).toExist(),
      )
    }),
  )

  it.effect(
    'submit blocking notices include multiple incomplete required steps',
    () =>
      Effect.gen(function* () {
        const completeModel = yield* fixtureEffects.completeModel

        return yield* Scene.scene(
          { block: ApplicationBlock, layer },
          Scene.given(
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
          Scene.expect(
            Scene.role('button', { name: 'Submit Application' }),
          ).toBeEnabled(),
          Scene.click(Scene.role('button', { name: 'Submit Application' })),
          Scene.expect(
            Scene.text(
              'Review Work History, Education, Skills before submitting.',
            ),
          ).toExist(),
        )
      }),
  )

  it.effect('a submitting application shows a Submitting button', () =>
    Effect.gen(function* () {
      const initialModel = yield* fixtureEffects.initialModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(
          modifyFields(initialModel, {
            currentStep: () => 'Review',
            submission: () => Submission.Submitting(),
          }),
        ),
        Scene.expect(Scene.role('button', { name: 'Submitting...' })).toExist(),
      )
    }),
  )

  it.effect('a successful submission swaps the form for a success panel', () =>
    Effect.gen(function* () {
      const initialModel = yield* fixtureEffects.initialModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(
          modifyFields(initialModel, {
            currentStep: () => 'Review',
            submission: () => Submission.SubmitSuccess(),
          }),
        ),
        Scene.expect(
          Scene.text('Application Submitted', { exact: false }),
        ).toExist(),
      )
    }),
  )

  it.effect('a failed submission shows the error and a Try Again control', () =>
    Effect.gen(function* () {
      const initialModel = yield* fixtureEffects.initialModel

      return yield* Scene.scene(
        { block: ApplicationBlock, layer },
        Scene.given(
          modifyFields(initialModel, {
            currentStep: () => 'Review',
            submission: () => Submission.SubmitError({ error: 'Network down' }),
          }),
        ),
        Scene.expect(Scene.text('Network down')).toExist(),
        Scene.expect(Scene.role('button', { name: 'Try Again' })).toExist(),
      )
    }),
  )
})
