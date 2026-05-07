import { Effect, Schema as S } from 'effect'
import { Command, Navigation } from 'foldkit'
import { m } from 'foldkit/message'

const CompletedNavigateInternal = m('CompletedNavigateInternal')
const CompletedReplaceUrl = m('CompletedReplaceUrl')
const CompletedGoBack = m('CompletedGoBack')
const CompletedGoForward = m('CompletedGoForward')
const CompletedLoadExternal = m('CompletedLoadExternal')
const CompletedOpenUrl = m('CompletedOpenUrl')

const Message = S.Union([
  CompletedNavigateInternal,
  CompletedReplaceUrl,
  CompletedGoBack,
  CompletedGoForward,
  CompletedLoadExternal,
  CompletedOpenUrl,
])
type Message = typeof Message.Type

const NavigateInternal = Command.define(
  'NavigateInternal',
  { url: S.String },
  CompletedNavigateInternal,
)(({ url }) =>
  Navigation.pushUrl(url).pipe(Effect.as(CompletedNavigateInternal())),
)

const ReplaceUrl = Command.define(
  'ReplaceUrl',
  { url: S.String },
  CompletedReplaceUrl,
)(({ url }) =>
  Navigation.replaceUrl(url).pipe(Effect.as(CompletedReplaceUrl())),
)

const GoBack = Command.define(
  'GoBack',
  CompletedGoBack,
)(Navigation.back().pipe(Effect.as(CompletedGoBack())))

const GoForward = Command.define(
  'GoForward',
  CompletedGoForward,
)(Navigation.forward().pipe(Effect.as(CompletedGoForward())))

const LoadExternal = Command.define(
  'LoadExternal',
  { href: S.String },
  CompletedLoadExternal,
)(({ href }) => Navigation.load(href).pipe(Effect.as(CompletedLoadExternal())))

const OpenUrl = Command.define(
  'OpenUrl',
  { url: S.String },
  CompletedOpenUrl,
)(({ url }) => Navigation.openUrl(url).pipe(Effect.as(CompletedOpenUrl())))
