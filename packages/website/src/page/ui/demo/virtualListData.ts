export type Activity = Readonly<{
  id: number
  actor: string
  initial: string
  colorClass: string
  verb: string
  target: string
  timeAgo: string
  hasSummary: boolean
}>

export const ROW_COUNT = 10_000
