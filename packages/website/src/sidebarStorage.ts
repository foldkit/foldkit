import { Schema } from 'effect'

export const SIDEBAR_STORAGE_KEY = 'foldkit-sidebar-state'

export const SidebarState = Schema.Struct({
  open: Schema.Record(Schema.String, Schema.Boolean),
})
export type SidebarState = typeof SidebarState.Type

export const SidebarStateJsonString = Schema.fromJsonString(SidebarState)

export const GroupKey = Schema.Literals([
  'getStarted',
  'coreConcepts',
  'comparisons',
  'faq',
  'testing',
  'bestPractices',
  'patterns',
  'tooling',
  'foldkitUi',
  'ai',
  'devtools',
  'examples',
  'apiReference',
])
export type GroupKey = typeof GroupKey.Type

export const SidebarGroups = Schema.Record(GroupKey, Schema.Boolean)
export type SidebarGroups = typeof SidebarGroups.Type

export const DEFAULT_OPEN_GROUPS: ReadonlyArray<GroupKey> = [
  'getStarted',
  'coreConcepts',
]
