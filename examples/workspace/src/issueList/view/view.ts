import { Array } from 'effect'

import { Button } from '@foldkit/ui'

import { IssueListComposition } from '../composition'
import { filterAndSortIssues } from '../filter'
import { Message } from '../message'
import type { ViewInputs } from '../viewInputs'
import { issueGroupsView } from './rows'
import { filterToolbarView, listSummaryView } from './toolbar'

export const view = IssueListComposition.makeView.withInputs<
  typeof ViewInputs.Type
>((model, viewInputs, h) => {
  const issues = filterAndSortIssues(viewInputs.filters, viewInputs.issues)

  return h.section(
    [
      h.Class('@container min-w-0 flex-1 bg-white text-sm font-medium'),
      h.AriaLabel('Issues'),
    ],
    [
      h.div(
        [h.Class('space-y-3 border-b border-slate-200 px-4 py-4 @lg:px-5')],
        [
          filterToolbarView(
            model,
            viewInputs.filters,
            Array.isReadonlyArrayEmpty(viewInputs.projects),
            h,
          ),
          listSummaryView(model, viewInputs.filters, issues.length, h),
        ],
      ),
      Array.match(issues, {
        onEmpty: () =>
          h.div(
            [
              h.Class(
                'p-12 text-center text-sm text-slate-500 [&_h2]:mb-2 [&_h2]:font-semibold',
              ),
            ],
            [
              h.h2([], ['No matching issues']),
              h.p([], ['Try another search or status filter.']),
              Button.view(
                {
                  onClick: Message.RequestedClearFilters(),
                  toView: attributes =>
                    h.button(
                      [...attributes.button, h.Class('button-compact')],
                      ['Clear filters'],
                    ),
                },
                h,
              ),
            ],
          ),
        onNonEmpty: issues =>
          issueGroupsView(issues, viewInputs.filters, viewInputs, h),
      }),
    ],
  )
})
