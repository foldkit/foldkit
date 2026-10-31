import { Array, Duration, Effect, Option, Schema, pipe } from 'effect'
import { Block, Command, File } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { defineTaggedUnion } from 'foldkit/schema'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

import { employmentRange, pluralize } from './domain/format'
import * as Step from './domain/step'
import type { Attachments } from './step/attachments'
import type { CoverLetter } from './step/coverLetter'
import type { Education } from './step/education/education'
import type { EducationEntry } from './step/education/educationEntry'
import type { PersonalInfo } from './step/personalInfo'
import type { Skills } from './step/skills/skills'
import type { WorkHistory } from './step/workHistory/workHistory'
import type { WorkHistoryEntry } from './step/workHistory/workHistoryEntry'

const Submission = defineTaggedUnion({
  NotSubmitted: {},
  Submitting: {},
  SubmitSuccess: {},
  SubmitError: { error: Schema.String },
})
type Submission = typeof Submission.Type

const Model = Schema.Struct({
  submission: Submission,
  isSubmitAttempted: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedSubmit: {},
  RequestedSubmit: { isApplicationComplete: Schema.Boolean },
  SucceededSubmitApplication: {},
  FailedSubmitApplication: { error: Schema.String },
})
type Message = typeof Message.Type

const OutMessage = defineMessageUnion({
  AttemptedSubmit: {},
})

export const SubmitApplication = Command.define('SubmitApplication', {
  messages: [
    Message.SucceededSubmitApplication,
    Message.FailedSubmitApplication,
  ],
})

type PersonalInfoModel = PersonalInfo['model']
type WorkHistoryModel = WorkHistory['model']
type WorkHistoryEntryModel = WorkHistoryEntry['model']
type EducationModel = Education['model']
type EducationEntryModel = EducationEntry['model']
type SkillsModel = Skills['model']
type CoverLetterModel = CoverLetter['model']
type AttachmentsModel = Attachments['model']

type ReviewViewInput = Readonly<{
  personalInfo: PersonalInfoModel
  workHistory: WorkHistoryModel
  education: EducationModel
  skills: SkillsModel
  coverLetter: CoverLetterModel
  attachments: AttachmentsModel
  attentionSteps: ReadonlyArray<Step.Step>
  isApplicationComplete: boolean
}>

export class Review extends Block<Review, void, ReviewViewInput>()('Review', {
  Model,
  Message,
  OutMessage,
  Command: [SubmitApplication],
}) {}

export const ReviewLive = Review.make(
  Effect.fn(function* () {
    return {
      model: {
        submission: Submission.NotSubmitted(),
        isSubmitAttempted: false,
      },

      update: {
        ClickedSubmit: model => ({
          model,
          outMessage: OutMessage.AttemptedSubmit(),
        }),

        RequestedSubmit: (model, { isApplicationComplete }) => {
          if (isApplicationComplete) {
            return {
              model: modifyFields(model, {
                isSubmitAttempted: () => true,
                submission: () => Submission.Submitting(),
              }),
              commands: [SubmitApplication()],
            }
          } else {
            return {
              model: modifyFields(model, { isSubmitAttempted: () => true }),
            }
          }
        },

        SucceededSubmitApplication: model => ({
          model: modifyFields(model, {
            submission: () => Submission.SubmitSuccess(),
          }),
        }),

        FailedSubmitApplication: (model, { error }) => ({
          model: modifyFields(model, {
            submission: () => Submission.SubmitError({ error }),
          }),
        }),
      },

      commands: {
        SubmitApplication: submitApplication,
      },

      view: (model, h, input) => {
        const { personalInfo, attentionSteps, isApplicationComplete } = input

        const pronounLabel = Option.match(personalInfo.maybeSelectedPronoun, {
          onNone: () => '',
          onSome: value =>
            value === 'Other' ? personalInfo.customPronouns : value,
        })

        return h.div(
          [h.Class('space-y-4')],
          [
            personalInfoSection(personalInfo, pronounLabel, h),
            workHistorySection(input.workHistory, h),
            educationSection(input.education, h),
            skillsSection(input.skills, h),
            coverLetterSection(input.coverLetter, h),
            attachmentsSection(input.attachments, h),
            submissionSection(
              model.submission,
              model.isSubmitAttempted && !isApplicationComplete,
              attentionSteps,
              h,
            ),
          ],
        )
      },
    }
  }),
)

