import { clsx } from 'clsx'
import { Array, Option, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { Button, Input } from '@foldkit/ui'

import { Issue, Member } from '../domain'

const Model = Schema.Struct({
  query: Schema.String,
  maybeSelectedMemberId: Schema.Option(Schema.String),
})

export const Message = defineMessageUnion({
  UpdatedQuery: { value: Schema.String },
  ClickedMember: { memberId: Schema.String },
})

const MemberDirectoryDefinition = Block.makeDefinition('MemberDirectory', {
  Model,
  Message,
})

const MemberDirectoryComposition = MemberDirectoryDefinition.makeComposition()
type MemberDirectoryViewBuilder = Block.ViewBuilderFor<
  typeof MemberDirectoryComposition
>

const init = MemberDirectoryComposition.makeInit(() => ({
  model: { query: '', maybeSelectedMemberId: Option.none() },
}))

export const update = MemberDirectoryComposition.makeUpdate({
  UpdatedQuery: MemberDirectoryDefinition.makeFieldsStep.fromMessage(
    ({ value }) => ({
      query: () => value,
      maybeSelectedMemberId: () => Option.none(),
    }),
  ),
  ClickedMember: MemberDirectoryDefinition.makeFieldsStep.fromMessage(
    ({ memberId }) => ({
      maybeSelectedMemberId: () => Option.some(memberId),
    }),
  ),
})

const ViewInputs = Schema.Struct({
  members: Schema.Array(Member),
  issues: Schema.Array(Issue),
  issueHrefs: Schema.Record(Schema.String, Schema.String),
})

const MEMBER_CARD_CLASS =
  'flex w-full cursor-pointer flex-col items-start gap-3 rounded-xl border p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500'

const assignedIssues = (
  memberId: string,
  issues: ReadonlyArray<typeof Issue.Type>,
) =>
  Array.filter(issues, issue =>
    Option.contains(issue.maybeAssigneeId, memberId),
  )

const memberCard = (
  member: typeof Member.Type,
  model: typeof Model.Type,
  issues: ReadonlyArray<typeof Issue.Type>,
  h: MemberDirectoryViewBuilder,
): Html => {
  const assigned = assignedIssues(member.id, issues)

  const isSelected = Option.contains(model.maybeSelectedMemberId, member.id)

  return h.keyed('li')(
    member.id,
    [],
    [
      Button.view(
        {
          onClick: Message.ClickedMember({ memberId: member.id }),
          toView: attributes =>
            h.button(
              [
                ...attributes.button,
                h.Class(
                  clsx(MEMBER_CARD_CLASS, {
                    'border-indigo-200 bg-indigo-50 shadow-sm': isSelected,
                    'border-slate-200 bg-white transition hover:border-indigo-200 hover:shadow-sm':
                      !isSelected,
                  }),
                ),
                h.AriaLabel(`View ${member.name}`),
                h.AriaPressed(isSelected ? 'true' : 'false'),
              ],
              [
                h.span(
                  [
                    h.Class(
                      'inline-grid size-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600',
                    ),
                    h.AriaHidden(true),
                  ],
                  [member.initials],
                ),
                h.strong(
                  [h.Class('text-sm font-semibold text-slate-700')],
                  [member.name],
                ),
                h.span(
                  [h.Class('text-xs font-medium leading-6 text-slate-500')],
                  [
                    `${assigned.length} assigned ${assigned.length === 1 ? 'issue' : 'issues'}`,
                  ],
                ),
              ],
            ),
        },
        h,
      ),
    ],
  )
}

const assignedIssueContent = (
  issue: typeof Issue.Type,
  h: MemberDirectoryViewBuilder,
): ReadonlyArray<Html> => [
  h.span(
    [h.Class('text-xs font-medium tracking-wide text-slate-500')],
    [issue.identifier],
  ),
  h.span([], [issue.title]),
  h.span(
    [h.Class('text-xs font-medium leading-6 text-slate-500')],
    [issue.status === 'InProgress' ? 'In progress' : issue.status],
  ),
]

const assignedIssueView = (
  issue: typeof Issue.Type,
  issueHrefs: (typeof ViewInputs.Type)['issueHrefs'],
  h: MemberDirectoryViewBuilder,
): Html =>
  Option.match(Option.fromNullishOr(issueHrefs[issue.id]), {
    onNone: () =>
      h.div(
        [
          h.Class(
            'flex w-full flex-col items-start gap-1 rounded-lg px-2 py-3 text-left text-sm leading-6 text-slate-600',
          ),
        ],
        assignedIssueContent(issue, h),
      ),
    onSome: href =>
      h.a(
        [
          h.Href(href),
          h.Class(
            'flex w-full cursor-pointer flex-col items-start gap-1 rounded-lg px-2 py-3 text-left text-sm leading-6 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
          ),
          h.AriaLabel(`${issue.identifier} ${issue.title}`),
        ],
        assignedIssueContent(issue, h),
      ),
  })

const memberProfile = (
  member: typeof Member.Type,
  issues: ReadonlyArray<typeof Issue.Type>,
  issueHrefs: (typeof ViewInputs.Type)['issueHrefs'],
  h: MemberDirectoryViewBuilder,
): Html => {
  const assigned = assignedIssues(member.id, issues)
  const active = Array.filter(assigned, issue => issue.status !== 'Done')

  return h.section(
    [
      h.Class('min-w-0 rounded-xl border border-slate-200 bg-white p-5'),
      h.AriaLabel(`${member.name} details`),
    ],
    [
      h.div(
        [
          h.Class(
            'mb-6 flex items-center gap-3 border-b border-slate-100 pb-5',
          ),
        ],
        [
          h.span(
            [
              h.Class(
                'inline-grid size-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-600',
              ),
              h.AriaHidden(true),
            ],
            [member.initials],
          ),
          h.div(
            [],
            [
              h.h2(
                [h.Class('text-base font-semibold text-slate-700')],
                [member.name],
              ),
              h.p(
                [h.Class('text-xs font-medium leading-6 text-slate-500')],
                [`${active.length} active · ${assigned.length} assigned`],
              ),
            ],
          ),
        ],
      ),
      h.h3(
        [h.Class('text-base font-semibold text-slate-700')],
        ['Assigned issues'],
      ),
      Array.match(assigned, {
        onEmpty: () =>
          h.p(
            [
              h.Class(
                'rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm leading-7 text-slate-500',
              ),
            ],
            ['No assigned issues.'],
          ),
        onNonEmpty: assigned =>
          h.ul(
            [h.Class('mt-3 divide-y divide-slate-100')],
            Array.map(assigned, issue =>
              h.keyed('li')(
                issue.id,
                [],
                [assignedIssueView(issue, issueHrefs, h)],
              ),
            ),
          ),
      }),
    ],
  )
}

export const view = MemberDirectoryComposition.makeView.withInputs<
  typeof ViewInputs.Type
>((model, viewInputs, h) => {
  const searchText = model.query.trim().toLowerCase()

  const members = Array.filter(viewInputs.members, member =>
    `${member.name} ${member.initials}`.toLowerCase().includes(searchText),
  )

  const maybeSelectedMember = Option.flatMap(
    model.maybeSelectedMemberId,
    memberId =>
      Array.findFirst(viewInputs.members, member => member.id === memberId),
  )

  return h.section(
    [h.Class('space-y-6 p-5 lg:p-8'), h.AriaLabel('Member directory')],
    [
      h.div(
        [h.Class('flex flex-wrap items-center justify-between gap-3')],
        [
          Input.view(
            {
              id: 'workspace-member-search',
              type: 'search',
              value: model.query,
              placeholder: 'Search members…',
              onInput: value => Message.UpdatedQuery({ value }),
              toView: attributes =>
                h.div(
                  [h.Class('w-full max-w-md')],
                  [
                    h.label(
                      [...attributes.label, h.Class('sr-only')],
                      ['Search members'],
                    ),
                    h.input([...attributes.input, h.Class('input-control')]),
                  ],
                ),
            },
            h,
          ),
          h.span(
            [h.Class('text-xs font-medium leading-6 text-slate-500')],
            [`${members.length} members`],
          ),
        ],
      ),
      h.div(
        [
          h.Class(
            'grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]',
          ),
        ],
        [
          Array.match(members, {
            onEmpty: () =>
              h.p(
                [
                  h.Class(
                    'rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm leading-7 text-slate-500',
                  ),
                  h.Role('status'),
                ],
                ['No matching members.'],
              ),
            onNonEmpty: members =>
              h.ul(
                [h.Class('grid gap-3 sm:grid-cols-2 2xl:grid-cols-3')],
                Array.map(members, member =>
                  memberCard(member, model, viewInputs.issues, h),
                ),
              ),
          }),
          Option.match(maybeSelectedMember, {
            onNone: () =>
              h.p(
                [
                  h.Class(
                    'rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm leading-7 text-slate-500',
                  ),
                ],
                ['Select a teammate to see their assigned issues.'],
              ),
            onSome: member =>
              memberProfile(
                member,
                viewInputs.issues,
                viewInputs.issueHrefs,
                h,
              ),
          }),
        ],
      ),
    ],
  )
})

const prepare = () =>
  MemberDirectoryComposition.prepareBlock({ init, update, view })
export const MemberDirectoryBlock: Block.FromAssemblyWithView<
  typeof Model,
  typeof prepare
> = Block.assemble(prepare)
