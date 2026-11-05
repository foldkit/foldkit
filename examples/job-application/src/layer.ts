import { Effect, Layer } from 'effect'

import { Menu, Tabs } from '@foldkit/ui'

import { ApplicationBlock } from './block'
import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './blocks'
import { SubmitApplication } from './command'
import {
  AttachmentsBinding,
  CoverLetterBinding,
  EducationBinding,
  PersonalInfoBinding,
  SkillsBinding,
  StepMenuBinding,
  StepTabsBinding,
  WorkHistoryBinding,
} from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view/view'

export const layer = ApplicationBlock.makeLayer(
  Effect.gen(function* () {
    const personalInfo = yield* PersonalInfoBinding
    const workHistory = yield* WorkHistoryBinding
    const education = yield* EducationBinding
    const skills = yield* SkillsBinding
    const coverLetter = yield* CoverLetterBinding
    const attachments = yield* AttachmentsBinding
    const stepMenu = yield* StepMenuBinding
    const stepTabs = yield* StepTabsBinding

    return {
      children: [
        personalInfo,
        workHistory,
        education,
        skills,
        coverLetter,
        attachments,
        stepMenu,
        stepTabs,
      ],
      init,
      update,
      view,
      EffectsLayer: SubmitApplication.layer,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      PersonalInfo.layer,
      WorkHistory.layer,
      Education.layer,
      Skills.layer,
      CoverLetter.layer,
      Attachments.layer,
      Menu.layer,
      Tabs.layer,
    ),
  ),
)
