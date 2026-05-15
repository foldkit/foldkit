import { Schema as S } from 'effect'

export const SIDEBAR_STORAGE_KEY = 'foldkit-sidebar-state'

export const SidebarState = S.Struct({
  open: S.Record(S.String, S.Boolean),
  scroll: S.Number,
})
export type SidebarState = typeof SidebarState.Type

export const SidebarStateJsonString = S.fromJsonString(SidebarState)

export const GroupKey = S.Literals([
  'getStarted',
  'coreConcepts',
  'forReactDevelopers',
  'guides',
  'testing',
  'bestPractices',
  'patterns',
  'foldkitUi',
  'ai',
  'examples',
  'apiReference',
])
export type GroupKey = typeof GroupKey.Type

export const DEFAULT_OPEN_GROUPS: ReadonlyArray<GroupKey> = [
  'getStarted',
  'coreConcepts',
]

export const INITIAL_SIDEBAR_SCROLL = 0
