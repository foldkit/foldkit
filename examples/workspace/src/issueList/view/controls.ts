import type { Html } from 'foldkit/html'

import type { IssueStatus } from '../../domain'
import type { IssueListViewBuilder } from '../composition'

export const searchIcon = (h: IssueListViewBuilder): Html =>
  h.svg(
    [
      h.AriaHidden(true),
      h.Class(
        'pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400',
      ),
      h.ViewBox('0 0 24 24'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.5'),
    ],
    [
      h.circle([h.Cx('10.5'), h.Cy('10.5'), h.R('6.5')]),
      h.path([h.D('m16 16 4 4'), h.StrokeLinecap('round')]),
    ],
  )

export const plusIcon = (h: IssueListViewBuilder): Html =>
  h.svg(
    [
      h.AriaHidden(true),
      h.Class('size-3.5 shrink-0'),
      h.ViewBox('0 0 16 16'),
      h.Fill('none'),
      h.Stroke('currentColor'),
      h.StrokeWidth('1.5'),
    ],
    [h.path([h.D('M8 3v10M3 8h10'), h.StrokeLinecap('round')])],
  )

export const statusLabel = (status: typeof IssueStatus.Type): string =>
  status === 'InProgress' ? 'In progress' : status
