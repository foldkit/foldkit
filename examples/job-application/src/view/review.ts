import { Match as M, Option } from 'effect'
import { File } from 'foldkit'
import { type Html, html } from 'foldkit/html'

import type { Model } from '../model'
import * as Education from '../step/education'
import * as PersonalInfo from '../step/personalInfo'
import * as Skills from '../step/skills'
import * as WorkHistory from '../step/workHistory'
import { employmentRange, pluralize } from './format'

const reviewSection = <ParentMessage>(title: string, content: Html): Html => {
  const h = html<ParentMessage>()

  return h.section(
    [h.Class('rounded-lg border border-gray-200 p-4')],
    [
      h.h3([h.Class('text-sm font-semibold text-gray-900 mb-2')], [title]),
      content,
    ],
  )
}

const fieldRow = <ParentMessage>(label: string, value: string): Html => {
  const h = html<ParentMessage>()

  return value
    ? h.div(
        [h.Class('flex justify-between py-1')],
        [
          h.span([h.Class('text-sm text-gray-500')], [label]),
          h.span([h.Class('text-sm text-gray-900')], [value]),
        ],
      )
    : h.empty
}

const personalInfoSection = <ParentMessage>(
  personalInfo: Model['personalInfo'],
  pronounLabel: string,
): Html => {
  const h = html<ParentMessage>()

  return reviewSection<ParentMessage>(
    'Personal Information',
    h.div(
      [h.Class('divide-y divide-gray-100')],
      [
        fieldRow<ParentMessage>(
          'Name',
          `${personalInfo.firstName.value} ${personalInfo.lastName.value}`.trim(),
        ),
        fieldRow<ParentMessage>('Email', personalInfo.email.value),
        fieldRow<ParentMessage>('Phone', personalInfo.phone.value),
        fieldRow<ParentMessage>('Pronouns', pronounLabel),
        fieldRow<ParentMessage>('Portfolio', personalInfo.portfolioUrl.value),
      ],
    ),
  )
}