const FAKE_SUBMIT_DELAY_MS = 1500

const submitApplication = () =>
  Effect.gen(function* () {
    yield* Effect.sleep(Duration.millis(FAKE_SUBMIT_DELAY_MS))
    return Message.SucceededSubmitApplication()
  })

type ReviewViewBuilder = HtmlBuilder<Message>

const reviewSection = (
  title: string,
  content: Html,
  h: ReviewViewBuilder,
): Html =>
  h.section(
    [h.Class('rounded-lg border border-gray-200 p-4')],
    [
      h.h3([h.Class('text-sm font-semibold text-gray-900 mb-2')], [title]),
      content,
    ],
  )

const fieldRow = (label: string, value: string, h: ReviewViewBuilder): Html =>
  value
    ? h.div(
        [h.Class('flex justify-between py-1')],
        [
          h.span([h.Class('text-sm text-gray-500')], [label]),
          h.span([h.Class('text-sm text-gray-900')], [value]),
        ],
      )
    : h.empty

const personalInfoSection = (
  personalInfo: PersonalInfoModel,
  pronounLabel: string,
  h: ReviewViewBuilder,
): Html =>
  reviewSection(
    'Personal Information',
    h.div(
      [h.Class('divide-y divide-gray-100')],
      [
        fieldRow(
          'Name',
          `${personalInfo.firstName.value} ${personalInfo.lastName.value}`.trim(),
          h,
        ),
        fieldRow('Email', personalInfo.email.value, h),
        fieldRow('Phone', personalInfo.phone.value, h),
        fieldRow('Pronouns', pronounLabel, h),
        fieldRow('Portfolio', personalInfo.portfolioUrl.value, h),
      ],
    ),
    h,
  )

const workEntryReview = (
  entry: WorkHistoryEntryModel,
  h: ReviewViewBuilder,
): Html => {
  const title = entry.company.value
    ? `${entry.title.value} at ${entry.company.value}`
    : entry.title.value

  return h.keyed('div')(
    entry.id,
    [h.Class('py-1')],
    [
      h.strong([h.Class('text-sm text-gray-900')], [title]),
      ...Option.match(entry.maybeStartDate, {
        onNone: () => [],
        onSome: start => [
          h.p(
            [h.Class('text-xs text-gray-500')],
            [
              employmentRange(
                start,
                entry.isCurrentlyEmployed,
                entry.maybeEndDate,
              ),
            ],
          ),
        ],
      }),
    ],
  )
}

const workHistorySection = (
  workHistory: WorkHistoryModel,
  h: ReviewViewBuilder,
): Html =>
  reviewSection(
    `Work History (${pluralize(workHistory.entries.length, 'position', 'positions')})`,
    h.div(
      [h.Class('space-y-2')],
      workHistory.entries.map(entry => workEntryReview(entry.model, h)),
    ),
    h,
  )

const educationTimeline = (entry: EducationEntryModel): string => {
  if (entry.isCurrentlyEnrolled) {
    return ' (Currently enrolled)'
  }
  return Option.match(entry.maybeGraduationYear, {
    onNone: () => '',
    onSome: graduationYear => ` – ${graduationYear}`,
  })
}

const educationEntryReview = (
  entry: EducationEntryModel,
  h: ReviewViewBuilder,
): Html => {
  const title = entry.fieldOfStudy.value
    ? `${entry.degree.value} in ${entry.fieldOfStudy.value}`
    : entry.degree.value

  return h.keyed('div')(
    entry.id,
    [h.Class('py-1')],
    [
      h.strong([h.Class('text-sm text-gray-900')], [title]),
      h.p(
        [h.Class('text-xs text-gray-500')],
        [entry.school.value + educationTimeline(entry)],
      ),
    ],
  )
}

const educationSection = (
  education: EducationModel,
  h: ReviewViewBuilder,
): Html =>
  reviewSection(
    `Education (${pluralize(education.entries.length, 'entry', 'entries')})`,
    h.div(
      [h.Class('space-y-2')],
      education.entries.map(entry => educationEntryReview(entry.model, h)),
    ),
    h,
  )

const skillsSection = (skills: SkillsModel, h: ReviewViewBuilder): Html =>
  reviewSection(
    `Skills (${skills.entries.length})`,
    h.div(
      [h.Class('flex flex-wrap gap-1.5')],
      skills.entries
        .map(entry => entry.model)
        .filter(entry => entry.name.value)
        .map(entry =>
          h.keyed('span')(
            entry.id,
            [
              h.Class(
                'rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700',
              ),
            ],
            [entry.name.value],
          ),
        ),
    ),
    h,
  )

