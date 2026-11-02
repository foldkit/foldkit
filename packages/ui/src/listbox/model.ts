import { Option } from 'effect'
import { makeModifyFieldsFor } from 'foldkit/struct'

import { type BaseInitConfig, type BaseModel } from './types.js'

const modifyBaseFields = makeModifyFieldsFor<BaseModel>()

/** @internal Clears Listbox interaction state. */
export const closedModel = <Model extends BaseModel>(model: Model): Model =>
  modifyBaseFields(model, {
    isOpen: () => false,
    maybeActiveItemIndex: () => Option.none(),
    searchQuery: () => '',
    searchVersion: () => 0,
    maybeLastPointerPosition: () => Option.none(),
    maybeLastButtonPointerType: () => Option.none(),
  })

/** @internal Parent-owned startup fields; Composition initializes Animation. */
export const baseInit = (
  config: BaseInitConfig,
): Omit<BaseModel, 'animation'> => ({
  id: config.id,
  isOpen: false,
  isAnimated: config.isAnimated ?? false,
  isModal: config.isModal ?? false,
  orientation: config.orientation ?? 'Vertical',
  maybeActiveItemIndex: Option.none<number>(),
  activationTrigger: 'Keyboard',
  searchQuery: '',
  searchVersion: 0,
  maybeLastPointerPosition:
    Option.none<Readonly<{ screenX: number; screenY: number }>>(),
  maybeLastButtonPointerType: Option.none<string>(),
})
