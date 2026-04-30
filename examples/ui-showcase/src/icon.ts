import type { Html } from 'foldkit/html'

import {
  AriaHidden,
  Class,
  D,
  Fill,
  Stroke,
  StrokeLinecap,
  StrokeLinejoin,
  StrokeWidth,
  ViewBox,
  Xmlns,
  path,
  svg,
} from './html'

const heroIcon = (className: string, strokeWidth: string, d: string): Html =>
  svg(
    [
      AriaHidden(true),
      Class(className),
      Xmlns('http://www.w3.org/2000/svg'),
      Fill('none'),
      ViewBox('0 0 24 24'),
      StrokeWidth(strokeWidth),
      Stroke('currentColor'),
    ],
    [path([StrokeLinecap('round'), StrokeLinejoin('round'), D(d)], [])],
  )

export const chevronDown = (className: string = 'w-6 h-6'): Html =>
  heroIcon(className, '1.5', 'M19.5 8.25l-7.5 7.5-7.5-7.5')

export const chevronLeft = (className: string = 'w-6 h-6'): Html =>
  heroIcon(className, '1.5', 'M15.75 19.5L8.25 12l7.5-7.5')

export const chevronRight = (className: string = 'w-6 h-6'): Html =>
  heroIcon(className, '1.5', 'm8.25 4.5 7.5 7.5-7.5 7.5')

export const check = (className: string = 'w-6 h-6'): Html =>
  heroIcon(className, '2', 'M4.5 12.75l6 6 9-13.5')

export const pencil = (className: string = 'w-5 h-5'): Html =>
  heroIcon(
    className,
    '1.5',
    'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125',
  )

export const documentDuplicate = (className: string = 'w-5 h-5'): Html =>
  heroIcon(
    className,
    '1.5',
    'M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75',
  )

export const archiveBox = (className: string = 'w-5 h-5'): Html =>
  heroIcon(
    className,
    '1.5',
    'm20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H2.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z',
  )

export const arrowRight = (className: string = 'w-5 h-5'): Html =>
  heroIcon(className, '1.5', 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3')

export const trash = (className: string = 'w-5 h-5'): Html =>
  heroIcon(
    className,
    '1.5',
    'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
  )

export const menu = (className: string = 'w-6 h-6'): Html =>
  heroIcon(className, '1.5', 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5')

export const xMark = (className: string = 'w-6 h-6'): Html =>
  heroIcon(className, '1.5', 'M6 18 18 6M6 6l12 12')
