import { DateTime } from 'effect'

const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const integerFormatter = new Intl.NumberFormat('en-US')

export const formatCompact = (value: number): string =>
  compactFormatter.format(value)

export const formatInteger = (value: number): string =>
  integerFormatter.format(value)

export const formatFetchedAt = (milliseconds: number): string =>
  DateTime.formatLocal(DateTime.makeUnsafe(milliseconds), {
    locale: 'en-US',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
