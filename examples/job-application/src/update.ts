import { Array, Match as M, Option, pipe } from 'effect'
import { Command, Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Menu, Tabs } from '@foldkit/ui'

import { SubmitApplication } from './command'
import { Step } from './domain'
import {
  GotAttachmentsMessage,
  GotCoverLetterMessage,
  GotEducationMessage,
  GotPersonalInfoMessage,
  GotSkillsMessage,
  GotStepMenuMessage,
  GotStepTabsMessage,
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

const StepMenu = Menu.create<Step.Step>()
const StepTabs = Tabs.create<Step.Step>()

const isApplicationComplete = (model: Model): boolean =>
  PersonalInfo.isComplete(model.personalInfo) &&
  WorkHistory.isComplete(model.workHistory) &&
  Education.isComplete(model.education) &&
  Skills.isComplete(model.skills)

type UpdateReturn = readonly [Model, ReadonlyArray<Command.Command<Message>>]
const withUpdateReturn = M.withReturnType<UpdateReturn>()

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

const foldPersonalInfo = Update.foldChild({
  update: PersonalInfo.update,
  read: (model: Model) => Option.some(model.personalInfo),
  write: (model, nextPersonalInfo) =>
    evo(model, { personalInfo: () => nextPersonalInfo }),
  toParentMessage: message => GotPersonalInfoMessage({ message }),
})

const foldWorkHistory = Update.foldChild({
  update: WorkHistory.update,
  read: (model: Model) => Option.some(model.workHistory),
  write: (model, nextWorkHistory) =>
    evo(model, { workHistory: () => nextWorkHistory }),
  toParentMessage: message => GotWorkHistoryMessage({ message }),
})

const foldEducation = Update.foldChild({
  update: Education.update,
  read: (model: Model) => Option.some(model.education),
  write: (model, nextEducation) =>
    evo(model, { education: () => nextEducation }),
  toParentMessage: message => GotEducationMessage({ message }),
})

const foldSkills = Update.foldChild({
  update: Skills.update,
  read: (model: Model) => Option.some(model.skills),
  write: (model, nextSkills) => evo(model, { skills: () => nextSkills }),
  toParentMessage: message => GotSkillsMessage({ message }),
})

const foldCoverLetter = Update.foldChild({
  update: CoverLetter.update,
  read: (model: Model) => Option.some(model.coverLetter),
  write: (model, nextCoverLetter) =>
    evo(model, { coverLetter: () => nextCoverLetter }),
  toParentMessage: message => GotCoverLetterMessage({ message }),
})

const foldAttachments = Update.foldChild({
  update: Attachments.update,
  read: (model: Model) => Option.some(model.attachments),
  write: (model, nextAttachments) =>
    evo(model, { attachments: () => nextAttachments }),
  toParentMessage: message => GotAttachmentsMessage({ message }),
})

const foldStepMenu = Update.foldChild({
  update: StepMenu.update,
  read: (model: Model) => Option.some(model.stepMenu),
  write: (model, nextStepMenu) => evo(model, { stepMenu: () => nextStepMenu }),
  toParentMessage: message => GotStepMenuMessage({ message }),
  foldOutMessage: M.type<Menu.OutMessage<Step.Step>>().pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      Selected:
        ({ value }) =>
        model => [evo(model, { currentStep: () => value }), []],
    }),
  ),
})

const foldStepTabs = Update.foldChild({
  update: StepTabs.update,
  read: (model: Model) => Option.some(model.stepTabs),
  write: (model, nextStepTabs) => evo(model, { stepTabs: () => nextStepTabs }),
  toParentMessage: message => GotStepTabsMessage({ message }),
  foldOutMessage: M.type<Tabs.OutMessage<Step.Step>>().pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      Selected:
        ({ value }) =>
        model => [evo(model, { currentStep: () => value }), []],
    }),
  ),
})

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      GotPersonalInfoMessage: ({ message }) => foldPersonalInfo(message)(model),

      GotWorkHistoryMessage: ({ message }) => foldWorkHistory(message)(model),

      GotEducationMessage: ({ message }) => foldEducation(message)(model),

      GotSkillsMessage: ({ message }) => foldSkills(message)(model),

      GotCoverLetterMessage: ({ message }) => foldCoverLetter(message)(model),

      GotAttachmentsMessage: ({ message }) => foldAttachments(message)(model),

      GotStepMenuMessage: ({ message }) => foldStepMenu(message)(model),

      GotStepTabsMessage: ({ message }) => foldStepTabs(message)(model),

      NavigatedToStep: ({ step }) => [
        evo(model, { currentStep: () => step }),
        [],
      ],

      ClickedNext: () => [evo(model, { currentStep: toNextStep }), []],

      ClickedPrevious: () => [evo(model, { currentStep: toPreviousStep }), []],
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
          isSubmitAttempted: () => true,
        })
        if (isApplicationComplete(revealedModel)) {
          return [
            evo(revealedModel, { submission: () => Submitting() }),
            [SubmitApplication()],
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
