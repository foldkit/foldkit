import clsx from 'clsx'
import {
  Array,
  Effect,
  Equal,
  Option,
  Order,
  Record,
  Schema,
  String,
  pipe,
} from 'effect'
import { Block } from 'foldkit'
import { type Html, inertHtml as ih } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { Button } from '@foldkit/ui'

import { employmentRange } from './domain/format'
import type { CoverLetter } from './step/coverLetter'
import type { Education } from './step/education/education'
import type { EducationEntry } from './step/education/educationEntry'
import type { PersonalInfo } from './step/personalInfo'
import type { Skills } from './step/skills/skills'
import type { SkillsEntry } from './step/skills/skillsEntry'
import type { WorkHistory } from './step/workHistory/workHistory'
import type { WorkHistoryEntry } from './step/workHistory/workHistoryEntry'

const Model = Schema.Struct({
  isVisible: Schema.Boolean,
})

const Message = defineMessageUnion({
  ToggledPreview: {},
})

type PreviewViewInput = Readonly<{
  personalInfo: PersonalInfo['model']
  workHistory: WorkHistory['model']
  education: Education['model']
  skills: Skills['model']
  coverLetter: CoverLetter['model']
}>

export class Preview extends Block<Preview, void, PreviewViewInput>()(
  'Preview',
  { Model, Message },
) {}

export const PreviewLive = Preview.make(
  Effect.fn(function* () {
    return {
      model: { isVisible: false },

      update: {
        ToggledPreview: model => ({
          model: modifyFields(model, { isVisible: isVisible => !isVisible }),
        }),
      },

      view: (model, h, input) =>
        h.div(
          [h.Class('contents')],
          [
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
                      [resume(input)],
                    ),
                  ],
                ),
              ],
            ),
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
                              model.isVisible
                                ? 'bg-gray-800 text-white'
                                : 'bg-indigo-600 text-white',
                            ),
                          ),
                        ],
                        [model.isVisible ? 'Hide Preview' : 'Preview'],
                      ),
                  },
                  h,
                ),
              ],
            ),
            ...(model.isVisible
              ? [
                  h.div(
                    [
                      h.Class(
                        'fixed inset-x-4 top-16 bottom-4 overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-2xl xl:hidden',
                      ),
                    ],
                    [resume(input)],
                  ),
                ]
              : []),
          ],
        ),
    }
  }),
)

type WorkHistoryEntryModel = WorkHistoryEntry['model']
type EducationEntryModel = EducationEntry['model']
type SkillsEntryModel = SkillsEntry['model']

const COVER_LETTER_PREVIEW_MAX_CHARS = 200

const truncate = (value: string, max: number): string =>
  value.length > max ? `${value.slice(0, max)}...` : value

