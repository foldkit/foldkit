import { Option } from 'effect'
import * as Update from 'foldkit/update'
import { foldChildAt as createFoldChildAt } from 'foldkit/update'
import { modifyFields } from 'foldkit/struct'

type ChildModel = Readonly<{ theme: string }>
type Model = Readonly<{
  namespaceChild: ChildModel
  aliasedChild: ChildModel
}>

const foldNamespaceChild = Update.foldChildAt({
  update: (child: ChildModel, _message: string) => ({ model: child }),
  readAt: (model: Model, _key: string) => Option.some(model.namespaceChild),
  writeAt: (model, _key, nextChild) =>
    modifyFields(model, { namespaceChild: () => nextChild }),
  toParentMessage: (_key, message) => message,
})

const foldAliasedChild = createFoldChildAt({
  update: (child: ChildModel, _message: string) => ({ model: child }),
  readAt: (model: Model, _key: string) => Option.some(model.aliasedChild),
  writeAt: (model, _key, nextChild) =>
    modifyFields(model, { aliasedChild: () => nextChild }),
  toParentMessage: (_key, message) => message,
})

export const updateNamespaceChild = (
  model: Model,
  key: string,
  message: string,
) => {
  const childUpdate = foldNamespaceChild(model, key, message)

  return {
    model: modifyFields(model, {
      namespaceChild: child =>
        modifyFields(child, { theme: () => 'Light' }),
    }),
    commands: childUpdate.commands,
  }
}

export const updateAliasedChild = (
  model: Model,
  key: string,
  message: string,
) => {
  const childUpdate = foldAliasedChild(model, key, message)

  return {
    model: modifyFields(model, {
      aliasedChild: child => modifyFields(child, { theme: () => 'Light' }),
    }),
    commands: childUpdate.commands,
  }
}
