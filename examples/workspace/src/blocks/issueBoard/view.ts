import { clsx } from 'clsx'
import { Array, Option, pipe } from 'effect'
import type { Html } from 'foldkit/html'

import { Button, DragAndDrop } from '@foldkit/ui'

import { Issue, Member } from '../../domain'
import {
  DragAndDropBinding,
  IssueBoardComposition,
  type IssueBoardViewBuilder,
} from './composition'
import {
  containerId,
  draggableId,
  maybeIssueIdFromDraggableId,
} from './dragAndDrop'
import { Message } from './message'
import type { Model } from './model'
import type { ViewInputs } from './viewInputs'

const STATUSES: ReadonlyArray<Issue.Status> = [
  'Backlog',
  'Todo',
  'InProgress',
  'Done',
]

const INSTRUCTIONS_ID = 'workspace-board-instructions'

const ISSUE_TITLE_CLASS =
  'mb-3 block w-full rounded text-left text-sm font-medium leading-relaxed text-slate-700 outline-offset-2'

const ISSUE_CARD_CLASS = 'rounded-lg border bg-white p-3 shadow-sm'

const DRAG_HANDLE_CLASS =
  '-mx-1 -mt-1 mb-2 flex items-center gap-2 rounded px-1 py-1 text-xs font-medium tracking-wide text-slate-500 outline-offset-2 focus-visible:outline-2 focus-visible:outline-indigo-500'

const COLUMN_CLASS = 'min-w-0 rounded-xl border p-3'

const issueTitle = (
  issue: Issue.Issue,
  maybeHref: Option.Option<string>,
  isDisabled: boolean,
  h: IssueBoardViewBuilder,
): Html => {
  if (isDisabled) {
    return h.span(
      [h.AriaDisabled(true), h.Class(clsx(ISSUE_TITLE_CLASS, 'opacity-50'))],
      [issue.title],
    )
  }

  return Option.match(maybeHref, {
    onNone: () => h.span([h.Class(ISSUE_TITLE_CLASS)], [issue.title]),
    onSome: href =>
      h.a(
        [
          h.Href(href),
          h.Class(
            clsx(
              ISSUE_TITLE_CLASS,
              'cursor-pointer hover:text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-500',
            ),
          ),
        ],
        [issue.title],
      ),
  })
}

const maybeDraggedIssue = (
  dragAndDrop: Model['dragAndDrop'],
  issues: ReadonlyArray<Issue.Issue>,
) =>
  pipe(
    DragAndDrop.maybeDraggedItemId(dragAndDrop),
    Option.flatMap(maybeIssueIdFromDraggableId),
    Option.flatMap(issueId => Issue.findById(issues, issueId)),
  )

const issueCard = (
  dragAndDrop: Model['dragAndDrop'],
  issue: Issue.Issue,
  status: Issue.Status,
  index: number,
  viewInputs: ViewInputs,
  dragAndDropRenderInfo: DragAndDrop.RenderInfo,
  h: IssueBoardViewBuilder,
): Html => {
  const isMovePending = viewInputs.isMovePending ?? false
  const isDisabled = isMovePending || DragAndDrop.isDragging(dragAndDrop)

  const maybeHref = Option.fromNullishOr(viewInputs.issueHrefsById[issue.id])

  const maybeAssignee = Option.flatMap(issue.maybeAssigneeId, memberId =>
    Member.findById(viewInputs.members, memberId),
  )

  const isKeyboardDragged =
    DragAndDrop.DragState.guards.KeyboardDragging(dragAndDrop.dragState) &&
    dragAndDrop.dragState.itemId === draggableId(issue.id)

  return h.keyed('li')(
    issue.id,
    [
      h.Class(
        clsx(ISSUE_CARD_CLASS, {
          'border-[#aaa6ee] ring-2 ring-[#dcd9fa]': isKeyboardDragged,
          'border-[#e3e6ef]': !isKeyboardDragged,
        }),
      ),
    ],
    [
      h.div(
        [
          // NOTE: Keyboard drops focus this marker while the move is still saving.
          ...(isMovePending
            ? [h.DataAttribute('draggable-id', draggableId(issue.id))]
            : dragAndDropRenderInfo.draggable({
                itemId: draggableId(issue.id),
                containerId: containerId(status),
                index,
              })),
          h.Role('button'),
          h.AriaLabel(`Drag ${issue.identifier}`),
          h.AriaDescribedBy(INSTRUCTIONS_ID),
          h.Tabindex(0),
          h.AriaDisabled(isMovePending),
          h.Class(
            clsx(DRAG_HANDLE_CLASS, {
              'cursor-wait opacity-50': isMovePending,
              'cursor-grab active:cursor-grabbing': !isMovePending,
              'hover:bg-[#f4f3ff]': !isDisabled,
            }),
          ),
        ],
        [h.span([h.AriaHidden(true)], ['⠿']), h.span([], [issue.identifier])],
      ),
      issueTitle(issue, maybeHref, isDisabled, h),
      h.div(
        [
          h.Class(
            'flex min-h-7 items-center justify-between gap-2 text-xs font-medium text-slate-500',
          ),
        ],
        [
          h.span([], [`${issue.priority} priority`]),
          Option.match(maybeAssignee, {
            onNone: () => h.span([], ['Unassigned']),
            onSome: member =>
              h.span(
                [
                  h.Class(
                    'inline-grid size-7 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700',
                  ),
                  h.Title(member.name),
                ],
                [member.initials],
              ),
          }),
        ],
      ),
    ],
  )
}

