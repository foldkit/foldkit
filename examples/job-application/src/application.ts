import clsx from 'clsx'
import {
  Array,
  Effect,
  Equal,
  HashSet,
  Layer,
  Match,
  Number,
  Option,
  Schema,
  flow,
  pipe,
} from 'effect'
import { Block, Calendar } from 'foldkit'
import type { ChildAttribute, Document, Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button, Menu, Tabs } from '@foldkit/ui'
import type { TabInfo } from '@foldkit/ui/tabs'

import * as Icon from './domain/icon'
import * as Step from './domain/step'
import { Preview, PreviewLive } from './preview'
import { Review, ReviewLive } from './review'
import { Attachments, AttachmentsLive } from './step/attachments'
import { CoverLetter, CoverLetterLive } from './step/coverLetter'
import {
  Education,
  EducationLive,
  educationHasErrors,
  isEducationComplete,
} from './step/education/education'
import {
  PersonalInfo,
  PersonalInfoLive,
  isPersonalInfoComplete,
  personalInfoHasErrors,
} from './step/personalInfo'
import {
  Skills,
  SkillsLive,
  isSkillsComplete,
  skillsHasErrors,
} from './step/skills/skills'
import {
  WorkHistory,
  WorkHistoryLive,
  isWorkHistoryComplete,
  workHistoryHasErrors,
} from './step/workHistory/workHistory'

export const Flags = Schema.Struct({
  today: Calendar.CalendarDate,
  initialWorkHistoryEntryId: Schema.String,
  initialEducationEntryId: Schema.String,
  initialSkillsEntryId: Schema.String,
})
export type Flags = typeof Flags.Type

export const StepMenu = Menu.makeBlock<Step.Step>()
export const StepTabs = Tabs.makeBlock<Step.Step>()

const Model = Schema.Struct({
  currentStep: Step.Step,
  personalInfo: PersonalInfo,
  workHistory: WorkHistory,
  education: Education,
  skills: Skills,
  coverLetter: CoverLetter,
  attachments: Attachments,
  review: Review,
  preview: Preview,
  stepMenu: StepMenu,
  stepTabs: StepTabs,
})
type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedNext: {},
  ClickedPrevious: {},
})
type Message = typeof Message.Type

export class Application extends Block<
  Application,
  Readonly<{ flags: Flags }>
>()('Application', {
  Model,
  Message,
}) {}

const isApplicationComplete = (model: Model): boolean =>
  isPersonalInfoComplete(model.personalInfo.model) &&
  isWorkHistoryComplete(model.workHistory.model) &&
  isEducationComplete(model.education.model) &&
  isSkillsComplete(model.skills.model)

// VIEW

type ApplicationViewBuilder = HtmlBuilder<Message>

type StepStatus = 'Current' | 'Completed' | 'Upcoming'

const stepToStatus = (step: Step.Step, currentStep: Step.Step): StepStatus =>
  Match.value(step).pipe(
    Match.withReturnType<StepStatus>(),
    Match.when(Equal.equals(currentStep), () => 'Current'),
    Match.when(
      flow(Step.indexOf, Number.isLessThan(Step.indexOf(currentStep))),
      () => 'Completed',
    ),
    Match.orElse(() => 'Upcoming'),
  )

const stepMarkerGlyph = (
  status: StepStatus,
  index: number,
  needsAttention: boolean,
): string => {
  if (needsAttention) {
    return '!'
  } else if (status === 'Completed') {
    return '✓'
  } else {
    return String(Number.increment(index))
  }
}

const stepMarker = (
  status: StepStatus,
  index: number,
  needsAttention: boolean,
  h: ApplicationViewBuilder,
): Html =>
  h.span(
    [
      h.Class(
        clsx(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
          needsAttention
            ? 'bg-red-100 text-red-700'
            : Match.value(status).pipe(
                Match.withReturnType<string>(),
                Match.when('Current', () => 'bg-indigo-600 text-white'),
                Match.when('Completed', () => 'bg-indigo-100 text-indigo-700'),
                Match.when('Upcoming', () => 'bg-gray-100 text-gray-400'),
                Match.exhaustive,
              ),
        ),
      ),
    ],
    [stepMarkerGlyph(status, index, needsAttention)],
  )

