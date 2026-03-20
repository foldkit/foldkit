import { Effect, Schema as S } from 'effect'
import { Command, Navigation } from 'foldkit'
import { m } from 'foldkit/message'

const CompletedNavigateInternal = m('CompletedNavigateInternal')
const CompletedLoadExternal = m('CompletedLoadExternal')
const CompletedNavigateHistory = m('CompletedNavigateHistory')

const Message = S.Union(
  CompletedNavigateInternal,
  CompletedLoadExternal,
  CompletedNavigateHistory,
)
type Message = typeof Message.Type

const NavigateInternal = Command.define('NavigateInternal')
const ReplaceUrl = Command.define('ReplaceUrl')
const GoBack = Command.define('GoBack')
const GoForward = Command.define('GoForward')
const LoadExternal = Command.define('LoadExternal')

const pushUrl = NavigateInternal(
  Navigation.pushUrl('/people/42').pipe(Effect.as(CompletedNavigateInternal())),
)

const replaceUrl = ReplaceUrl(
  Navigation.replaceUrl('/people/42').pipe(
    Effect.as(CompletedNavigateInternal()),
  ),
)

const goBack = GoBack(
  Navigation.back().pipe(Effect.as(CompletedNavigateHistory())),
)

const goForward = GoForward(
  Navigation.forward().pipe(Effect.as(CompletedNavigateHistory())),
)

const loadUrl = LoadExternal(
  Navigation.load('https://example.com').pipe(
    Effect.as(CompletedLoadExternal()),
  ),
)
