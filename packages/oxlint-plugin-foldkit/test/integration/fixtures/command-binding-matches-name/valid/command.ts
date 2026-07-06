import { Effect } from 'effect'
import { Command } from 'foldkit'
import { m } from 'foldkit/message'

const CompletedFetchUser = m('CompletedFetchUser')

export const FetchUser = Command.define(
  'FetchUser',
  CompletedFetchUser,
)(Effect.succeed(CompletedFetchUser()))