const issueCardsWithDropPreview = (
  dragAndDrop: Model['dragAndDrop'],
  status: Issue.Status,
  issues: ReadonlyArray<Issue.Issue>,
  viewInputs: ViewInputs,
  dragAndDropRenderInfo: DragAndDrop.RenderInfo,
  h: IssueBoardViewBuilder,
): ReadonlyArray<Html> => {
  if (!DragAndDrop.isDragging(dragAndDrop)) {
    return Array.map(issues, (issue, index) =>
      issueCard(
        dragAndDrop,
        issue,
        status,
        index,
        viewInputs,
        dragAndDropRenderInfo,
        h,
      ),
    )
  }

  const maybeDragged = maybeDraggedIssue(dragAndDrop, viewInputs.issues)

  const visibleIssues = Array.filter(
    issues,
    issue => !Option.exists(maybeDragged, dragged => dragged.id === issue.id),
  )

  const cards = Array.map(visibleIssues, (issue, index) =>
    issueCard(
      dragAndDrop,
      issue,
      status,
      index,
      viewInputs,
      dragAndDropRenderInfo,
      h,
    ),
  )

  const maybeTarget = Option.filter(
    DragAndDrop.maybeDropTarget(dragAndDrop),
    target => target.containerId === containerId(status),
  )

  return Option.match(maybeTarget, {
    onNone: () => cards,
    onSome: target => {
      const insertionIndex = Math.max(0, Math.min(target.index, cards.length))

      const preview = DragAndDrop.DragState.guards.KeyboardDragging(
        dragAndDrop.dragState,
      )
        ? Option.match(maybeDragged, {
            onNone: () =>
              h.li([
                h.Class(
                  'min-h-28 rounded-lg border-2 border-dashed border-[#aaa6ee] bg-[#efedff]',
                ),
                h.AriaHidden(true),
              ]),
            onSome: issue =>
              issueCard(
                dragAndDrop,
                issue,
                status,
                insertionIndex,
                viewInputs,
                dragAndDropRenderInfo,
                h,
              ),
          })
        : h.li([
            h.Class(
              'min-h-28 rounded-lg border-2 border-dashed border-[#aaa6ee] bg-[#efedff]',
            ),
            h.AriaHidden(true),
          ])

      const [before, after] = Array.splitAt(cards, insertionIndex)

      return [...before, preview, ...after]
    },
  })
}

