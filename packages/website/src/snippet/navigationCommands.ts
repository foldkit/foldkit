import { Effect, Schema as S } from 'effect'
import { Navigation } from 'foldkit'
import { m } from 'foldkit/message'

const NoOp = m('NoOp')
const Message = S.Union(NoOp)
type Message = typeof Message.Type

const pushUrl = Navigation.pushUrl('/people/42').pipe(Effect.as(NoOp()))

const replaceUrl = Navigation.replaceUrl('/people/42').pipe(Effect.as(NoOp()))

const goBack = Navigation.back().pipe(Effect.as(NoOp()))

const goForward = Navigation.forward().pipe(Effect.as(NoOp()))

const loadUrl = Navigation.load('https://example.com').pipe(Effect.as(NoOp()))