const coverLetterSection = (
  coverLetter: CoverLetterModel,
  h: ReviewViewBuilder,
): Html =>
  reviewSection(
    'Cover Letter',
    coverLetter.content
      ? h.p(
          [h.Class('text-sm text-gray-700 whitespace-pre-wrap')],
          [coverLetter.content],
        )
      : h.p(
          [h.Class('text-sm text-gray-400 italic')],
          ['No cover letter provided'],
        ),
    h,
  )

const attachmentsSection = (
  attachments: AttachmentsModel,
  h: ReviewViewBuilder,
): Html =>
  reviewSection(
    'Attachments',
    h.div(
      [h.Class('space-y-1')],
      [
        Option.match(attachments.maybeResume, {
          onNone: () =>
            h.p(
              [h.Class('text-sm text-gray-400 italic')],
              ['No resume uploaded'],
            ),
          onSome: resume =>
            h.div(
              [h.Class('flex items-center gap-2')],
              [
                h.span([], ['📄']),
                h.span([h.Class('text-sm text-gray-700')], [File.name(resume)]),
              ],
            ),
        }),
        ...attachments.additionalFiles.map(file =>
          h.div(
            [h.Class('flex items-center gap-2')],
            [
              h.span([], ['📎']),
              h.span([h.Class('text-sm text-gray-700')], [File.name(file)]),
            ],
          ),
        ),
      ],
    ),
    h,
  )

const submitButtonClass =
  'w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition cursor-pointer'

const blockedNoticeText = (attentionSteps: ReadonlyArray<Step.Step>): string =>
  Array.match(attentionSteps, {
    onEmpty: () => 'Review the required fields before submitting.',
    onNonEmpty: steps =>
      `Review ${pipe(steps, Array.map(Step.show), Array.join(', '))} before submitting.`,
  })

const blockedNotice = (
  attentionSteps: ReadonlyArray<Step.Step>,
  h: ReviewViewBuilder,
): Html =>
  h.p(
    [h.Class('text-sm text-red-600 text-center')],
    [blockedNoticeText(attentionSteps)],
  )

const submissionSection = (
  submission: Submission,
  shouldShowBlockedNotice: boolean,
  attentionSteps: ReadonlyArray<Step.Step>,
  h: ReviewViewBuilder,
): Html =>
  Submission.match(submission, {
    NotSubmitted: () =>
      h.div(
        [h.Class('pt-4 space-y-2')],
        [
          ...(shouldShowBlockedNotice
            ? [blockedNotice(attentionSteps, h)]
            : []),
          Button.view(
            {
              onClick: Message.ClickedSubmit(),
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class(submitButtonClass)],
                  ['Submit Application'],
                ),
            },
            h,
          ),
        ],
      ),
    Submitting: () =>
      h.div(
        [h.Class('pt-4')],
        [
          Button.view(
            {
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Class(
                      'w-full rounded-lg bg-indigo-400 px-4 py-3 text-sm font-semibold text-white cursor-wait',
                    ),
                  ],
                  ['Submitting...'],
                ),
            },
            h,
          ),
        ],
      ),
    SubmitSuccess: () =>
      h.div(
        [
          h.Role('status'),
          h.Class(
            'mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-center',
          ),
        ],
        [
          h.p(
            [h.Class('text-lg font-semibold text-green-800')],
            ['Application Submitted!'],
          ),
          h.p(
            [h.Class('text-sm text-green-600 mt-1')],
            ["Thank you for applying to work on Foldkit. We'll be in touch!"],
          ),
        ],
      ),
    SubmitError: ({ error }) =>
      h.div(
        [h.Class('space-y-3 pt-4')],
        [
          h.div(
            [
              h.Role('alert'),
              h.Class(
                'rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700',
              ),
            ],
            [error],
          ),
          ...(shouldShowBlockedNotice
            ? [blockedNotice(attentionSteps, h)]
            : []),
          Button.view(
            {
              onClick: Message.ClickedSubmit(),
              toView: attributes =>
                h.button(
                  [...attributes.button, h.Class(submitButtonClass)],
                  ['Try Again'],
                ),
            },
            h,
          ),
        ],
      ),
  })