const column = (
  dragAndDrop: Model['dragAndDrop'],
  status: Issue.Status,
  viewInputs: ViewInputs,
  dragAndDropRenderInfo: DragAndDrop.RenderInfo,
  h: IssueBoardViewBuilder,
): Html => {
  const issues = Issue.forStatus(viewInputs.issues, status)

  const isDisabled =
    (viewInputs.isMovePending ?? false) || DragAndDrop.isDragging(dragAndDrop)

  const isTarget = Option.exists(
    DragAndDrop.maybeDropTarget(dragAndDrop),
    target => target.containerId === containerId(status),
  )

  return h.keyed('section')(
    status,
    [
      h.Class(
        clsx(COLUMN_CLASS, {
          'border-[#aaa6ee] bg-[#efedff] ring-2 ring-[#dcd9fa]': isTarget,
          'border-[#e3e6ef] bg-[#f7f8fc]': !isTarget,
        }),
      ),
      h.AriaLabel(Issue.statusLabel(status)),
    ],
    [
      h.header(
        [
          h.Class(
            'mb-3 flex items-center justify-between gap-3 border-b border-[#e3e6ef] px-1 pb-3',
          ),
        ],
        [
          h.h2(
            [h.Class('flex-1 text-sm font-semibold text-[#596378]')],
            [Issue.statusLabel(status)],
          ),
          h.span(
            [
              h.AriaLabel(`${issues.length} issues`),
              h.Class(
                'min-w-6 rounded bg-slate-100 px-1.5 py-0.5 text-center text-xs font-medium text-slate-600',
              ),
            ],
            [`${issues.length}`],
          ),
          Button.view(
            {
              type: 'button',
              onClick: Message.ClickedCreateIssue({ status }),
              isDisabled,
              toView: attributes =>
                h.button(
                  [
                    ...attributes.button,
                    h.Disabled(isDisabled),
                    h.AriaLabel(`Create issue in ${Issue.statusLabel(status)}`),
                    h.Title('Create issue'),
                    h.Class(
                      'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50',
                    ),
                  ],
                  [
                    h.svg(
                      [
                        h.AriaHidden(true),
                        h.Class('size-4'),
                        h.ViewBox('0 0 24 24'),
                        h.Fill('none'),
                        h.Stroke('currentColor'),
                        h.StrokeWidth('1.75'),
                      ],
                      [
                        h.path([
                          h.D('M12 5v14M5 12h14'),
                          h.StrokeLinecap('round'),
                        ]),
                      ],
                    ),
                  ],
                ),
            },
            h,
          ),
        ],
      ),
      h.ul(
        [
          ...dragAndDropRenderInfo.droppable(
            containerId(status),
            `${Issue.statusLabel(status)} issues`,
          ),
          h.Role('list'),
          h.Class('m-0 flex min-h-40 list-none flex-col gap-3 p-0'),
        ],
        issueCardsWithDropPreview(
          dragAndDrop,
          status,
          issues,
          viewInputs,
          dragAndDropRenderInfo,
          h,
        ),
      ),
    ],
  )
}

const draggedIssueGhost = (
  dragAndDrop: Model['dragAndDrop'],
  viewInputs: ViewInputs,
  h: IssueBoardViewBuilder,
): Html =>
  Option.match(
    Option.all({
      style: DragAndDrop.ghostStyle(dragAndDrop),
      issue: maybeDraggedIssue(dragAndDrop, viewInputs.issues),
    }),
    {
      onNone: () => h.empty,
      onSome: ({ style, issue }) =>
        h.div(
          [
            h.Style(style),
            h.Class(
              'pointer-events-none grid w-60 rotate-2 gap-2 rounded-lg border border-[#dcd9fa] bg-white p-3 text-sm font-medium text-[#273144] shadow-xl',
            ),
            h.AriaHidden(true),
          ],
          [
            h.span(
              [h.Class('text-xs font-medium text-slate-500')],
              [issue.identifier],
            ),
            h.strong([h.Class('font-medium leading-relaxed')], [issue.title]),
          ],
        ),
    },
  )

export const view = IssueBoardComposition.makeView.withInputs(
  (model, viewInputs, h) =>
    h.section(
      [
        h.Class('w-full min-w-0 bg-white p-5 lg:p-8'),
        h.AriaLabel('Issue board'),
      ],
      [
        h.p(
          [
            h.Id(INSTRUCTIONS_ID),
            h.Class(
              'mb-5 max-w-4xl text-xs font-medium leading-6 text-slate-500',
            ),
          ],
          [
            'Drag a handle to move an issue. With a handle focused, press Space to pick up, arrows to reorder, Tab to change status, and Space to drop.',
          ],
        ),
        h.block(
          DragAndDropBinding.embedView({
            slotId: model.dragAndDrop.id,
            model: model.dragAndDrop,
            viewInputs: {
              toView: dragAndDropRenderInfo =>
                h.div(
                  [],
                  [
                    h.div(
                      [
                        h.Class(
                          'grid auto-cols-[minmax(15rem,1fr)] grid-flow-col items-start gap-4 overflow-x-auto pb-4',
                        ),
                      ],
                      Array.map(STATUSES, status =>
                        column(
                          model.dragAndDrop,
                          status,
                          viewInputs,
                          dragAndDropRenderInfo,
                          h,
                        ),
                      ),
                    ),
                    draggedIssueGhost(model.dragAndDrop, viewInputs, h),
                  ],
                ),
            },
          }),
        ),
        h.p(
          [h.Class('sr-only'), h.Role('status'), h.AriaLive('polite')],
          [model.announcement],
        ),
      ],
    ),
)
