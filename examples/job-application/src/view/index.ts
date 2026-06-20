import clsx from 'clsx'
import { Array, Equal, HashSet, Match as M, Option, pipe } from 'effect'
import {
  type ChildAttribute,
  type Document,
  type Html,
  html,
} from 'foldkit/html'

import { Button, Tabs } from '@foldkit/ui'

import { Step } from '../domain'
import {
  ClickedNext,
  ClickedPrevious,
  GotAttachmentsMessage,
  GotCoverLetterMessage,
  GotEducationMessage,
  GotPersonalInfoMessage,
  GotSkillsMessage,
  GotStepMenuMessage,
  GotStepTabsMessage,
  GotWorkHistoryMessage,
  Message,
  ToggledPreview,
} from '../message'
import { type Model } from '../model'
import { Education, PersonalInfo, Skills, WorkHistory } from '../step'
import { attachmentsView } from './attachments'
import { coverLetterView } from './coverLetter'
import { educationView } from './education'
import { personalInfoView } from './personalInfo'
import { preview } from './preview'
import { review } from './review'
import { skillsView } from './skills'
import { stepMenu, stepTabButton } from './stepNav'
import { workHistoryView } from './workHistory'

const StepTabs = Tabs.create<Step.Step>()

const stepHasErrors =
  (model: Model) =>
  (step: Step.Step): boolean =>
    M.value(step).pipe(
      M.when('PersonalInfo', () => PersonalInfo.hasErrors(model.personalInfo)),
      M.when('WorkHistory', () => WorkHistory.hasErrors(model.workHistory)),
      M.when('Education', () => Education.hasErrors(model.education)),
      M.when('Skills', () => Skills.hasErrors(model.skills)),
      M.orElse(() => false),
    )

const stepIsComplete =
  (model: Model) =>
  (step: Step.Step): boolean =>
    M.value(step).pipe(
      M.when('PersonalInfo', () => PersonalInfo.isComplete(model.personalInfo)),
      M.when('WorkHistory', () => WorkHistory.isComplete(model.workHistory)),
      M.when('Education', () => Education.isComplete(model.education)),
      M.when('Skills', () => Skills.isComplete(model.skills)),
      M.orElse(() => true),
    )

const stepNeedsAttention =
  (model: Model) =>
  (step: Step.Step): boolean =>
    stepHasErrors(model)(step) ||
    (model.isSubmitAttempted && !stepIsComplete(model)(step))

const stepsNeedingAttention = (model: Model): ReadonlyArray<Step.Step> =>
  Array.filter(Step.all, stepNeedsAttention(model))

const stepContent = (
  model: Model,
  attentionSteps: ReadonlyArray<Step.Step>,
): Html => {
  const h = html<Message>()

  return M.value(model.currentStep).pipe(
    M.when('PersonalInfo', () =>
      h.submodel({
        slotId: 'personal-info',
        model: model.personalInfo,
        view: personalInfoView,
        toParentMessage: message => GotPersonalInfoMessage({ message }),
      }),
    ),
    M.when('WorkHistory', () =>
      h.submodel({
        slotId: 'work-history',
        model: model.workHistory,
        view: workHistoryView,
        toParentMessage: message => GotWorkHistoryMessage({ message }),
      }),
    ),
    M.when('Education', () =>
      h.submodel({
        slotId: 'education',
        model: model.education,
        view: educationView,
        toParentMessage: message => GotEducationMessage({ message }),
      }),
    ),
    M.when('Skills', () =>
      h.submodel({
        slotId: 'skills',
        model: model.skills,
        view: skillsView,
        toParentMessage: message => GotSkillsMessage({ message }),
      }),
    ),
    M.when('CoverLetter', () =>
      h.submodel({
        slotId: 'cover-letter',
        model: model.coverLetter,
        view: coverLetterView,
        toParentMessage: message => GotCoverLetterMessage({ message }),
      }),
    ),
    M.when('Attachments', () =>
      h.submodel({
        slotId: 'attachments',
        model: model.attachments,
        view: attachmentsView,
        toParentMessage: message => GotAttachmentsMessage({ message }),
      }),
    ),
    M.when('Review', () => review(model, attentionSteps)),
    M.exhaustive,
  )
}

const isFirstStep = (model: Model): boolean =>
  pipe(Step.all, Array.head, Option.exists(Equal.equals(model.currentStep)))

const isLastStep = (model: Model): boolean =>
  pipe(Step.all, Array.last, Option.exists(Equal.equals(model.currentStep)))

const navigationButtons = (model: Model): Html => {
  const h = html<Message>()

  return h.keyed('div')(
    'navigation',
    [h.Class('flex justify-between pt-6 mt-8 border-t border-gray-200')],
    [
      ...(isFirstStep(model)
        ? [h.empty]
        : [
            Button.view<Message>({
              onClick: ClickedPrevious(),
              toView: attributes =>
                h.keyed('button')(
                  'previous',
                  [
                    ...attributes.button,
                    h.Class(
                      'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer',
                    ),
                  ],
                  ['← Previous'],
                ),
            }),
          ]),
      ...(isLastStep(model)
        ? []
        : [
            Button.view<Message>({
              onClick: ClickedNext(),
              toView: attributes =>
                h.keyed('button')(
                  'next',
                  [
                    ...attributes.button,
                    h.Class(
                      'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition cursor-pointer',
                    ),
                  ],
                  ['Next →'],
                ),
            }),
          ]),
    ],
  )
}

