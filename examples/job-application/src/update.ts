import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { makeFieldsStep, makeStep } from './block'
import { Education, PersonalInfo, Skills, WorkHistory } from './blocks'
import { SubmitApplication } from './command'
import {
  ApplicationComposition,
  EducationBinding,
  PersonalInfoBinding,
  SkillsBinding,
  WorkHistoryBinding,
} from './composition'
import { Step } from './domain'
import { type Model, Submission } from './model'

const isApplicationComplete = (model: Model): boolean =>
  PersonalInfo.isComplete(model.personalInfo) &&
  WorkHistory.isComplete(model.workHistory) &&
  Education.isComplete(model.education) &&
  Skills.isComplete(model.skills)

const toNextStep = (current: Step.Step): Step.Step =>
  pipe(
    Step.all,
    Array.get(Step.indexOf(current) + 1),
    Option.getOrElse(() => current),
  )

const toPreviousStep = (current: Step.Step): Step.Step =>
  pipe(
    Step.all,
    Array.get(Step.indexOf(current) - 1),
    Option.getOrElse(() => current),
  )

const markSubmitAttempted = makeFieldsStep(() => ({
  isSubmitAttempted: () => true,
}))

const submitWhenComplete = makeStep(model => {
  if (isApplicationComplete(model)) {
    return {
      model: modifyFields(model, {
        submission: () => Submission.Submitting(),
      }),
      commands: [SubmitApplication()],
    }
  }

  return { model }
})

export const update = ApplicationComposition.makeUpdate({
  ClickedNext: makeFieldsStep(() => ({
    currentStep: toNextStep,
  })),

  ClickedPrevious: makeFieldsStep(() => ({
    currentStep: toPreviousStep,
  })),

  ToggledPreview: makeFieldsStep(() => ({
    isPreviewVisible: isVisible => !isVisible,
  })),

  ClickedSubmit: model =>
    Update.combineSteps(model, [
      markSubmitAttempted,
      PersonalInfoBinding.requestRevealErrors(),
      WorkHistoryBinding.requestRevealErrors(),
      EducationBinding.requestRevealErrors(),
      SkillsBinding.requestRevealErrors(),
      submitWhenComplete,
    ]),

  SucceededSubmitApplication: makeFieldsStep(() => ({
    submission: () => Submission.SubmitSuccess(),
  })),

  FailedSubmitApplication: makeFieldsStep.fromMessage(({ error }) => ({
    submission: () => Submission.SubmitError({ error }),
  })),
})