const stepButtonClass = (status: StepStatus, needsAttention: boolean): string =>
  clsx(
    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition',
    needsAttention
      ? 'text-red-700 hover:bg-red-50 cursor-pointer'
      : Match.value(status).pipe(
          Match.withReturnType<string>(),
          Match.when('Current', () => 'bg-indigo-50 text-indigo-700'),
          Match.when(
            'Completed',
            () => 'text-gray-700 hover:bg-gray-100 cursor-pointer',
          ),
          Match.when(
            'Upcoming',
            () => 'text-gray-600 hover:bg-gray-100 cursor-pointer',
          ),
          Match.exhaustive,
        ),
  )

const stepTabButton = (
  tab: TabInfo<Step.Step>,
  currentStep: Step.Step,
  stepsNeedingAttention: HashSet.HashSet<Step.Step>,
  h: ApplicationViewBuilder,
): Html => {
  const status = stepToStatus(tab.value, currentStep)
  const needsAttention = HashSet.has(stepsNeedingAttention, tab.value)

  return h.keyed('button')(
    tab.value,
    [...tab.tab, h.Class(stepButtonClass(status, needsAttention))],
    [
      stepMarker(status, tab.index, needsAttention, h),
      h.span([], [Step.show(tab.value)]),
    ],
  )
}

const stepMenuTrigger = (currentStep: Step.Step, h: ApplicationViewBuilder) =>
  h.div(
    [h.Class('flex items-center justify-between w-full gap-3')],
    [
      h.div(
        [h.Class('flex items-center gap-2 min-w-0')],
        [
          h.span(
            [h.Class('text-xs font-medium text-gray-500 shrink-0')],
            [
              `Step ${Number.increment(Step.indexOf(currentStep))} of ${Step.all.length}`,
            ],
          ),
          h.span(
            [h.Class('text-sm font-semibold text-gray-900 truncate')],
            [Step.show(currentStep)],
          ),
        ],
      ),
      h.span([h.Class('text-gray-400 shrink-0')], [Icon.chevronDown()]),
    ],
  )

const stepMenuView = (
  model: Model,
  stepsNeedingAttention: HashSet.HashSet<Step.Step>,
  h: ApplicationViewBuilder,
): Html =>
  model.stepMenu.view({
    items: Step.all,
    buttonContent: stepMenuTrigger(model.currentStep, h),
    buttonClassName:
      'flex items-center w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-gray-300 cursor-pointer',
    itemsClassName:
      'rounded-lg border border-gray-200 bg-white shadow-lg py-1 w-(--button-width)',
    itemToConfig: (step, { isActive }) => {
      const status = stepToStatus(step, model.currentStep)
      const needsAttention = HashSet.has(stepsNeedingAttention, step)
      const index = Step.indexOf(step)
      return {
        className: clsx(
          'flex items-center gap-3 px-4 py-2.5 text-sm',
          isActive && 'bg-gray-50',
          'cursor-pointer',
          needsAttention
            ? 'text-red-700 font-semibold'
            : Match.value(status).pipe(
                Match.withReturnType<string>(),
                Match.when('Current', () => 'text-indigo-700 font-semibold'),
                Match.when('Completed', () => 'text-gray-700'),
                Match.when('Upcoming', () => 'text-gray-600'),
                Match.exhaustive,
              ),
        ),
        content: h.div(
          [h.Class('flex items-center gap-3')],
          [
            stepMarker(status, index, needsAttention, h),
            h.span([], [Step.show(step)]),
          ],
        ),
      }
    },
    backdropClassName: 'fixed inset-0',
    anchor: { placement: 'bottom-start', gap: 4, padding: 8 },
  })

const stepHasErrors =
  (model: Model) =>
  (step: Step.Step): boolean =>
    Match.value(step).pipe(
      Match.when('PersonalInfo', () =>
        personalInfoHasErrors(model.personalInfo.model),
      ),
      Match.when('WorkHistory', () =>
        workHistoryHasErrors(model.workHistory.model),
      ),
      Match.when('Education', () => educationHasErrors(model.education.model)),
      Match.when('Skills', () => skillsHasErrors(model.skills.model)),
      Match.orElse(() => false),
    )

