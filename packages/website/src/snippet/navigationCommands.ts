import { Effect, Schema as S } from 'effect'
import { Navigation } from 'foldkit'
import { m } from 'foldkit/message'

const CompletedInternalNavigation = m('CompletedInternalNavigation')
const CompletedExternalNavigation = m('CompletedExternalNavigation')
const CompletedHistoryNavigation = m('CompletedHistoryNavigation')

const Message = S.Union(
  CompletedInternalNavigation,
  CompletedExternalNavigation,
  CompletedHistoryNavigation,
)
type Message = typeof Message.Type

const pushUrl = Navigation.pushUrl('/people/42').pipe(
  Effect.as(CompletedInternalNavigation()),
)

const replaceUrl = Navigation.replaceUrl('/people/42').pipe(
  Effect.as(CompletedInternalNavigation()),
)

const goBack = Navigation.back().pipe(Effect.as(CompletedHistoryNavigation()))

const goForward = Navigation.forward().pipe(
  Effect.as(CompletedHistoryNavigation()),
)

const loadUrl = Navigation.load('https://example.com').pipe(
  Effect.as(CompletedExternalNavigation()),
)
