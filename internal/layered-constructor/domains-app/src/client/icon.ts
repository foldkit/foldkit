import { type Html, inertHtml as ih } from 'foldkit/html'

const icon = (children: ReadonlyArray<Html>) =>
  ih.svg(
    [
      ih.AriaHidden(true),
      ih.Class('icon'),
      ih.Xmlns('http://www.w3.org/2000/svg'),
      ih.Width('24'),
      ih.Height('24'),
      ih.ViewBox('0 0 24 24'),
      ih.Fill('none'),
      ih.Stroke('currentColor'),
      ih.StrokeWidth('2'),
      ih.StrokeLinecap('round'),
      ih.StrokeLinejoin('round'),
    ],
    children,
  )

export const cart = () =>
  icon([
    ih.path([
      ih.D(
        'm2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18',
      ),
    ]),
    ih.path([
      ih.D(
        'M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25',
      ),
    ]),
    ih.circle([ih.Cx('18'), ih.Cy('20'), ih.R('2')]),
    ih.circle([ih.Cx('8'), ih.Cy('20'), ih.R('2')]),
  ])

export const search = () =>
  icon([
    ih.path([ih.D('m21 21-4.34-4.34')]),
    ih.circle([ih.Cx('11'), ih.Cy('11'), ih.R('8')]),
  ])

export const close = () =>
  icon([ih.path([ih.D('M18 6 6 18')]), ih.path([ih.D('m6 6 12 12')])])

export const filter = () =>
  icon([
    ih.path([ih.D('M4 7h16')]),
    ih.path([ih.D('M7 12h10')]),
    ih.path([ih.D('M10 17h4')]),
  ])

export const check = () => icon([ih.path([ih.D('M20 6 9 17l-5-5')])])

export const arrowUpRight = () =>
  icon([ih.path([ih.D('M7 7h10v10')]), ih.path([ih.D('M7 17 17 7')])])

export const chevronDown = () => icon([ih.path([ih.D('m6 9 6 6 6-6')])])
