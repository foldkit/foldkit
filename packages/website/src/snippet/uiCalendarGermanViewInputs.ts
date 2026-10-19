const viewInputs = {
  previousMonthLabel: 'Vorheriger Monat',
  toDaysGridLabel: monthYear => `Kalender, ${monthYear}`,
  toWeekLabel: weekStart =>
    `Woche ab ${Calendar.formatLong(weekStart, germanLocale)}`,
  toMonthsGridLabel: year => `Monatsauswahl, ${year}`,
  toYearsGridLabel: (startYear, endYear) =>
    `Jahresauswahl, ${startYear}–${endYear}`,
}
