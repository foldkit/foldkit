import clsx from 'clsx'
import { Array, Equal, HashSet, Match as M, Option, pipe } from 'effect'
import { type Html } from 'foldkit/html'

import { Step } from '../domain'
import {
  Class,
  OnClick,
  Type,
  button,
  div,
  empty,
  h1,
  h2,
  keyed,
  p,
} from '../html'
import { ClickedNext, ClickedPrevious, ToggledPreview } from '../message'
import { type Model } from '../model'
import * as Education from '../step/education'
import * as PersonalInfo from '../step/personalInfo'
import * as Skills from '../step/skills'
import * as WorkHistory from '../step/workHistory'
import { attachmentsView } from './attachments'
import { coverLetterView } from './coverLetter'
import { educationView } from './education'
import { personalInfoView } from './personalInfo'
import { preview } from './preview'
import { review } from './review'
import { skillsView } from './skills'
import { stepList, stepMenu } from './stepNav'
import { workHistoryView } from './workHistory'

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

const stepsWithErrors = (model: Model): HashSet.HashSet<Step.Step> =>
  pipe(Step.all, Array.filter(stepHasErrors(model)), HashSet.fromIterable)

const stepContent = (model: Model): Html =>
  M.value(model.currentStep).pipe(
    M.when('PersonalInfo', () => personalInfoView(model.personalInfo)),
    M.when('WorkHistory', () => workHistoryView(model.workHistory)),
    M.when('Education', () => educationView(model.education)),
    M.when('Skills', () => skillsView(model.skills)),
    M.when('CoverLetter', () => coverLetterView(model.coverLetter)),
    M.when('Attachments', () => attachmentsView(model.attachments)),
    M.when('Review', () => review(model)),
    M.exhaustive,
  )

const isFirstStep = (model: Model): boolean =>
  pipe(Step.all, Array.head, Option.exists(Equal.equals(model.currentStep)))

const isLastStep = (model: Model): boolean =>
  pipe(Step.all, Array.last, Option.exists(Equal.equals(model.currentStep)))

const navigationButtons = (model: Model): Html =>
  keyed('div')(
    'navigation',
    [Class('flex justify-between pt-6 mt-8 border-t border-gray-200')],
    [
      ...(isFirstStep(model)
        ? [empty]
        : [
            keyed('button')(
              'previous',
              [
                Type('button'),
                OnClick(ClickedPrevious()),
                Class(
                  'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer',
                ),
              ],
              ['\u2190 Previous'],
            ),
          ]),
      ...(isLastStep(model)
        ? []
        : [
            keyed('button')(
              'next',
              [
                Type('button'),
                OnClick(ClickedNext()),
                Class(
                  'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition cursor-pointer',
                ),
              ],
              ['Next \u2192'],
            ),
          ]),
    ],
  )

const pageHeader: Html = div(
  [Class('mb-6')],
  [
    h1(
      [Class('text-2xl font-bold text-gray-900')],
      ['Apply to Work on Foldkit'],
    ),
    p(
      [Class('text-sm text-gray-500 mt-1')],
      ['Fill out the form below and watch your resume build in real time.'],
    ),
  ],
)

const stepContentPanel = (model: Model): Html =>
  keyed('div')(
    'step-content-panel',
    [Class('flex-1 min-w-0')],
    [
      keyed('h2')(
        'step-heading',
        [Class('text-lg font-semibold text-gray-900 mb-6')],
        [Step.show(model.currentStep)],
      ),
      keyed('div')(
        `step-content-${model.currentStep}`,
        [Class('min-h-[400px]')],
        [stepContent(model)],
      ),
      ...(model.currentStep !== 'Review' ? [navigationButtons(model)] : []),
    ],
  )

const desktopStepSidebar = (
  model: Model,
  errorSteps: HashSet.HashSet<Step.Step>,
): Html =>
  keyed('div')(
    'desktop-sidebar',
    [Class('hidden w-60 shrink-0 lg:block')],
    [div([Class('sticky top-8')], [stepList(model.currentStep, errorSteps)])],
  )

const desktopPreviewSidebar = (model: Model): Html =>
  keyed('div')(
    'desktop-preview',
    [Class('hidden w-80 shrink-0 xl:block')],
    [
      div(
        [Class('sticky top-8')],
        [
          div(
            [Class('mb-2 flex items-center justify-between')],
            [
              h2(
                [Class('text-sm font-semibold text-gray-700')],
                ['Live Preview'],
              ),
            ],
          ),
          div(
            [Class('rounded-xl border border-gray-200 bg-white p-6 shadow-sm')],
            [preview(model)],
          ),
        ],
      ),
    ],
  )

const mobilePreviewToggle = (model: Model): Html =>
  keyed('div')(
    'mobile-toggle',
    [Class('fixed bottom-4 right-4 xl:hidden')],
    [
      button(
        [
          Type('button'),
          OnClick(ToggledPreview()),
          Class(
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
    ],
  )

const mobilePreviewOverlay = (model: Model): Html =>
  keyed('div')(
    'mobile-overlay',
    [
      Class(
        'fixed inset-x-4 bottom-16 top-4 overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-2xl xl:hidden',
      ),
    ],
    [preview(model)],
  )

export const view = (model: Model): Html => {
  const errorSteps = stepsWithErrors(model)
  return div(
    [Class('min-h-screen bg-gray-50')],
    [
      div(
        [Class('mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8')],
        [
          pageHeader,
          div([Class('mb-6 lg:hidden')], [stepMenu(model, errorSteps)]),
          div(
            [Class('lg:flex lg:gap-8')],
            [
              desktopStepSidebar(model, errorSteps),
              stepContentPanel(model),
              desktopPreviewSidebar(model),
              mobilePreviewToggle(model),
              ...(model.isPreviewVisible ? [mobilePreviewOverlay(model)] : []),
            ],
          ),
        ],
      ),
    ],
  )
}
