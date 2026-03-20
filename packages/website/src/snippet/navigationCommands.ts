import { Effect, Schema as S } from 'effect'
import { Command, Navigation } from 'foldkit'
import { m } from 'foldkit/message'

const CompletedNavigateInternal = m('CompletedNavigateInternal')
const CompletedNavigateExternal = m('CompletedNavigateExternal')
const CompletedNavigateHistory = m('CompletedNavigateHistory')

const Message = S.Union(
  CompletedNavigateInternal,
  CompletedNavigateExternal,
  CompletedNavigateHistory,
)
type Message = typeof Message.Type

const pushUrl = Navigation.pushUrl('/people/42').pipe(
  Effect.as(CompletedNavigateInternal()),
  Command.make('NavigateInternal'),
)

const replaceUrl = Navigation.replaceUrl('/people/42').pipe(
  Effect.as(CompletedNavigateInternal()),
  Command.make('ReplaceUrl'),
)

const goBack = Navigation.back().pipe(
  Effect.as(CompletedNavigateHistory()),
  Command.make('GoBack'),
)

const goForward = Navigation.forward().pipe(
  Effect.as(CompletedNavigateHistory()),
  Command.make('GoForward'),
)

const loadUrl = Navigation.load('https://example.com').pipe(
  Effect.as(CompletedNavigateExternal()),
  Command.make('LoadExternal'),
)
