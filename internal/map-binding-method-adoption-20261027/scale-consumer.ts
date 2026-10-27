import { Layer } from 'effect'

import {
  ApplicationBlock,
  providedProgram,
} from './type-performance/workspace-composition-16.js'
import {
  WorkspaceGroup001Block,
  WorkspaceGroup016Block,
} from './type-performance/workspace-groups-16.js'
import {
  EditorBlock,
  WorkspaceStore,
} from './type-performance/workspace-shared.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type RootServices = Expect<
  Equal<Layer.Services<typeof ApplicationBlock.EffectsLayer>, WorkspaceStore>
>
export type RootConstructorError = Expect<
  Equal<Layer.Error<typeof ApplicationBlock.EffectsLayer>, never>
>
export type FirstGroupIdentity = Expect<
  Equal<
    (typeof WorkspaceGroup001Block.Model.Type)['groupId'],
    'WorkspaceGroup001'
  >
>
export type LastGroupIdentity = Expect<
  Equal<
    (typeof WorkspaceGroup016Block.Model.Type)['groupId'],
    'WorkspaceGroup016'
  >
>
export type MapChildModel = Expect<
  Equal<
    (typeof ApplicationBlock.Model.Type)['workspaceGroup016']['editorsById'][string],
    typeof EditorBlock.Model.Type
  >
>

const root = ApplicationBlock.init()
const changed = ApplicationBlock.update(
  root.model,
  ApplicationBlock.Message.UpdatedTitle({ value: 'Changed' }),
)
export const title: string = changed.model.title
export const readyProgram = providedProgram

const group = WorkspaceGroup001Block.init()
WorkspaceGroup001Block.operations.openEditor(group.model, {
  issueId: 'issue-101',
})
EditorBlock.init('issue-101')
// @ts-expect-error Relocated root Messages retain their exact payloads.
ApplicationBlock.Message.UpdatedTitle({ value: 1 })
// @ts-expect-error Relocated group operations retain their required payload.
WorkspaceGroup001Block.operations.openEditor(group.model, { issueId: 1 })
// @ts-expect-error Relocated child initialization retains its required identity.
EditorBlock.init()
