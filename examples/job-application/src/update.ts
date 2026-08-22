import { Array, Match as M, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'

import { Menu, Tabs } from '@foldkit/ui'

import { SubmitApplication } from './command'
import { Step } from './domain'
import { Message } from './message'
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

type UpdateReturn = Update.Return<Model, Message>

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
  toParentMessage: message => Message.GotPersonalInfoMessage({ message }),
})

const foldWorkHistory = Update.foldChild({
  update: WorkHistory.update,
  read: (model: Model) => Option.some(model.workHistory),
  write: (model, nextWorkHistory) =>
    evo(model, { workHistory: () => nextWorkHistory }),
  toParentMessage: message => Message.GotWorkHistoryMessage({ message }),
})

const foldEducation = Update.foldChild({
  update: Education.update,
  read: (model: Model) => Option.some(model.education),
  write: (model, nextEducation) =>
    evo(model, { education: () => nextEducation }),
  toParentMessage: message => Message.GotEducationMessage({ message }),
})

const foldSkills = Update.foldChild({
  update: Skills.update,
  read: (model: Model) => Option.some(model.skills),
  write: (model, nextSkills) => evo(model, { skills: () => nextSkills }),
  toParentMessage: message => Message.GotSkillsMessage({ message }),
})

const foldCoverLetter = Update.foldChild({
  update: CoverLetter.update,
  read: (model: Model) => Option.some(model.coverLetter),
  write: (model, nextCoverLetter) =>
    evo(model, { coverLetter: () => nextCoverLetter }),
  toParentMessage: message => Message.GotCoverLetterMessage({ message }),
})

const foldAttachments = Update.foldChild({
  update: Attachments.update,
  read: (model: Model) => Option.some(model.attachments),
  write: (model, nextAttachments) =>
    evo(model, { attachments: () => nextAttachments }),
  toParentMessage: message => Message.GotAttachmentsMessage({ message }),
})

const foldStepMenuOutMessage = M.type<Menu.OutMessage<Step.Step>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({ model: evo(model, { currentStep: () => value }) }),
  }),
)

const foldStepMenu = Update.foldChild({
  update: StepMenu.update,
  read: (model: Model) => Option.some(model.stepMenu),
  write: (model, nextStepMenu) => evo(model, { stepMenu: () => nextStepMenu }),
  toParentMessage: message => Message.GotStepMenuMessage({ message }),
  foldOutMessage: foldStepMenuOutMessage,
})

const foldStepTabsOutMessage = M.type<Tabs.OutMessage<Step.Step>>().pipe(
  M.withReturnType<Update.Step<Model, Message>>(),
  M.tagsExhaustive({
    Selected:
      ({ value }) =>
      model => ({ model: evo(model, { currentStep: () => value }) }),
  }),
)

const foldStepTabs = Update.foldChild({
  update: StepTabs.update,
  read: (model: Model) => Option.some(model.stepTabs),
  write: (model, nextStepTabs) => evo(model, { stepTabs: () => nextStepTabs }),
  toParentMessage: message => Message.GotStepTabsMessage({ message }),
  foldOutMessage: foldStepTabsOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<UpdateReturn>(message, {
    GotPersonalInfoMessage: ({ message }) => foldPersonalInfo(model, message),

    GotWorkHistoryMessage: ({ message }) => foldWorkHistory(model, message),

    GotEducationMessage: ({ message }) => foldEducation(model, message),

    GotSkillsMessage: ({ message }) => foldSkills(model, message),

    GotCoverLetterMessage: ({ message }) => foldCoverLetter(model, message),

    GotAttachmentsMessage: ({ message }) => foldAttachments(model, message),

    GotStepMenuMessage: ({ message }) => foldStepMenu(model, message),

    GotStepTabsMessage: ({ message }) => foldStepTabs(model, message),

    NavigatedToStep: ({ step }) => ({
      model: evo(model, { currentStep: () => step }),
    }),

    ClickedNext: () => ({ model: evo(model, { currentStep: toNextStep }) }),

    ClickedPrevious: () => ({
      model: evo(model, { currentStep: toPreviousStep }),
    }),
    ToggledPreview: () => ({
      model: evo(model, { isPreviewVisible: isVisible => !isVisible }),
    }),

    ClickedSubmit: () => {
      const revealedModel = evo(model, {
        personalInfo: PersonalInfo.revealErrors,
        workHistory: WorkHistory.revealErrors,
        education: Education.revealErrors,
        skills: Skills.revealErrors,
        isSubmitAttempted: () => true,
      })
      if (isApplicationComplete(revealedModel)) {
        return {
          model: evo(revealedModel, { submission: () => Submitting() }),
          commands: [SubmitApplication()],
        }
      }
      return { model: revealedModel }
    },

    SucceededSubmitApplication: () => ({
      model: evo(model, { submission: () => SubmitSuccess() }),
    }),

    FailedSubmitApplication: ({ error }) => ({
      model: evo(model, { submission: () => SubmitError({ error }) }),
    }),
  })
