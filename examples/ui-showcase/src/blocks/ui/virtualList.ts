import { makeBlock as makeVirtualListBlock } from '@foldkit/ui/virtualList'

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

export const ActivityVirtualListBlock = makeVirtualListBlock<Activity>()

export const ROW_COUNT = 10_000