const pageHeader = (): Html => {
  const h = html<Message>()

  return h.div(
    [h.Class('mb-6')],
    [
      h.h1(
        [h.Class('text-2xl font-bold text-gray-900')],
        ['Apply to Work on Foldkit'],
      ),
      h.p(
        [h.Class('text-sm text-gray-500 mt-1')],
        ['Fill out the form below and watch your resume build in real time.'],
      ),
    ],
  )
}

const stepContentPanel = (
  model: Model,
  attentionSteps: ReadonlyArray<Step.Step>,
  panelAttributes: ReadonlyArray<ChildAttribute> = [],
): Html => {
  const h = html<Message>()

  return h.keyed('div')(
    'step-content-panel',
    [...panelAttributes, h.Class('flex-1 min-w-0')],
    [
      h.keyed('h2')(
        'step-heading',
        [h.Class('text-lg font-semibold text-gray-900 mb-6')],
        [Step.show(model.currentStep)],
      ),
      h.keyed('div')(
        `step-content-${model.currentStep}`,
        [h.Class('min-h-[400px]')],
        [stepContent(model, attentionSteps)],
      ),
      ...(model.currentStep !== 'Review' ? [navigationButtons(model)] : []),
    ],
  )
}

const stepTabsLayout = (
  model: Model,
  attentionSteps: ReadonlyArray<Step.Step>,
  attentionStepSet: HashSet.HashSet<Step.Step>,
): Html => {
  const h = html<Message>()

  return h.submodel({
    slotId: model.stepTabs.id,
    model: model.stepTabs,
    view: StepTabs.view,
    viewInputs: {
      tabs: Step.all,
      ariaLabel: 'Application steps',
      orientation: 'Vertical',
      toView: ({ tablist, tabs, activeIndex }) =>
        h.div(
          [h.Class('lg:flex lg:gap-8')],
          [
            h.keyed('div')(
              'desktop-sidebar',
              [h.Class('hidden w-60 shrink-0 lg:block')],
              [
                h.div(
                  [h.Class('sticky top-8')],
                  [
                    h.div(
                      [...tablist, h.Class('space-y-0.5')],
                      Array.map(tabs, tab =>
                        stepTabButton(tab, model.currentStep, attentionStepSet),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            ...pipe(
              tabs,
              Array.filter(tab => tab.index === activeIndex),
              Array.map(tab =>
                stepContentPanel(model, attentionSteps, tab.panel),
              ),
            ),
            desktopPreviewSidebar(model),
            mobilePreviewToggle(model),
            ...(model.isPreviewVisible ? [mobilePreviewOverlay(model)] : []),
          ],
        ),
    },
    toParentMessage: message => GotStepTabsMessage({ message }),
  })
}

const desktopPreviewSidebar = (model: Model): Html => {
  const h = html<Message>()

  return h.keyed('div')(
    'desktop-preview',
    [h.Class('hidden w-80 shrink-0 xl:block')],
    [
      h.div(
        [h.Class('sticky top-8')],
        [
          h.div(
            [h.Class('mb-2 flex items-center justify-between')],
            [
              h.h2(
                [h.Class('text-sm font-semibold text-gray-700')],
                ['Live Preview'],
              ),
            ],
          ),
          h.div(
            [
              h.Class(
                'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
              ),
            ],
            [preview(model)],
          ),
        ],
      ),
    ],
  )
}

const mobilePreviewToggle = (model: Model): Html => {
  const h = html<Message>()

  return h.keyed('div')(
    'mobile-toggle',
    [h.Class('fixed top-4 right-4 xl:hidden')],
    [
      Button.view<Message>({
        onClick: ToggledPreview(),
        toView: attributes =>
          h.button(
            [
              ...attributes.button,
              h.Class(
                clsx(
                  'rounded-full px-4 py-2 text-sm font-medium shadow-lg transition cursor-pointer',
                  model.isPreviewVisible
                    ? 'bg-gray-800 text-white'
                    : 'bg-indigo-600 text-white',
                ),
              ),
            ],
            [model.isPreviewVisible ? 'Hide Preview' : 'Preview'],
          ),
      }),
    ],
  )
}

const mobilePreviewOverlay = (model: Model): Html => {
  const h = html<Message>()

  return h.keyed('div')(
    'mobile-overlay',
    [
      h.Class(
        'fixed inset-x-4 top-16 bottom-4 overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-2xl xl:hidden',
      ),
    ],
    [preview(model)],
  )
}

export const view = (model: Model): Document => {
  const h = html<Message>()

  const attentionSteps = stepsNeedingAttention(model)
  const attentionStepSet = HashSet.fromIterable(attentionSteps)
  const body = h.div(
    [h.Class('min-h-screen bg-gray-50')],
    [
      h.div(
        [h.Class('mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8')],
        [
          pageHeader(),
          h.div(
            [h.Class('mb-6 lg:hidden')],
            [
              stepMenu(model, attentionStepSet, message =>
                GotStepMenuMessage({ message }),
              ),
            ],
          ),
          stepTabsLayout(model, attentionSteps, attentionStepSet),
        ],
      ),
    ],
  )

  return { title: 'Job Application', body }
}
