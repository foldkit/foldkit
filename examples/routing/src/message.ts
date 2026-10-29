import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import { UrlRequest } from 'foldkit/navigation'
import { Url } from 'foldkit/url'

export const NavigationShortcut = Schema.Literals(['GH', 'GP', 'GF', 'GN'])
export type NavigationShortcut = typeof NavigationShortcut.Type

export const Message = defineMessageUnion({
  CompletedNavigateInternal: {},
  CompletedLoadExternal: {},
  ClickedLink: { request: UrlRequest },
  ChangedUrl: { url: Url },
  EnteredNavigationShortcut: { shortcut: NavigationShortcut },
})
export type Message = typeof Message.Type
