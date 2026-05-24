import { Array, Match as M, Option, pipe } from 'effect'
import { Command, Ui } from 'foldkit'
import { evo } from 'foldkit/struct'

import { SubmitApplication } from './command'
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

const StepMenu = Ui.Menu.create<Step.Step>()

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
          Command.mapMessages(commands, message =>
            GotPersonalInfoMessage({ message }),
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
          Command.mapMessages(commands, message =>
            GotWorkHistoryMessage({ message }),
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
          Command.mapMessages(commands, message =>
            GotEducationMessage({ message }),
          ),
        ]
      },

      GotSkillsMessage: ({ message: stepMessage }) => {
        const [nextSkills, commands] = Skills.update(model.skills, stepMessage)
        return [
          evo(model, { skills: () => nextSkills }),
          Command.mapMessages(commands, message =>
            GotSkillsMessage({ message }),
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
          Command.mapMessages(commands, message =>
            GotCoverLetterMessage({ message }),
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
          Command.mapMessages(commands, message =>
            GotAttachmentsMessage({ message }),
          ),
        ]
      },

      GotStepMenuMessage: ({ message: menuMessage }) => {
        const [nextStepMenu, commands, maybeOutMessage] = StepMenu.update(
          model.stepMenu,
          menuMessage,
        )
        const mappedCommands = Command.mapMessages(commands, message =>
          GotStepMenuMessage({ message }),
        )
        return Option.match(maybeOutMessage, {
          onNone: (): readonly [
            Model,
            ReadonlyArray<Command.Command<Message>>,
          ] => [evo(model, { stepMenu: () => nextStepMenu }), mappedCommands],
          onSome: M.type<Ui.Menu.OutMessage<Step.Step>>().pipe(
            M.withReturnType<
              readonly [Model, ReadonlyArray<Command.Command<Message>>]
            >(),
            M.tagsExhaustive({
              Selected: ({ value }) => [
                evo(model, {
                  stepMenu: () => nextStepMenu,
                  currentStep: () => value,
                }),
                mappedCommands,
              ],
            }),
          ),
        })
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

      SubmittedApplication: () => [
        evo(model, { submission: () => Submitting() }),
        [SubmitApplication()],
      ],

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
