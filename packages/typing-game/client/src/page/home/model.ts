import { Match, Schema } from 'effect'
import { defineTaggedUnion } from 'foldkit/schema'

export const HomeAction = Schema.Literals([
  'CreateRoom',
  'JoinRoom',
  'ChangeUsername',
])
export type HomeAction = typeof HomeAction.Type

export const HOME_ACTIONS: ReadonlyArray<HomeAction> = [
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

export const HomeStep = defineTaggedUnion({
  EnterUsername: { username: Schema.String },
  SelectAction: { username: Schema.String, selectedAction: HomeAction },
  EnterRoomId: { username: Schema.String, roomId: Schema.String },
})
export type HomeStep = typeof HomeStep.Type

export const Model = Schema.Struct({
  homeStep: HomeStep,
  formError: Schema.Option(Schema.String),
})
export type Model = typeof Model.Type

export const capturesKeyboard = (model: Model): boolean =>
  Match.value(model.homeStep).pipe(
    Match.tag('SelectAction', () => true),
    Match.orElse(() => false),
  )
