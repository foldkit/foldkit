import { Calendar } from 'foldkit'

import type { ViewInputs } from '@foldkit/ui/calendar'

import { germanLocale } from './uiCalendarGermanLocale'

export const viewInputs: Partial<ViewInputs> = {
  previousMonthLabel: 'Vorheriger Monat',
  toDaysGridLabel: monthYear => `Kalender, ${monthYear}`,
  toWeekLabel: weekStart =>
    `Woche ab ${Calendar.formatLong(weekStart, germanLocale)}`,
  toMonthsGridLabel: year => `Monatsauswahl, ${year}`,
  toYearsGridLabel: (startYear, endYear) =>
    `Jahresauswahl, ${startYear}–${endYear}`,
}
