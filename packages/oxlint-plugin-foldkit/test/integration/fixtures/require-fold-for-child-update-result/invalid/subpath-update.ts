import { Option } from 'effect'
import * as Update from 'foldkit/update'
import { foldChildAt as createFoldChildAt } from 'foldkit/update'
import { modifyFields } from 'foldkit/struct'

import * as Child from './child'

type Model = Readonly<{
  namespaceChild: Child.Model
  aliasedChild: Child.Model
}>

const foldNamespaceChild = Update.foldChildAt({
  update: Child.update,
  readAt: (model: Model, _key: string) => Option.some(model.namespaceChild),
  writeAt: (model, _key, nextChild) =>
    modifyFields(model, { namespaceChild: () => nextChild }),
  toParentMessage: (_key, message: Child.Message) => message,
})

const foldAliasedChild = createFoldChildAt({
  update: Child.update,
  readAt: (model: Model, _key: string) => Option.some(model.aliasedChild),
  writeAt: (model, _key, nextChild) =>
    modifyFields(model, { aliasedChild: () => nextChild }),
  toParentMessage: (_key, message: Child.Message) => message,
})

export const update = (model: Model, message: Child.Message) => {
  const namespaceUpdate = Child.update(model.namespaceChild, message)
  const aliasedUpdate = Child.update(model.aliasedChild, message)

  return {
    model: modifyFields(model, {
      namespaceChild: () => namespaceUpdate.model,
      aliasedChild: () => aliasedUpdate.model,
    }),
  }
}

export const folds = { foldNamespaceChild, foldAliasedChild }
