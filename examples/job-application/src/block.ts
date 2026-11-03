import { Effect, Layer } from 'effect'

import { layer as MenuLayer } from '@foldkit/ui/menu'
import { layer as TabsLayer } from '@foldkit/ui/tabs'

import {
  Attachments,
  CoverLetter,
  Education,
  PersonalInfo,
  Skills,
  WorkHistory,
} from './blocks'
import { EffectsLayer } from './command'
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
import { ApplicationDefinition } from './definition'
import { init } from './init'
import { update } from './update'
import { view } from './view/view'

export const ApplicationBlock = ApplicationDefinition.makeBlock(
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
      EffectsLayer,
    }
  }),
).provide(
  Layer.mergeAll(
    PersonalInfo.layer,
    WorkHistory.layer,
    Education.layer,
    Skills.layer,
    CoverLetter.layer,
    Attachments.layer,
    MenuLayer,
    TabsLayer,
  ),
)
