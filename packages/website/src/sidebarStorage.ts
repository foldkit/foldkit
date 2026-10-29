import { Option, Record, Schema } from 'effect'

export const SIDEBAR_STORAGE_KEY = 'foldkit-sidebar-state'

export const SidebarState = Schema.Struct({
  open: Schema.Record(Schema.String, Schema.Boolean),
})
export type SidebarState = typeof SidebarState.Type

export const SidebarStateJsonString = Schema.fromJsonString(SidebarState)
export type SidebarStateJsonString = typeof SidebarStateJsonString.Type

export const GroupKey = Schema.Literals([
  'blog',
  'introduction',
  'coreConcepts',
  'comparisons',
  'faq',
  'testing',
  'bestPractices',
  'patterns',
  'tooling',
  'foldkitUi',
  'ai',
  'examples',
  'apiReference',
])
export type GroupKey = typeof GroupKey.Type

export const SidebarGroups = Schema.Record(GroupKey, Schema.Boolean)
export type SidebarGroups = typeof SidebarGroups.Type

const isGroupOpenOnBoot = (
  maybeSidebarState: Option.Option<SidebarState>,
  maybeActiveSectionKey: Option.Option<GroupKey>,
  key: GroupKey,
): boolean => {
  const isActiveSection = Option.exists(
    maybeActiveSectionKey,
    activeSectionKey => activeSectionKey === key,
  )
  if (isActiveSection) {
    return true
  }

  return Option.match(maybeSidebarState, {
    onNone: () => false,
    onSome: ({ open }) => open[key] ?? false,
  })
}

export const initialSidebarGroups = (
  maybeSidebarState: Option.Option<SidebarState>,
  maybeActiveSectionKey: Option.Option<GroupKey>,
): SidebarGroups => {
  const sidebarGroups: globalThis.Record<GroupKey, boolean> =
    Record.fromIterableWith(GroupKey.literals, key => [
      key,
      isGroupOpenOnBoot(maybeSidebarState, maybeActiveSectionKey, key),
    ])

  return sidebarGroups
}
