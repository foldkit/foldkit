import { clsx } from 'clsx'

const CONTROL_CLASS =
  'min-w-0 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 shadow-xs outline-none transition-colors hover:border-slate-300 focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 data-[disabled]:cursor-not-allowed data-[disabled]:bg-slate-50 data-[disabled]:opacity-60'

export const TEXT_CONTROL_CLASS = clsx(
  CONTROL_CLASS,
  'w-full placeholder:text-slate-500',
)

export const INPUT_CLASS = clsx(TEXT_CONTROL_CLASS, 'h-10 px-3 py-2 text-sm')

export const COMPACT_INPUT_CLASS = clsx(
  TEXT_CONTROL_CLASS,
  'h-9 px-3 py-2 text-sm',
)

export const LISTBOX_BUTTON_CLASS = clsx(
  CONTROL_CLASS,
  'flex h-10 w-full cursor-pointer items-center justify-between gap-3 px-3 text-left text-sm',
)

export const COMPACT_LISTBOX_BUTTON_CLASS = clsx(
  CONTROL_CLASS,
  'flex h-9 w-full cursor-pointer items-center justify-between gap-3 px-3 text-left text-sm',
)

const BUTTON_CLASS_SHARED =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg border text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

const NEUTRAL_BUTTON_CLASS =
  'border-slate-200 bg-white text-slate-600 shadow-xs hover:border-slate-300 hover:bg-slate-50'

export const BUTTON_CLASS = clsx(
  BUTTON_CLASS_SHARED,
  NEUTRAL_BUTTON_CLASS,
  'h-10 px-4 py-2',
)

export const COMPACT_BUTTON_CLASS = clsx(
  BUTTON_CLASS_SHARED,
  NEUTRAL_BUTTON_CLASS,
  'h-9 px-3 py-2',
)

const PRIMARY_BUTTON_APPEARANCE =
  'border-indigo-600 bg-indigo-600 text-white shadow-xs hover:bg-indigo-700 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400'

export const PRIMARY_BUTTON_CLASS = clsx(
  BUTTON_CLASS_SHARED,
  PRIMARY_BUTTON_APPEARANCE,
  'h-10 px-4 py-2',
)

export const COMPACT_PRIMARY_BUTTON_CLASS = clsx(
  BUTTON_CLASS_SHARED,
  PRIMARY_BUTTON_APPEARANCE,
  'h-9 px-3 py-2',
)

const SURFACE_CLASS = 'border border-slate-200 bg-white text-slate-700'

export const POPOVER_SURFACE_CLASS = clsx(SURFACE_CLASS, 'rounded-lg shadow-lg')

export const DIALOG_SURFACE_CLASS = clsx(SURFACE_CLASS, 'rounded-xl shadow-xl')

const OPTION_CLASS =
  'flex cursor-pointer items-center rounded-md font-medium text-slate-700 outline-none hover:bg-slate-50 data-[active]:bg-indigo-50 data-[active]:text-indigo-700 data-[selected]:font-semibold data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'

export const LISTBOX_OPTION_CLASS = clsx(
  OPTION_CLASS,
  'group min-h-9 px-2.5 py-2 text-sm',
)

export const COMMAND_OPTION_CLASS = clsx(
  OPTION_CLASS,
  'min-h-12 gap-3 px-3 py-3 text-sm',
)
