import { Array, Option, pipe } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Menu, Tabs } from '@foldkit/ui'

import { SubmitApplication } from './command'
import { Step } from './domain'
import { Message } from './message'
import { type Model, Submission } from './model'
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
    modifyFields(model, { personalInfo: () => nextPersonalInfo }),
  toParentMessage: message => Message.GotPersonalInfoMessage({ message }),
})

const foldWorkHistory = Update.foldChild({
  update: WorkHistory.update,
  read: (model: Model) => Option.some(model.workHistory),
  write: (model, nextWorkHistory) =>
    modifyFields(model, { workHistory: () => nextWorkHistory }),
  toParentMessage: message => Message.GotWorkHistoryMessage({ message }),
})

const foldEducation = Update.foldChild({
  update: Education.update,
  read: (model: Model) => Option.some(model.education),
  write: (model, nextEducation) =>
    modifyFields(model, { education: () => nextEducation }),
  toParentMessage: message => Message.GotEducationMessage({ message }),
})

const foldSkills = Update.foldChild({
  update: Skills.update,
  read: (model: Model) => Option.some(model.skills),
  write: (model, nextSkills) =>
    modifyFields(model, { skills: () => nextSkills }),
  toParentMessage: message => Message.GotSkillsMessage({ message }),
})

const foldCoverLetter = Update.foldChild({
  update: CoverLetter.update,
  read: (model: Model) => Option.some(model.coverLetter),
  write: (model, nextCoverLetter) =>
    modifyFields(model, { coverLetter: () => nextCoverLetter }),
  toParentMessage: message => Message.GotCoverLetterMessage({ message }),
})

const foldAttachments = Update.foldChild({
  update: Attachments.update,
  read: (model: Model) => Option.some(model.attachments),
  write: (model, nextAttachments) =>
    modifyFields(model, { attachments: () => nextAttachments }),
  toParentMessage: message => Message.GotAttachmentsMessage({ message }),
})

const foldStepMenuOutMessage = Menu.OutMessage.match<
  Update.Step<Model, Message>,
  Menu.OutMessage<Step.Step>
>({
  Selected:
    ({ value }) =>
    model => ({ model: modifyFields(model, { currentStep: () => value }) }),
})

const foldStepMenu = Update.foldChild({
  update: StepMenu.update,
  read: (model: Model) => Option.some(model.stepMenu),
  write: (model, nextStepMenu) =>
    modifyFields(model, { stepMenu: () => nextStepMenu }),
  toParentMessage: message => Message.GotStepMenuMessage({ message }),
  foldOutMessage: foldStepMenuOutMessage,
})

const foldStepTabsOutMessage = Tabs.OutMessage.match<
  Update.Step<Model, Message>,
  Tabs.OutMessage<Step.Step>
>({
  Selected:
    ({ value }) =>
    model => ({ model: modifyFields(model, { currentStep: () => value }) }),
})

const foldStepTabs = Update.foldChild({
  update: StepTabs.update,
  read: (model: Model) => Option.some(model.stepTabs),
  write: (model, nextStepTabs) =>
    modifyFields(model, { stepTabs: () => nextStepTabs }),
  toParentMessage: message => Message.GotStepTabsMessage({ message }),
  foldOutMessage: foldStepTabsOutMessage,
})

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    GotPersonalInfoMessage: ({ message }) => foldPersonalInfo(model, message),

    GotWorkHistoryMessage: ({ message }) => foldWorkHistory(model, message),

    GotEducationMessage: ({ message }) => foldEducation(model, message),

    GotSkillsMessage: ({ message }) => foldSkills(model, message),

    GotCoverLetterMessage: ({ message }) => foldCoverLetter(model, message),

    GotAttachmentsMessage: ({ message }) => foldAttachments(model, message),

    GotStepMenuMessage: ({ message }) => foldStepMenu(model, message),

    GotStepTabsMessage: ({ message }) => foldStepTabs(model, message),

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
  })
