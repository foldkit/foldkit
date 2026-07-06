import { Effect } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'

const CompletedRefreshSession = m('CompletedRefreshSession')
const refreshSessionEffect = Effect.succeed(CompletedRefreshSession())

export let RefreshSession = Command.define(
  'RefreshSession',
  CompletedRefreshSession,
)(refreshSessionEffect)
