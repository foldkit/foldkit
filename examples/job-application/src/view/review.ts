import { Array, Option, pipe } from 'effect'
import { File } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button } from '@foldkit/ui'

import { Step } from '../domain'
import { Message } from '../message'
import { type Model, Submission } from '../model'
import { Education, PersonalInfo, Skills, WorkHistory } from '../step'
import { employmentRange, pluralize } from './format'

const reviewSection = (
  title: string,
  content: Html,
  h: HtmlBuilder<Message>,
): Html =>
  h.section(
    [h.Class('rounded-lg border border-gray-200 p-4')],
    [
      h.h3([h.Class('text-sm font-semibold text-gray-900 mb-2')], [title]),
      content,
    ],
  )

const fieldRow = (
  label: string,
  value: string,
  h: HtmlBuilder<Message>,
): Html =>
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
  personalInfo: Model['personalInfo'],
  pronounLabel: string,
  h: HtmlBuilder<Message>,
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
  entry: WorkHistory.Entry.Model,
  h: HtmlBuilder<Message>,
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
  workHistory: Model['workHistory'],
  h: HtmlBuilder<Message>,
): Html =>
  reviewSection(
    `Work History (${pluralize(workHistory.entries.length, 'position', 'positions')})`,
    h.div(
      [h.Class('space-y-2')],
      workHistory.entries.map(entry => workEntryReview(entry, h)),
    ),
    h,
  )

const educationTimeline = (entry: Education.Entry.Model): string => {
  if (entry.isCurrentlyEnrolled) {
    return ' (Currently enrolled)'
  }
  return Option.match(entry.maybeGraduationYear, {
    onNone: () => '',
    onSome: graduationYear => ` – ${graduationYear}`,
  })
}

const educationEntryReview = (
  entry: Education.Entry.Model,
  h: HtmlBuilder<Message>,
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
  education: Model['education'],
  h: HtmlBuilder<Message>,
): Html =>
  reviewSection(
    `Education (${pluralize(education.entries.length, 'entry', 'entries')})`,
    h.div(
      [h.Class('space-y-2')],
      education.entries.map(entry => educationEntryReview(entry, h)),
    ),
    h,
  )

const skillsSection = (
  skills: Model['skills'],
  h: HtmlBuilder<Message>,
): Html =>
  reviewSection(
    `Skills (${skills.entries.length})`,
    h.div(
      [h.Class('flex flex-wrap gap-1.5')],
      skills.entries
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
  coverLetter: Model['coverLetter'],
  h: HtmlBuilder<Message>,
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
  attachments: Model['attachments'],
  h: HtmlBuilder<Message>,
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
  h: HtmlBuilder<Message>,
): Html =>
  h.p(
    [h.Class('text-sm text-red-600 text-center')],
    [blockedNoticeText(attentionSteps)],
  )

const submissionSection = (
  submission: Model['submission'],
  shouldShowBlockedNotice: boolean,
  attentionSteps: ReadonlyArray<Step.Step>,
  h: HtmlBuilder<Message>,
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

export const review = (
  model: Model,
  attentionSteps: ReadonlyArray<Step.Step>,
  h: HtmlBuilder<Message>,
): Html => {
  const pronounLabel = Option.match(model.personalInfo.maybeSelectedPronoun, {
    onNone: () => '',
    onSome: value =>
      value === 'Other' ? model.personalInfo.customPronouns : value,
  })

  const isApplicationComplete =
    PersonalInfo.isComplete(model.personalInfo) &&
    WorkHistory.isComplete(model.workHistory) &&
    Education.isComplete(model.education) &&
    Skills.isComplete(model.skills)

  return h.div(
    [h.Class('space-y-4')],
    [
      personalInfoSection(model.personalInfo, pronounLabel, h),
      workHistorySection(model.workHistory, h),
      educationSection(model.education, h),
      skillsSection(model.skills, h),
      coverLetterSection(model.coverLetter, h),
      attachmentsSection(model.attachments, h),
      submissionSection(
        model.submission,
        model.isSubmitAttempted && !isApplicationComplete,
        attentionSteps,
        h,
      ),
    ],
  )
}
