import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { SubmitApplication } from './command'
import {
  ApplicationComposition,
  EducationBinding,
  PersonalInfoBinding,
  SkillsBinding,
  WorkHistoryBinding,
} from './composition'
import { makeFieldsStep, makeStep } from './definition'
import { Step } from './domain'
import { type Model, Submission } from './model'
import { isComplete as isEducationComplete } from './step/education/update'
import { isComplete as isPersonalInfoComplete } from './step/personalInfo/update'
import { isComplete as isSkillsComplete } from './step/skills/update'
import { isComplete as isWorkHistoryComplete } from './step/workHistory/update'

const isApplicationComplete = (model: Model): boolean =>
  isPersonalInfoComplete(model.personalInfo) &&
  isWorkHistoryComplete(model.workHistory) &&
  isEducationComplete(model.education) &&
  isSkillsComplete(model.skills)

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

const markSubmitAttemptedStep = makeFieldsStep(() => ({
  isSubmitAttempted: () => true,
}))

const submitWhenCompleteStep = makeStep(model => {
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
      markSubmitAttemptedStep,
      PersonalInfoBinding.requestRevealErrors(),
      WorkHistoryBinding.requestRevealErrors(),
      EducationBinding.requestRevealErrors(),
      SkillsBinding.requestRevealErrors(),
      submitWhenCompleteStep,
    ]),

  SucceededSubmitApplication: makeFieldsStep(() => ({
    submission: () => Submission.SubmitSuccess(),
  })),

  FailedSubmitApplication: makeFieldsStep.fromMessage(({ error }) => ({
    submission: () => Submission.SubmitError({ error }),
  })),
})
