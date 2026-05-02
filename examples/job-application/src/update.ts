import { Array, Effect, Match as M, Option, pipe } from 'effect'
import { Command, Ui } from 'foldkit'
import { evo } from 'foldkit/struct'

import { submitApplication } from './command'
import { Step } from './domain'
import {
  GotAttachmentsMessage,
  GotCoverLetterMessage,
  GotEducationMessage,
  GotPersonalInfoMessage,
  GotSkillsMessage,
  GotStepMenuMessage,
  GotWorkHistoryMessage,
  type Message,
} from './message'
import { type Model, SubmitError, SubmitSuccess, Submitting } from './model'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './step'

const isApplicationComplete = (model: Model): boolean =>
  PersonalInfo.isComplete(model.personalInfo) &&
  WorkHistory.isComplete(model.workHistory) &&
  Education.isComplete(model.education) &&
  Skills.isComplete(model.skills)

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

const nextStep = (current: Step.Step): Step.Step =>
  pipe(
    Step.all,
    Array.get(Step.indexOf(current) + 1),
    Option.getOrElse(() => current),
  )

const previousStep = (current: Step.Step): Step.Step =>
  pipe(
    Step.all,
    Array.get(Step.indexOf(current) - 1),
    Option.getOrElse(() => current),
  )

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      GotPersonalInfoMessage: ({ message: stepMessage }) => {
        const [nextPersonalInfo, commands] = PersonalInfo.update(
          model.personalInfo,
          stepMessage,
        )
        return [
          evo(model, { personalInfo: () => nextPersonalInfo }),
          commands.map(
            Command.mapEffect(
              Effect.map(message => GotPersonalInfoMessage({ message })),
            ),
          ),
        ]
      },

      GotWorkHistoryMessage: ({ message: stepMessage }) => {
        const [nextWorkHistory, commands] = WorkHistory.update(
          model.workHistory,
          stepMessage,
        )
        return [
          evo(model, { workHistory: () => nextWorkHistory }),
          commands.map(
            Command.mapEffect(
              Effect.map(message => GotWorkHistoryMessage({ message })),
            ),
          ),
        ]
      },

      GotEducationMessage: ({ message: stepMessage }) => {
        const [nextEducation, commands] = Education.update(
          model.education,
          stepMessage,
        )
        return [
          evo(model, { education: () => nextEducation }),
          commands.map(
            Command.mapEffect(
              Effect.map(message => GotEducationMessage({ message })),
            ),
          ),
        ]
      },

      GotSkillsMessage: ({ message: stepMessage }) => {
        const [nextSkills, commands] = Skills.update(model.skills, stepMessage)
        return [
          evo(model, { skills: () => nextSkills }),
          commands.map(
            Command.mapEffect(
              Effect.map(message => GotSkillsMessage({ message })),
            ),
          ),
        ]
      },

      GotCoverLetterMessage: ({ message: stepMessage }) => {
        const [nextCoverLetter, commands] = CoverLetter.update(
          model.coverLetter,
          stepMessage,
        )
        return [
          evo(model, { coverLetter: () => nextCoverLetter }),
          commands.map(
            Command.mapEffect(
              Effect.map(message => GotCoverLetterMessage({ message })),
            ),
          ),
        ]
      },

      GotAttachmentsMessage: ({ message: stepMessage }) => {
        const [nextAttachments, commands] = Attachments.update(
          model.attachments,
          stepMessage,
        )
        return [
          evo(model, { attachments: () => nextAttachments }),
          commands.map(
            Command.mapEffect(
              Effect.map(message => GotAttachmentsMessage({ message })),
            ),
          ),
        ]
      },

      GotStepMenuMessage: ({ message: menuMessage }) => {
        const [nextStepMenu, commands] = Ui.Menu.update(
          model.stepMenu,
          menuMessage,
        )
        return [
          evo(model, { stepMenu: () => nextStepMenu }),
          commands.map(
            Command.mapEffect(
              Effect.map(message => GotStepMenuMessage({ message })),
            ),
          ),
        ]
      },

      NavigatedToStep: ({ step }) => [
        evo(model, { currentStep: () => step }),
        [],
      ],

      ClickedNext: () => [
        evo(model, { currentStep: () => nextStep(model.currentStep) }),
        [],
      ],

      ClickedPrevious: () => [
        evo(model, {
          currentStep: () => previousStep(model.currentStep),
        }),
        [],
      ],

      ToggledPreview: () => [
        evo(model, { isPreviewVisible: isVisible => !isVisible }),
        [],
      ],

      ClickedSubmit: () => {
        const revealedModel = evo(model, {
          personalInfo: PersonalInfo.revealErrors,
          workHistory: WorkHistory.revealErrors,
          education: Education.revealErrors,
          skills: Skills.revealErrors,
          hasAttemptedSubmit: () => true,
        })
        if (isApplicationComplete(revealedModel)) {
          return [
            evo(revealedModel, { submission: () => Submitting() }),
            [submitApplication],
          ]
        }
        return [revealedModel, []]
      },

      SucceededSubmitApplication: () => [
        evo(model, { submission: () => SubmitSuccess() }),
        [],
      ],

      FailedSubmitApplication: ({ error }) => [
        evo(model, { submission: () => SubmitError({ error }) }),
        [],
      ],
    }),
  )
