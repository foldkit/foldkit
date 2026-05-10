import { Array, Equal, Option, Order, Record, String, pipe } from 'effect'
import { type Html, html } from 'foldkit/html'

import type { Model } from '../model'
import type * as Education from '../step/education'
import type * as Skills from '../step/skills'
import type * as WorkHistory from '../step/workHistory'
import { employmentRange } from './format'

const COVER_LETTER_PREVIEW_MAX_CHARS = 200

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max)}...` : value

const sectionHeading = <ParentMessage>(title: string): Html => {
  const h = html<ParentMessage>()

  return h.h3(
    [
      h.Class(
        'text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-200 pb-1 mb-2',
      ),
    ],
    [title],
  )
}

const headerSection = <ParentMessage>(
  fullName: string,
  pronounLabel: string,
  email: string,
  phone: string,
  portfolio: string,
): Html => {
  const h = html<ParentMessage>()

  const contacts = Array.filter([email, phone, portfolio], String.isNonEmpty)
  return h.div(
    [h.Class('text-center mb-4 pb-4 border-b border-gray-200')],
    [
      h.keyed('h2')(
        'preview-name',
        [h.Class('text-xl font-bold text-gray-900')],
        [fullName],
      ),
      ...(String.isNonEmpty(pronounLabel)
        ? [
            h.keyed('p')(
              'preview-pronouns',
              [h.Class('text-xs text-gray-500 italic')],
              [pronounLabel],
            ),
          ]
        : []),
      ...(Array.isReadonlyArrayNonEmpty(contacts)
        ? [
            h.keyed('p')(
              'preview-contact',
              [h.Class('text-xs text-gray-500 mt-1 break-words')],
              [contacts.join(' · ')],
            ),
          ]
        : []),
    ],
  )
}

const workEntryView = <ParentMessage>(entry: WorkHistory.Entry.Model): Html => {
  const h = html<ParentMessage>()

  return h.keyed('div')(
    `work-${entry.id}`,
    [h.Class('mb-3')],
    [
      ...(String.isNonEmpty(entry.title.value)
        ? [
            h.strong(
              [h.Class('block text-sm text-gray-900')],
              [entry.title.value],
            ),
          ]
        : []),
      ...(String.isNonEmpty(entry.company.value)
        ? [h.p([h.Class('text-xs text-gray-600')], [entry.company.value])]
        : []),
      ...Option.match(entry.startDate.maybeSelectedDate, {
        onNone: () => [],
        onSome: start => [
          h.p(
            [h.Class('text-xs text-gray-400 mt-0.5')],
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
        ? [h.p([h.Class('text-xs text-gray-600 mt-1')], [entry.description])]
        : []),
    ],
  )
}

const experienceSection = <ParentMessage>(
  workHistory: WorkHistory.Model,
): Html => {
  const h = html<ParentMessage>()

  return h.section(
    [h.Class('mb-4')],
    [
      sectionHeading<ParentMessage>('Experience'),
      ...Array.filter(
        workHistory.entries,
        entry =>
          String.isNonEmpty(entry.company.value) ||
          String.isNonEmpty(entry.title.value),
      ).map(entry => workEntryView<ParentMessage>(entry)),
    ],
  )
}

const educationTimelineLine = <ParentMessage>(
  entry: Education.Entry.Model,
): ReadonlyArray<Html> => {
  const h = html<ParentMessage>()

  if (entry.isCurrentlyEnrolled.isChecked) {
    return [
      h.p([h.Class('text-xs text-gray-400 mt-0.5')], ['Currently enrolled']),
    ]
  }
  if (String.isNonEmpty(entry.graduationYear)) {
    return [
      h.p(
        [h.Class('text-xs text-gray-400 mt-0.5')],
        [`Class of ${entry.graduationYear}`],
      ),
    ]
  }
  return []
}

const educationEntryView = <ParentMessage>(
  entry: Education.Entry.Model,
): Html => {
  const h = html<ParentMessage>()

  const degreeLine = Array.filter(
    [entry.degree.value, entry.fieldOfStudy.value],
    String.isNonEmpty,
  ).join(', ')
  return h.keyed('div')(
    `education-${entry.id}`,
    [h.Class('mb-3')],
    [
      ...(String.isNonEmpty(degreeLine)
        ? [h.strong([h.Class('block text-sm text-gray-900')], [degreeLine])]
        : []),
      ...(String.isNonEmpty(entry.school.value)
        ? [h.p([h.Class('text-xs text-gray-600')], [entry.school.value])]
        : []),
      ...educationTimelineLine<ParentMessage>(entry),
    ],
  )
}

const educationSection = <ParentMessage>(education: Education.Model): Html => {
  const h = html<ParentMessage>()

  return h.section(
    [h.Class('mb-4')],
    [
      sectionHeading<ParentMessage>('Education'),
      ...Array.filter(education.entries, entry =>
        String.isNonEmpty(entry.school.value),
      ).map(entry => educationEntryView<ParentMessage>(entry)),
    ],
  )
}

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

const skillGroupView = <ParentMessage>(
  group: Readonly<{ level: string; names: ReadonlyArray<string> }>,
): Html => {
  const h = html<ParentMessage>()

  return h.p(
    [h.Class('text-xs text-gray-700 mb-1')],
    [
      h.strong([h.Class('text-gray-900')], [`${group.level}:`]),
      ` ${group.names.join(', ')}`,
    ],
  )
}

const skillsSection = <ParentMessage>(skills: Skills.Model): Html => {
  const h = html<ParentMessage>()

  const grouped = groupSkillsByProficiency(skills.entries)
  return h.section(
    [h.Class('mb-4')],
    [
      sectionHeading<ParentMessage>('Skills'),
      ...grouped.map(group => skillGroupView<ParentMessage>(group)),
    ],
  )
}

const coverLetterSection = <ParentMessage>(content: string): Html => {
  const h = html<ParentMessage>()

  return h.section(
    [],
    [
      sectionHeading<ParentMessage>('Cover Letter'),
      h.p(
        [h.Class('text-xs text-gray-600 whitespace-pre-wrap')],
        [truncate(content, COVER_LETTER_PREVIEW_MAX_CHARS)],
      ),
    ],
  )
}

export const preview = <ParentMessage>({
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
  const h = html<ParentMessage>()

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

  return h.div(
    [h.Class('font-serif')],
    [
      headerSection<ParentMessage>(
        fullName,
        pronounLabel,
        email,
        phone,
        portfolio,
      ),
      ...(hasExperience ? [experienceSection<ParentMessage>(workHistory)] : []),
      ...(hasEducation ? [educationSection<ParentMessage>(education)] : []),
      ...(hasSkills ? [skillsSection<ParentMessage>(skills)] : []),
      ...(String.isNonEmpty(coverLetter.content)
        ? [coverLetterSection<ParentMessage>(coverLetter.content)]
        : []),
    ],
  )
}