const sectionHeading = (title: string): Html =>
  ih.h3(
    [
      ih.Class(
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
  return ih.div(
    [ih.Class('text-center mb-4 pb-4 border-b border-gray-200')],
    [
      ih.h2([ih.Class('text-xl font-bold text-gray-900')], [fullName]),
      ...(String.isNonEmpty(pronounLabel)
        ? [ih.p([ih.Class('text-xs text-gray-500 italic')], [pronounLabel])]
        : []),
      ...(Array.isReadonlyArrayNonEmpty(contacts)
        ? [
            ih.p(
              [ih.Class('text-xs text-gray-500 mt-1 break-words')],
              [contacts.join(' · ')],
            ),
          ]
        : []),
    ],
  )
}

const workEntryView = (entry: WorkHistoryEntryModel): Html =>
  ih.keyed('div')(
    `work-${entry.id}`,
    [ih.Class('mb-3')],
    [
      ...(String.isNonEmpty(entry.title.value)
        ? [
            ih.strong(
              [ih.Class('block text-sm text-gray-900')],
              [entry.title.value],
            ),
          ]
        : []),
      ...(String.isNonEmpty(entry.company.value)
        ? [ih.p([ih.Class('text-xs text-gray-600')], [entry.company.value])]
        : []),
      ...Option.match(entry.maybeStartDate, {
        onNone: () => [],
        onSome: start => [
          ih.p(
            [ih.Class('text-xs text-gray-400 mt-0.5')],
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
      ...(String.isNonEmpty(entry.description)
        ? [ih.p([ih.Class('text-xs text-gray-600 mt-1')], [entry.description])]
        : []),
    ],
  )

const experienceSection = (
  workEntries: ReadonlyArray<WorkHistoryEntryModel>,
): Html =>
  ih.section(
    [ih.Class('mb-4')],
    [
      sectionHeading('Experience'),
      ...Array.filter(
        workEntries,
        entry =>
          String.isNonEmpty(entry.company.value) ||
          String.isNonEmpty(entry.title.value),
      ).map(entry => workEntryView(entry)),
    ],
  )

const educationTimelineLine = (
  entry: EducationEntryModel,
): ReadonlyArray<Html> => {
  if (entry.isCurrentlyEnrolled) {
    return [
      ih.p([ih.Class('text-xs text-gray-400 mt-0.5')], ['Currently enrolled']),
    ]
  }
  return Option.match(entry.maybeGraduationYear, {
    onNone: () => [],
    onSome: graduationYear => [
      ih.p(
        [ih.Class('text-xs text-gray-400 mt-0.5')],
        [`Class of ${graduationYear}`],
      ),
    ],
  })
}

const educationEntryView = (entry: EducationEntryModel): Html => {
  const degreeLine = Array.filter(
    [entry.degree.value, entry.fieldOfStudy.value],
    String.isNonEmpty,
  ).join(', ')
  return ih.keyed('div')(
    `education-${entry.id}`,
    [ih.Class('mb-3')],
    [
      ...(String.isNonEmpty(degreeLine)
        ? [ih.strong([ih.Class('block text-sm text-gray-900')], [degreeLine])]
        : []),
      ...(String.isNonEmpty(entry.school.value)
        ? [ih.p([ih.Class('text-xs text-gray-600')], [entry.school.value])]
        : []),
      ...educationTimelineLine(entry),
    ],
  )
}

const educationSection = (
  educationEntries: ReadonlyArray<EducationEntryModel>,
): Html =>
  ih.section(
    [ih.Class('mb-4')],
    [
      sectionHeading('Education'),
      ...Array.filter(educationEntries, entry =>
        String.isNonEmpty(entry.school.value),
      ).map(entry => educationEntryView(entry)),
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
  entries: ReadonlyArray<SkillsEntryModel>,
): SkillsByProficiency =>
  pipe(
    entries,
    Array.filter(entry => String.isNonEmpty(entry.name.value)),
    Array.groupBy<SkillsEntryModel, string>(entry => entry.proficiency),
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
  ih.p(
    [ih.Class('text-xs text-gray-700 mb-1')],
    [
      ih.strong([ih.Class('text-gray-900')], [`${group.level}:`]),
      ` ${group.names.join(', ')}`,
    ],
  )

const skillsSection = (
  skillsEntries: ReadonlyArray<SkillsEntryModel>,
): Html => {
  const grouped = groupSkillsByProficiency(skillsEntries)
  return ih.section(
    [ih.Class('mb-4')],
    [sectionHeading('Skills'), ...grouped.map(group => skillGroupView(group))],
  )
}

const coverLetterSection = (content: string): Html =>
  ih.section(
    [],
    [
      sectionHeading('Cover Letter'),
      ih.p(
        [ih.Class('text-xs text-gray-600 whitespace-pre-wrap')],
        [truncate(content, COVER_LETTER_PREVIEW_MAX_CHARS)],
      ),
    ],
  )

const toEntryModels = <EntryModel>(
  entries: ReadonlyArray<Readonly<{ model: EntryModel }>>,
): ReadonlyArray<EntryModel> => Array.map(entries, ({ model }) => model)

const resume = (input: PreviewViewInput): Html => {
  const {
    firstName: { value: firstName },
    lastName: { value: lastName },
    email: { value: email },
    phone: { value: phone },
    portfolioUrl: { value: portfolio },
    maybeSelectedPronoun,
    customPronouns,
  } = input.personalInfo
  const workEntries = toEntryModels(input.workHistory.entries)
  const educationEntries = toEntryModels(input.education.entries)
  const skillsEntries = toEntryModels(input.skills.entries)
  const coverLetterContent = input.coverLetter.content

  const fullName =
    String.isNonEmpty(firstName) || String.isNonEmpty(lastName)
      ? `${firstName} ${lastName}`.trim()
      : 'Your Name'

  const pronounLabel = Option.match(maybeSelectedPronoun, {
    onNone: () => '',
    onSome: value => (value === 'Other' ? customPronouns : value),
  })

  const hasExperience = Array.some(
    workEntries,
    entry =>
      String.isNonEmpty(entry.company.value) ||
      String.isNonEmpty(entry.title.value),
  )
  const hasEducation = Array.some(educationEntries, entry =>
    String.isNonEmpty(entry.school.value),
  )
  const hasSkills = Array.some(skillsEntries, entry =>
    String.isNonEmpty(entry.name.value),
  )

  return ih.div(
    [ih.Class('font-serif')],
    [
      headerSection(fullName, pronounLabel, email, phone, portfolio),
      ...(hasExperience ? [experienceSection(workEntries)] : []),
      ...(hasEducation ? [educationSection(educationEntries)] : []),
      ...(hasSkills ? [skillsSection(skillsEntries)] : []),
      ...(String.isNonEmpty(coverLetterContent)
        ? [coverLetterSection(coverLetterContent)]
        : []),
    ],
  )
}