const stepIsComplete =
  (model: Model) =>
  (step: Step.Step): boolean =>
    Match.value(step).pipe(
      Match.when('PersonalInfo', () =>
        isPersonalInfoComplete(model.personalInfo.model),
      ),
      Match.when('WorkHistory', () =>
        isWorkHistoryComplete(model.workHistory.model),
      ),
      Match.when('Education', () => isEducationComplete(model.education.model)),
      Match.when('Skills', () => isSkillsComplete(model.skills.model)),
      Match.orElse(() => true),
    )

const stepNeedsAttention =
  (model: Model) =>
  (step: Step.Step): boolean =>
    stepHasErrors(model)(step) ||
    (model.review.model.isSubmitAttempted && !stepIsComplete(model)(step))

const stepsNeedingAttention = (model: Model): ReadonlyArray<Step.Step> =>
  Array.filter(Step.all, stepNeedsAttention(model))

const stepContent = (
  model: Model,
  attentionSteps: ReadonlyArray<Step.Step>,
): Html =>
  Match.value(model.currentStep).pipe(
    Match.when('PersonalInfo', () => model.personalInfo.view()),
    Match.when('WorkHistory', () => model.workHistory.view()),
    Match.when('Education', () => model.education.view()),
    Match.when('Skills', () => model.skills.view()),
    Match.when('CoverLetter', () => model.coverLetter.view()),
    Match.when('Attachments', () => model.attachments.view()),
    Match.when('Review', () =>
      model.review.view({
        personalInfo: model.personalInfo.model,
        workHistory: model.workHistory.model,
        education: model.education.model,
        skills: model.skills.model,
        coverLetter: model.coverLetter.model,
        attachments: model.attachments.model,
        attentionSteps,
        isApplicationComplete: isApplicationComplete(model),
      }),
    ),
    Match.exhaustive,
  )

const isFirstStep = (model: Model): boolean =>
  pipe(Step.all, Array.head, Option.exists(Equal.equals(model.currentStep)))

const isLastStep = (model: Model): boolean =>
  pipe(Step.all, Array.last, Option.exists(Equal.equals(model.currentStep)))

const navigationButtons = (model: Model, h: ApplicationViewBuilder) =>
  h.div(
    [h.Class('flex justify-between pt-6 mt-8 border-t border-gray-200')],
    [
      ...(isFirstStep(model)
        ? [h.empty]
        : [
            Button.view(
              {
                onClick: Message.ClickedPrevious(),
                toView: attributes =>
                  h.button(
                    [
                      ...attributes.button,
                      h.Class(
                        'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer',
                      ),
                    ],
                    ['← Previous'],
                  ),
              },
              h,
            ),
          ]),
      ...(isLastStep(model)
        ? []
        : [
            Button.view(
              {
                onClick: Message.ClickedNext(),
                toView: attributes =>
                  h.button(
                    [
                      ...attributes.button,
                      h.Class(
                        'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition cursor-pointer',
                      ),
                    ],
                    ['Next →'],
                  ),
              },
              h,
            ),
          ]),
    ],
  )