const workEntryReview = <ParentMessage>(
  entry: WorkHistory.Entry.Model,
): Html => {
  const h = html<ParentMessage>()

  const title = entry.company.value
    ? `${entry.title.value} at ${entry.company.value}`
    : entry.title.value

  return h.keyed('div')(
    entry.id,
    [h.Class('py-1')],
    [
      h.strong([h.Class('text-sm text-gray-900')], [title]),
      ...Option.match(entry.startDate.maybeSelectedDate, {
        onNone: () => [],
        onSome: start => [
          h.p(
            [h.Class('text-xs text-gray-500')],
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

const workHistorySection = <ParentMessage>(
  workHistory: Model['workHistory'],
): Html => {
  const h = html<ParentMessage>()

  return reviewSection<ParentMessage>(
    `Work History (${pluralize(workHistory.entries.length, 'position', 'positions')})`,
    h.div(
      [h.Class('space-y-2')],
      workHistory.entries.map(entry => workEntryReview<ParentMessage>(entry)),
    ),
  )
}

const educationTimeline = (entry: Education.Entry.Model): string => {
  if (entry.isCurrentlyEnrolled.isChecked) {
    return ' (Currently enrolled)'
  }
  if (entry.graduationYear) {
    return ` – ${entry.graduationYear}`
  }
  return ''
}

const educationEntryReview = <ParentMessage>(
  entry: Education.Entry.Model,
): Html => {
  const h = html<ParentMessage>()

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

const educationSection = <ParentMessage>(
  education: Model['education'],
): Html => {
  const h = html<ParentMessage>()

  return reviewSection<ParentMessage>(
    `Education (${pluralize(education.entries.length, 'entry', 'entries')})`,
    h.div(
      [h.Class('space-y-2')],
      education.entries.map(entry =>
        educationEntryReview<ParentMessage>(entry),
      ),
    ),
  )
}

const skillsSection = <ParentMessage>(skills: Model['skills']): Html => {
  const h = html<ParentMessage>()

  return reviewSection<ParentMessage>(
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
  )
}

const coverLetterSection = <ParentMessage>(
  coverLetter: Model['coverLetter'],
): Html => {
  const h = html<ParentMessage>()

  return reviewSection<ParentMessage>(
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
  )
}

const attachmentsSection = <ParentMessage>(
  attachments: Model['attachments'],
): Html => {
  const h = html<ParentMessage>()

  return reviewSection<ParentMessage>(
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
  )
}

const submitButtonClass = (isEnabled: boolean): string =>
  isEnabled
    ? 'w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition cursor-pointer'
    : 'w-full rounded-lg bg-indigo-300 px-4 py-3 text-sm font-semibold text-white cursor-not-allowed'

const blockedNotice = <ParentMessage>(): Html => {
  const h = html<ParentMessage>()

  return h.keyed('p')(
    'blocked-notice',
    [h.Class('text-sm text-red-600 text-center')],
    ['Fix the errors in the highlighted steps before submitting.'],
  )
}

const submissionSection = <ParentMessage>(
  submission: Model['submission'],
  isSubmittable: boolean,
  onSubmit: ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  return M.value(submission).pipe(
    M.tagsExhaustive({
      NotSubmitted: () =>
        h.keyed('div')(
          'submit-idle',
          [h.Class('pt-4 space-y-2')],
          [
            ...(isSubmittable ? [] : [blockedNotice<ParentMessage>()]),
            h.keyed('button')(
              'submit',
              [
                h.Type('button'),
                ...(isSubmittable ? [h.OnClick(onSubmit)] : [h.Disabled(true)]),
                h.Class(submitButtonClass(isSubmittable)),
              ],
              ['Submit Application'],
            ),
          ],
        ),
      Submitting: () =>
        h.keyed('div')(
          'submit-pending',
          [h.Class('pt-4')],
          [
            h.button(
              [
                h.Type('button'),
                h.Class(
                  'w-full rounded-lg bg-indigo-400 px-4 py-3 text-sm font-semibold text-white cursor-wait',
                ),
              ],
              ['Submitting...'],
            ),
          ],
        ),
      SubmitSuccess: () =>
        h.keyed('div')(
          'submit-success',
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
        h.keyed('div')(
          'submit-error',
          [h.Class('space-y-3 pt-4')],
          [
            h.keyed('div')(
              'error-alert',
              [
                h.Role('alert'),
                h.Class(
                  'rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700',
                ),
              ],
              [error],
            ),
            ...(isSubmittable ? [] : [blockedNotice<ParentMessage>()]),
            h.keyed('button')(
              'submit',
              [
                h.Type('button'),
                ...(isSubmittable ? [h.OnClick(onSubmit)] : [h.Disabled(true)]),
                h.Class(submitButtonClass(isSubmittable)),
              ],
              ['Try Again'],
            ),
          ],
        ),
    }),
  )
}

export const review = <ParentMessage>(
  model: Model,
  onSubmit: ParentMessage,
): Html => {
  const h = html<ParentMessage>()

  const pronounLabel = Option.match(
    model.personalInfo.pronouns.maybeSelectedItem,
    {
      onNone: () => '',
      onSome: value =>
        value === 'Other' ? model.personalInfo.customPronouns : value,
    },
  )

  return h.div(
    [h.Class('space-y-4')],
    [
      personalInfoSection<ParentMessage>(model.personalInfo, pronounLabel),
      workHistorySection<ParentMessage>(model.workHistory),
      educationSection<ParentMessage>(model.education),
      skillsSection<ParentMessage>(model.skills),
      coverLetterSection<ParentMessage>(model.coverLetter),
      attachmentsSection<ParentMessage>(model.attachments),
      submissionSection<ParentMessage>(
        model.submission,
        PersonalInfo.isComplete(model.personalInfo) &&
          WorkHistory.isComplete(model.workHistory) &&
          Education.isComplete(model.education) &&
          Skills.isComplete(model.skills),
        onSubmit,
      ),
    ],
  )
}
