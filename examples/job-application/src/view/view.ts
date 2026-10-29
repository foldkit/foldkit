import clsx from 'clsx'
import { Array, Equal, HashSet, Match, Option, pipe } from 'effect'
import type { ChildAttribute, Html } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import {
  ApplicationComposition,
  type ApplicationViewBuilder,
  AttachmentsBinding,
  CoverLetterBinding,
  EducationBinding,
  PersonalInfoBinding,
  SkillsBinding,
  StepTabsBinding,
  WorkHistoryBinding,
} from '../composition'
import { Step } from '../domain'
import { Message } from '../message'
import { type Model } from '../model'
import {
  hasErrors as educationHasErrors,
  isComplete as isEducationComplete,
} from '../step/education/update'
import {
  isComplete as isPersonalInfoComplete,
  hasErrors as personalInfoHasErrors,
} from '../step/personalInfo/update'
import {
  isComplete as isSkillsComplete,
  hasErrors as skillsHasErrors,
} from '../step/skills/update'
import {
  isComplete as isWorkHistoryComplete,
  hasErrors as workHistoryHasErrors,
} from '../step/workHistory/update'
import { preview } from './preview'
import { review } from './review'
import { stepMenu, stepTabButton } from './stepNav'

const stepHasErrors =
  (model: Model) =>
  (step: Step.Step): boolean =>
    Match.value(step).pipe(
      Match.when('PersonalInfo', () =>
        personalInfoHasErrors(model.personalInfo),
      ),
      Match.when('WorkHistory', () => workHistoryHasErrors(model.workHistory)),
      Match.when('Education', () => educationHasErrors(model.education)),
      Match.when('Skills', () => skillsHasErrors(model.skills)),
      Match.orElse(() => false),
    )

const stepIsComplete =
  (model: Model) =>
  (step: Step.Step): boolean =>
    Match.value(step).pipe(
      Match.when('PersonalInfo', () =>
        isPersonalInfoComplete(model.personalInfo),
      ),
      Match.when('WorkHistory', () => isWorkHistoryComplete(model.workHistory)),
      Match.when('Education', () => isEducationComplete(model.education)),
      Match.when('Skills', () => isSkillsComplete(model.skills)),
      Match.orElse(() => true),
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
  h: ApplicationViewBuilder,
): Html =>
  Match.value(model.currentStep).pipe(
    Match.when('PersonalInfo', () =>
      h.block(
        PersonalInfoBinding.embedView({
          slotId: 'personal-info',
          model: model.personalInfo,
        }),
      ),
    ),
    Match.when('WorkHistory', () =>
      h.block(
        WorkHistoryBinding.embedView({
          slotId: 'work-history',
          model: model.workHistory,
        }),
      ),
    ),
    Match.when('Education', () =>
      h.block(
        EducationBinding.embedView({
          slotId: 'education',
          model: model.education,
        }),
      ),
    ),
    Match.when('Skills', () =>
      h.block(
        SkillsBinding.embedView({
          slotId: 'skills',
          model: model.skills,
        }),
      ),
    ),
    Match.when('CoverLetter', () =>
      h.block(
        CoverLetterBinding.embedView({
          slotId: 'cover-letter',
          model: model.coverLetter,
        }),
      ),
    ),
    Match.when('Attachments', () =>
      h.block(
        AttachmentsBinding.embedView({
          slotId: 'attachments',
          model: model.attachments,
        }),
      ),
    ),
    Match.when('Review', () => review(model, attentionSteps, h)),
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
      h.div(
        [h.Class('min-h-[400px]')],
        [stepContent(model, attentionSteps, h)],
      ),
      ...(model.currentStep !== 'Review' ? [navigationButtons(model, h)] : []),
    ],
  )

const stepTabsLayout = (
  model: Model,
  attentionSteps: ReadonlyArray<Step.Step>,
  attentionStepSet: HashSet.HashSet<Step.Step>,
  h: ApplicationViewBuilder,
): Html =>
  h.block(
    StepTabsBinding.embedView({
      slotId: model.stepTabs.id,
      model: model.stepTabs,
      viewInputs: {
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
              desktopPreviewSidebar(model, h),
              mobilePreviewToggle(model, h),
              ...(model.isPreviewVisible
                ? [mobilePreviewOverlay(model, h)]
                : []),
            ],
          ),
      },
    }),
  )

const desktopPreviewSidebar = (model: Model, h: ApplicationViewBuilder) =>
  h.div(
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

const mobilePreviewToggle = (model: Model, h: ApplicationViewBuilder) =>
  h.div(
    [h.Class('fixed top-4 right-4 xl:hidden')],
    [
      Button.view(
        {
          onClick: Message.ToggledPreview(),
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
        },
        h,
      ),
    ],
  )

const mobilePreviewOverlay = (model: Model, h: ApplicationViewBuilder) =>
  h.div(
    [
      h.Class(
        'fixed inset-x-4 top-16 bottom-4 overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-2xl xl:hidden',
      ),
    ],
    [preview(model)],
  )

export const view = ApplicationComposition.makeView((model, h) => {
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
            [stepMenu(model, attentionStepSet, h)],
          ),
          stepTabsLayout(model, attentionSteps, attentionStepSet, h),
        ],
      ),
    ],
  )

  return { title: 'Job Application', body }
})
