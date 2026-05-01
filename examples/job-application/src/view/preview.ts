import { Array, Equal, Option, Order, Record, String, pipe } from 'effect'
import { type Html } from 'foldkit/html'

import { Class, div, h3, keyed, p, section, strong } from '../html'
import type { Model } from '../model'
import type * as Education from '../step/education'
import type * as Skills from '../step/skills'
import type * as WorkHistory from '../step/workHistory'
import { employmentRange } from './format'

const COVER_LETTER_PREVIEW_MAX_CHARS = 200

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max)}...` : value

const sectionHeading = (title: string): Html =>
  h3(
    [
      Class(
        'text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-200 pb-1 mb-2',
      ),
    ],
    [title],
  )

const headerSection = (
  fullName: string,
  pronounLabel: string,
  email: string,
  phone: string,
  portfolio: string,
): Html => {
  const contacts = Array.filter([email, phone, portfolio], String.isNonEmpty)
  return div(
    [Class('text-center mb-4 pb-4 border-b border-gray-200')],
    [
      keyed('h2')(
        'preview-name',
        [Class('text-xl font-bold text-gray-900')],
        [fullName],
      ),
      ...(String.isNonEmpty(pronounLabel)
        ? [
            keyed('p')(
              'preview-pronouns',
              [Class('text-xs text-gray-500 italic')],
              [pronounLabel],
            ),
          ]
        : []),
      ...(Array.isNonEmptyArray(contacts)
        ? [
            keyed('p')(
              'preview-contact',
              [Class('text-xs text-gray-500 mt-1 break-words')],
              [contacts.join(' \u00B7 ')],
            ),
          ]
        : []),
    ],
  )
}

const workEntryView = (entry: WorkHistory.Entry.Model): Html =>
  keyed('div')(
    `work-${entry.id}`,
    [Class('mb-3')],
    [
      ...(String.isNonEmpty(entry.title.value)
        ? [strong([Class('block text-sm text-gray-900')], [entry.title.value])]
        : []),
      ...(String.isNonEmpty(entry.company.value)
        ? [p([Class('text-xs text-gray-600')], [entry.company.value])]
        : []),
      ...Option.match(entry.startDate.maybeSelectedDate, {
        onNone: () => [],
        onSome: start => [
          p(
            [Class('text-xs text-gray-400 mt-0.5')],
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
      ...(String.isNonEmpty(entry.description)
        ? [p([Class('text-xs text-gray-600 mt-1')], [entry.description])]
        : []),
    ],
  )

const experienceSection = (workHistory: WorkHistory.Model): Html =>
  section(
    [Class('mb-4')],
    [
      sectionHeading('Experience'),
      ...Array.filter(
        workHistory.entries,
        entry =>
          String.isNonEmpty(entry.company.value) ||
          String.isNonEmpty(entry.title.value),
      ).map(workEntryView),
    ],
  )

const educationTimelineLine = (
  entry: Education.Entry.Model,
): ReadonlyArray<Html> => {
  if (entry.isCurrentlyEnrolled.isChecked) {
    return [p([Class('text-xs text-gray-400 mt-0.5')], ['Currently enrolled'])]
  }
  if (String.isNonEmpty(entry.graduationYear)) {
    return [
      p(
        [Class('text-xs text-gray-400 mt-0.5')],
        [`Class of ${entry.graduationYear}`],
      ),
    ]
  }
  return []
}

const educationEntryView = (entry: Education.Entry.Model): Html => {
  const degreeLine = Array.filter(
    [entry.degree.value, entry.fieldOfStudy.value],
    String.isNonEmpty,
  ).join(', ')
  return keyed('div')(
    `education-${entry.id}`,
    [Class('mb-3')],
    [
      ...(String.isNonEmpty(degreeLine)
        ? [strong([Class('block text-sm text-gray-900')], [degreeLine])]
        : []),
      ...(String.isNonEmpty(entry.school.value)
        ? [p([Class('text-xs text-gray-600')], [entry.school.value])]
        : []),
      ...educationTimelineLine(entry),
    ],
  )
}

const educationSection = (education: Education.Model): Html =>
  section(
    [Class('mb-4')],
    [
      sectionHeading('Education'),
      ...Array.filter(education.entries, entry =>
        String.isNonEmpty(entry.school.value),
      ).map(educationEntryView),
    ],
  )

type SkillsByProficiency = ReadonlyArray<
  Readonly<{ level: string; names: ReadonlyArray<string> }>
>

const PROFICIENCY_ORDER = ['Expert', 'Advanced', 'Intermediate', 'Beginner']

const proficiencyRank = (level: string): number =>
  pipe(
    PROFICIENCY_ORDER,
    Array.findFirstIndex(Equal.equals(level)),
    Option.getOrElse(() => PROFICIENCY_ORDER.length),
  )

const proficiencyOrder = Order.mapInput(
  Order.Number,
  ([level]: readonly [string, unknown]) => proficiencyRank(level),
)

const groupSkillsByProficiency = (
  entries: ReadonlyArray<Skills.Entry.Model>,
): SkillsByProficiency =>
  pipe(
    entries,
    Array.filter(entry => String.isNonEmpty(entry.name.value)),
    Array.groupBy(entry =>
      Option.getOrElse(entry.proficiency.selectedValue, () => 'Other'),
    ),
    Record.toEntries,
    Array.sort(proficiencyOrder),
    Array.map(([level, grouped]) => ({
      level,
      names: Array.map(grouped, entry => entry.name.value),
    })),
  )

const skillGroupView = (
  group: Readonly<{ level: string; names: ReadonlyArray<string> }>,
): Html =>
  p(
    [Class('text-xs text-gray-700 mb-1')],
    [
      strong([Class('text-gray-900')], [`${group.level}:`]),
      ` ${group.names.join(', ')}`,
    ],
  )

const skillsSection = (skills: Skills.Model): Html => {
  const grouped = groupSkillsByProficiency(skills.entries)
  return section(
    [Class('mb-4')],
    [sectionHeading('Skills'), ...grouped.map(skillGroupView)],
  )
}

const coverLetterSection = (content: string): Html =>
  section(
    [],
    [
      sectionHeading('Cover Letter'),
      p(
        [Class('text-xs text-gray-600 whitespace-pre-wrap')],
        [truncate(content, COVER_LETTER_PREVIEW_MAX_CHARS)],
      ),
    ],
  )

export const preview = ({
  personalInfo: {
    firstName: { value: firstName },
    lastName: { value: lastName },
    email: { value: email },
    phone: { value: phone },
    portfolioUrl: { value: portfolio },
    pronouns,
    customPronouns,
  },
  workHistory,
  education,
  skills,
  coverLetter,
}: Model): Html => {
  const fullName =
    String.isNonEmpty(firstName) || String.isNonEmpty(lastName)
      ? `${firstName} ${lastName}`.trim()
      : 'Your Name'

  const pronounLabel = Option.match(pronouns.maybeSelectedItem, {
    onNone: () => '',
    onSome: value => (value === 'Other' ? customPronouns : value),
  })

  const hasExperience = Array.some(
    workHistory.entries,
    entry =>
      String.isNonEmpty(entry.company.value) ||
      String.isNonEmpty(entry.title.value),
  )
  const hasEducation = Array.some(education.entries, entry =>
    String.isNonEmpty(entry.school.value),
  )
  const hasSkills = Array.some(skills.entries, entry =>
    String.isNonEmpty(entry.name.value),
  )

  return div(
    [Class('font-serif')],
    [
      headerSection(fullName, pronounLabel, email, phone, portfolio),
      ...(hasExperience ? [experienceSection(workHistory)] : []),
      ...(hasEducation ? [educationSection(education)] : []),
      ...(hasSkills ? [skillsSection(skills)] : []),
      ...(String.isNonEmpty(coverLetter.content)
        ? [coverLetterSection(coverLetter.content)]
        : []),
    ],
  )
}
