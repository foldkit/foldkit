// @ts-nocheck
import { Match, Schema as S } from 'effect'
import { ts } from 'foldkit/schema'

export const HomeAction = S.Literals([
  'CreateRoom',
  'JoinRoom',
  'ChangeUsername',
])
export type HomeAction = typeof HomeAction.Type

export const HOME_ACTIONS: readonly HomeAction[] = [
  'CreateRoom',
  'JoinRoom',
  'ChangeUsername',
] as const

export const homeActionToLabel = Match.type<HomeAction>().pipe(
  Match.when('CreateRoom', () => 'Create room'),
  Match.when('JoinRoom', () => 'Join room'),
  Match.when('ChangeUsername', () => 'Change username'),
  Match.exhaustive,
)

export const EnterUsername = ts('EnterUsername', {
  username: S.String,
})
export const SelectAction = ts('SelectAction', {
  username: S.String,
  selectedAction: HomeAction,
})
export const EnterRoomId = ts('EnterRoomId', {
  username: S.String,
  roomId: S.String,
})

export const HomeStep = S.Union([EnterUsername, SelectAction, EnterRoomId])
export type EnterUsername = typeof EnterUsername.Type
export type SelectAction = typeof SelectAction.Type
export type EnterRoomId = typeof EnterRoomId.Type
export type HomeStep = typeof HomeStep.Type

export const Model = S.Struct({
  homeStep: HomeStep,
  formError: S.Option(S.String),
})
export type Model = typeof Model.Type
