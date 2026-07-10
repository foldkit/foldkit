import { Html, html } from 'foldkit/html'

const icon = (d: string, className: string): Html => {
  const h = html()

  return h.svg(
    [
      h.AriaHidden(true),
      h.Class(className),
      h.Xmlns('http://www.w3.org/2000/svg'),
      h.Fill('none'),
      h.ViewBox('0 0 24 24'),
      h.StrokeWidth('1.75'),
      h.Stroke('currentColor'),
    ],
    [h.path([h.StrokeLinecap('round'), h.StrokeLinejoin('round'), h.D(d)], [])],
  )
}

export const arrowRight = (className: string = 'h-4 w-4'): Html =>
  icon('M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3', className)

export const check = (className: string = 'h-4 w-4'): Html =>
  icon('m4.5 12.75 6 6 9-13.5', className)

export const codeBracket = (className: string = 'h-4 w-4'): Html =>
  icon(
    'M17.25 6.75 22.5 12l-5.25 5.25M6.75 17.25 1.5 12l5.25-5.25M14.25 3.75l-4.5 16.5',
    className,
  )

export const creditCard = (className: string = 'h-5 w-5'): Html =>
  icon(
    'M2.25 8.25h19.5m-18 9h16.5a1.5 1.5 0 0 0 1.5-1.5v-9a1.5 1.5 0 0 0-1.5-1.5H3.75a1.5 1.5 0 0 0-1.5 1.5v9a1.5 1.5 0 0 0 1.5 1.5Zm1.5-5.25h3',
    className,
  )

export const download = (className: string = 'h-5 w-5'): Html =>
  icon(
    'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-4.5-6L12 15m0 0-4.5-4.5M12 15V3',
    className,
  )

export const lockClosed = (className: string = 'h-4 w-4'): Html =>
  icon(
    'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 10.5h10.5a2.25 2.25 0 0 0 2.25-2.25v-6a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6A2.25 2.25 0 0 0 6.75 21Z',
    className,
  )

export const truck = (className: string = 'h-5 w-5'): Html =>
  icon(
    'M8.25 18.75a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0m3 0h6.75m-9.75 0H3.75A.75.75 0 0 1 3 18V6.75A.75.75 0 0 1 3.75 6h9.75v12.75m1.5 0a1.5 1.5 0 1 1 3 0m-3 0a1.5 1.5 0 1 0 3 0m-3 0h3m0 0h2.25A.75.75 0 0 0 21 18v-5.25l-3-3H13.5',
    className,
  )
