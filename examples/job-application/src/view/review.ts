import { Match as M, Option } from 'effect'
import { File } from 'foldkit'
import { type Html } from 'foldkit/html'

import {
  Class,
  OnClick,
  Role,
  Type,
  button,
  div,
  empty,
  h3,
  keyed,
  p,
  section,
  span,
  strong,
} from '../html'
import { ClickedSubmit } from '../message'
import type { Model } from '../model'
import * as Education from '../step/education'
import * as PersonalInfo from '../step/personalInfo'
import * as Skills from '../step/skills'
import * as WorkHistory from '../step/workHistory'
import { employmentRange, pluralize } from './format'

const reviewSection = (title: string, content: Html): Html =>
  section(
    [Class('rounded-lg border border-gray-200 p-4')],
    [h3([Class('text-sm font-semibold text-gray-900 mb-2')], [title]), content],
  )

const fieldRow = (label: string, value: string): Html =>
  value
    ? div(
        [Class('flex justify-between py-1')],
        [
          span([Class('text-sm text-gray-500')], [label]),
          span([Class('text-sm text-gray-900')], [value]),
        ],
      )
    : empty

const personalInfoSection = (
  personalInfo: Model['personalInfo'],
  pronounLabel: string,
): Html =>
  reviewSection(
    'Personal Information',
    div(
      [Class('divide-y divide-gray-100')],
      [
        fieldRow(
          'Name',
          `${personalInfo.firstName.value} ${personalInfo.lastName.value}`.trim(),
        ),
        fieldRow('Email', personalInfo.email.value),
        fieldRow('Phone', personalInfo.phone.value),
        fieldRow('Pronouns', pronounLabel),
        fieldRow('Portfolio', personalInfo.portfolioUrl.value),
      ],
    ),
  )

const workEntryReview = (entry: WorkHistory.Entry.Model): Html => {
  const title = entry.company.value
    ? `${entry.title.value} at ${entry.company.value}`
    : entry.title.value

  return keyed('div')(
    entry.id,
    [Class('py-1')],
    [
      strong([Class('text-sm text-gray-900')], [title]),
      ...Option.match(entry.startDate.maybeSelectedDate, {
        onNone: () => [],
        onSome: start => [
          p(
            [Class('text-xs text-gray-500')],
            [
              employmentRange(
                start,
                entry.isCurrentlyEmployed.isChecked,
                entry.endDate.maybeSelectedDate,
              ),
            ],
          ),
        ],
      }),
    ],
  )
}

const workHistorySection = (workHistory: Model['workHistory']): Html =>
  reviewSection(
    `Work History (${pluralize(workHistory.entries.length, 'position', 'positions')})`,
    div([Class('space-y-2')], workHistory.entries.map(workEntryReview)),
  )

const educationTimeline = (entry: Education.Entry.Model): string => {
  if (entry.isCurrentlyEnrolled.isChecked) {
    return ' (Currently enrolled)'
  }
  if (entry.graduationYear) {
    return ` \u2013 ${entry.graduationYear}`
  }
  return ''
}

const educationEntryReview = (entry: Education.Entry.Model): Html => {
  const title = entry.fieldOfStudy.value
    ? `${entry.degree.value} in ${entry.fieldOfStudy.value}`
    : entry.degree.value

  return keyed('div')(
    entry.id,
    [Class('py-1')],
    [
      strong([Class('text-sm text-gray-900')], [title]),
      p(
        [Class('text-xs text-gray-500')],
        [entry.school.value + educationTimeline(entry)],
      ),
    ],
  )
}

const educationSection = (education: Model['education']): Html =>
  reviewSection(
    `Education (${pluralize(education.entries.length, 'entry', 'entries')})`,
    div([Class('space-y-2')], education.entries.map(educationEntryReview)),
  )

const skillsSection = (skills: Model['skills']): Html =>
  reviewSection(
    `Skills (${skills.entries.length})`,
    div(
      [Class('flex flex-wrap gap-1.5')],
      skills.entries
        .filter(entry => entry.name.value)
        .map(entry =>
          keyed('span')(
            entry.id,
            [
              Class(
                'rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700',
              ),
            ],
            [entry.name.value],
          ),
        ),
    ),
  )