const pageHeader = (h: ApplicationViewBuilder) =>
  h.div(
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

const stepContentPanel = (
  model: Model,
  attentionSteps: ReadonlyArray<Step.Step>,
  panelAttributes: ReadonlyArray<ChildAttribute>,
  h: ApplicationViewBuilder,
): Html =>
  h.div(
    [...panelAttributes, h.Class('flex-1 min-w-0')],
    [
      h.h2(
        [h.Class('text-lg font-semibold text-gray-900 mb-6')],
        [Step.show(model.currentStep)],
      ),
      h.div([h.Class('min-h-[400px]')], [stepContent(model, attentionSteps)]),
      ...(model.currentStep !== 'Review' ? [navigationButtons(model, h)] : []),
    ],
  )

const stepTabsLayout = (
  model: Model,
  attentionSteps: ReadonlyArray<Step.Step>,
  attentionStepSet: HashSet.HashSet<Step.Step>,
  h: ApplicationViewBuilder,
): Html =>
  model.stepTabs.view({
    tabs: Step.all,
    selectedValue: model.currentStep,
    ariaLabel: 'Application steps',
    orientation: 'Vertical',
    toView: ({ tablist, tabs, activeIndex }) =>
      h.div(
        [h.Class('lg:flex lg:gap-8')],
        [
          h.div(
            [h.Class('hidden w-60 shrink-0 lg:block')],
            [
              h.div(
                [h.Class('sticky top-8')],
                [
                  h.div(
                    [...tablist, h.Class('space-y-0.5')],
                    Array.map(tabs, tab =>
                      stepTabButton(
                        tab,
                        model.currentStep,
                        attentionStepSet,
                        h,
                      ),
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
              stepContentPanel(model, attentionSteps, tab.panel, h),
            ),
          ),
          model.preview.view({
            personalInfo: model.personalInfo.model,
            workHistory: model.workHistory.model,
            education: model.education.model,
            skills: model.skills.model,
            coverLetter: model.coverLetter.model,
          }),
        ],
      ),
  })

const view = (model: Model, h: ApplicationViewBuilder): Document => {
  const attentionSteps = stepsNeedingAttention(model)
  const attentionStepSet = HashSet.fromIterable(attentionSteps)
  const body = h.div(
    [h.Class('min-h-screen bg-gray-50')],
    [
      h.div(
        [h.Class('mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8')],
        [
          pageHeader(h),
          h.div(
            [h.Class('mb-6 lg:hidden')],
            [stepMenuView(model, attentionStepSet, h)],
          ),
          stepTabsLayout(model, attentionSteps, attentionStepSet, h),
        ],
      ),
    ],
  )

  return { title: 'Job Application', body }
}

// UPDATE

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

export const ApplicationLive = Application.make(
  Effect.fn(function* (_id, { flags }) {
    const {
      today,
      initialWorkHistoryEntryId,
      initialEducationEntryId,
      initialSkillsEntryId,
    } = flags

    const personalInfo = yield* new PersonalInfo('personalInfo', { today })
    const workHistory = yield* new WorkHistory('workHistory', {
      today,
      initialEntryId: initialWorkHistoryEntryId,
    })
    const education = yield* new Education('education', {
      today,
      initialEntryId: initialEducationEntryId,
    })
    const skills = yield* new Skills('skills', {
      initialEntryId: initialSkillsEntryId,
    })
    const coverLetter = yield* new CoverLetter('coverLetter')
    const attachments = yield* new Attachments('attachments')
    const review = yield* new Review('review')
    const preview = yield* new Preview('preview')
    const stepMenu = yield* new StepMenu('stepMenu', { id: 'step-menu' })
    const stepTabs = yield* new StepTabs('stepTabs', { id: 'step-tabs' })

    return {
      model: {
        currentStep: 'PersonalInfo',
        personalInfo,
        workHistory,
        education,
        skills,
        coverLetter,
        attachments,
        review,
        preview,
        stepMenu,
        stepTabs,
      },

      update: {
        ClickedNext: model => ({
          model: modifyFields(model, { currentStep: toNextStep }),
        }),

        ClickedPrevious: model => ({
          model: modifyFields(model, { currentStep: toPreviousStep }),
        }),

        ...review.on({
          AttemptedSubmit: model => ({
            model,
            messages: [
              model.personalInfo.send(
                PersonalInfo.Message.RequestedRevealErrors(),
              ),
              model.workHistory.send(
                WorkHistory.Message.RequestedRevealErrors(),
              ),
              model.education.send(Education.Message.RequestedRevealErrors()),
              model.skills.send(Skills.Message.RequestedRevealErrors()),
              model.review.send(
                Review.Message.RequestedSubmit({
                  isApplicationComplete: isApplicationComplete(model),
                }),
              ),
            ],
          }),
        }),

        ...stepMenu.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { currentStep: () => value }),
          }),
          Closed: model => ({ model }),
        }),

        ...stepTabs.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { currentStep: () => value }),
          }),
        }),
      },

      view,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      PersonalInfoLive,
      WorkHistoryLive,
      EducationLive,
      SkillsLive,
      CoverLetterLive,
      AttachmentsLive,
      ReviewLive,
      PreviewLive,
      StepMenu.Live,
      StepTabs.Live,
    ),
  ),
)
