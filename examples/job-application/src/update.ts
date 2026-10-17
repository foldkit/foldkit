import { Array, Option, pipe } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { SubmitApplication } from './command'
import { ApplicationComposition } from './composition'
import { Step } from './domain'
import { Message } from './message'
import { type Model, Submission } from './model'
import * as Education from './step/education'
import * as PersonalInfo from './step/personalInfo'
import * as Skills from './step/skills'
import * as WorkHistory from './step/workHistory'

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

export const update = ApplicationComposition.makeUpdate((model, message) =>
  Message.match(message, {
    ClickedNext: () => ({
      model: modifyFields(model, { currentStep: toNextStep }),
    }),

    ClickedPrevious: () => ({
      model: modifyFields(model, { currentStep: toPreviousStep }),
    }),

    ToggledPreview: () => ({
      model: modifyFields(model, { isPreviewVisible: isVisible => !isVisible }),
    }),

    ClickedSubmit: () => {
      const revealedModel = modifyFields(model, {
        personalInfo: PersonalInfo.revealErrors,
        workHistory: WorkHistory.revealErrors,
        education: Education.revealErrors,
        skills: Skills.revealErrors,
        isSubmitAttempted: () => true,
      })
      if (isApplicationComplete(revealedModel)) {
        return {
          model: modifyFields(revealedModel, {
            submission: () => Submission.Submitting(),
          }),
          commands: [SubmitApplication()],
        }
      }
      return { model: revealedModel }
    },

    SucceededSubmitApplication: () => ({
      model: modifyFields(model, {
        submission: () => Submission.SubmitSuccess(),
      }),
    }),

    FailedSubmitApplication: ({ error }) => ({
      model: modifyFields(model, {
        submission: () => Submission.SubmitError({ error }),
      }),
    }),
  }),
)