const coverLetterSection = (coverLetter: Model['coverLetter']): Html =>
  reviewSection(
    'Cover Letter',
    coverLetter.content
      ? p(
          [Class('text-sm text-gray-700 whitespace-pre-wrap')],
          [coverLetter.content],
        )
      : p(
          [Class('text-sm text-gray-400 italic')],
          ['No cover letter provided'],
        ),
  )

const attachmentsSection = (attachments: Model['attachments']): Html =>
  reviewSection(
    'Attachments',
    div(
      [Class('space-y-1')],
      [
        Option.match(attachments.maybeResume, {
          onNone: () =>
            p([Class('text-sm text-gray-400 italic')], ['No resume uploaded']),
          onSome: resume =>
            div(
              [Class('flex items-center gap-2')],
              [
                span([], ['\uD83D\uDCC4']),
                span([Class('text-sm text-gray-700')], [File.name(resume)]),
              ],
            ),
        }),
        ...attachments.additionalFiles.map(file =>
          div(
            [Class('flex items-center gap-2')],
            [
              span([], ['\uD83D\uDCCE']),
              span([Class('text-sm text-gray-700')], [File.name(file)]),
            ],
          ),
        ),
      ],
    ),
  )

const submitButtonClass =
  'w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition cursor-pointer'

const blockedNotice = keyed('p')(
  'blocked-notice',
  [Class('text-sm text-red-600 text-center')],
  ['Fix the errors in the highlighted steps before submitting.'],
)

const submissionSection = (
  submission: Model['submission'],
  shouldShowBlockedNotice: boolean,
): Html =>
  M.value(submission).pipe(
    M.tagsExhaustive({
      NotSubmitted: () =>
        keyed('div')(
          'submit-idle',
          [Class('pt-4 space-y-2')],
          [
            ...(shouldShowBlockedNotice ? [blockedNotice] : []),
            keyed('button')(
              'submit',
              [
                Type('button'),
                OnClick(ClickedSubmit()),
                Class(submitButtonClass),
              ],
              ['Submit Application'],
            ),
          ],
        ),
      Submitting: () =>
        keyed('div')(
          'submit-pending',
          [Class('pt-4')],
          [
            button(
              [
                Type('button'),
                Class(
                  'w-full rounded-lg bg-indigo-400 px-4 py-3 text-sm font-semibold text-white cursor-wait',
                ),
              ],
              ['Submitting...'],
            ),
          ],
        ),
      SubmitSuccess: () =>
        keyed('div')(
          'submit-success',
          [
            Role('status'),
            Class(
              'mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-center',
            ),
          ],
          [
            p(
              [Class('text-lg font-semibold text-green-800')],
              ['Application Submitted!'],
            ),
            p(
              [Class('text-sm text-green-600 mt-1')],
              ["Thank you for applying to work on Foldkit. We'll be in touch!"],
            ),
          ],
        ),
      SubmitError: ({ error }) =>
        keyed('div')(
          'submit-error',
          [Class('space-y-3 pt-4')],
          [
            keyed('div')(
              'error-alert',
              [
                Role('alert'),
                Class(
                  'rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700',
                ),
              ],
              [error],
            ),
            ...(shouldShowBlockedNotice ? [blockedNotice] : []),
            keyed('button')(
              'submit',
              [
                Type('button'),
                OnClick(ClickedSubmit()),
                Class(submitButtonClass),
              ],
              ['Try Again'],
            ),
          ],
        ),
    }),
  )

export const review = (model: Model): Html => {
  const pronounLabel = Option.match(
    model.personalInfo.pronouns.maybeSelectedItem,
    {
      onNone: () => '',
      onSome: value =>
        value === 'Other' ? model.personalInfo.customPronouns : value,
    },
  )

  const isApplicationComplete =
    PersonalInfo.isComplete(model.personalInfo) &&
    WorkHistory.isComplete(model.workHistory) &&
    Education.isComplete(model.education) &&
    Skills.isComplete(model.skills)

  return div(
    [Class('space-y-4')],
    [
      personalInfoSection(model.personalInfo, pronounLabel),
      workHistorySection(model.workHistory),
      educationSection(model.education),
      skillsSection(model.skills),
      coverLetterSection(model.coverLetter),
      attachmentsSection(model.attachments),
      submissionSection(
        model.submission,
        model.hasAttemptedSubmit && !isApplicationComplete,
      ),
    ],
  )
}
