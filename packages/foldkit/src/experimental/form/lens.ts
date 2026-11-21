import { Option, Predicate } from 'effect'

import type * as Update from '../../update/index.js'

export type FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage> =
  Pick<
    Update.ChildFold<
      ParentModel,
      ParentMessage,
      ChildModel,
      never,
      ChildMessage
    >,
    'read' | 'write' | 'toParentMessage'
  > &
    Readonly<{ parentField?: undefined }>

type IsParentFieldCompatible<
  ParentModel,
  Name extends keyof ParentModel,
  ChildModel,
> = ParentModel extends unknown
  ? [ParentModel[Name]] extends [ChildModel]
    ? [ChildModel] extends [ParentModel[Name]]
      ? true
      : false
    : false
  : never

export type ParentFieldOf<ParentModel, ChildModel> = {
  [Name in keyof ParentModel & string]-?: [
    IsParentFieldCompatible<ParentModel, Name, ChildModel>,
  ] extends [true]
    ? Name
    : never
}[keyof ParentModel & string]

export type ParentFieldConfig<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
> = Readonly<{
  parentField: ParentFieldOf<ParentModel, ChildModel>
  read?: undefined
  write?: undefined
  toParentMessage: (message: ChildMessage) => ParentMessage
}>

export type LiftConfig<ParentModel, ParentMessage, ChildModel, ChildMessage> =
  | ParentFieldConfig<ParentModel, ParentMessage, ChildModel, ChildMessage>
  | FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage>

export const isParentFieldConfig = <
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
>(
  config: LiftConfig<ParentModel, ParentMessage, ChildModel, ChildMessage>,
): config is ParentFieldConfig<
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage
> => !Predicate.isFunction(config.read) || !Predicate.isFunction(config.write)

export const fromParentField = <
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
>(
  config: ParentFieldConfig<
    ParentModel,
    ParentMessage,
    ChildModel,
    ChildMessage
  >,
): FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage> => ({
  // NOTE: ParentFieldOf admits only fields whose type is exactly ChildModel.
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  read: model => Option.some(model[config.parentField] as ChildModel),
  write: (model, nextChild) => ({ ...model, [config.parentField]: nextChild }),
  toParentMessage: message => config.toParentMessage(message),
})

export const bindReceiver = <
  ParentModel,
  ParentMessage,
  ChildModel,
  ChildMessage,
>(
  lens: FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage>,
): FoldLens<ParentModel, ParentMessage, ChildModel, ChildMessage> => ({
  read: model => lens.read(model),
  write: (model, nextChild) => lens.write(model, nextChild),
  toParentMessage: message => lens.toParentMessage(message),
})
