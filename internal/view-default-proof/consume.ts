import {
  LegacyViewlessBlock,
  defaultElementLayer,
  defaultElementProgram,
  documentLayer,
  documentProgram,
  inputsElementLayer,
  makeGenericAlternateView,
  parentLayer,
  viewlessLayer,
} from './source.accepted.js'

export const relocatedValues = {
  LegacyViewlessBlock,
  defaultElementLayer,
  defaultElementProgram,
  documentLayer,
  documentProgram,
  inputsElementLayer,
  parentLayer,
  viewlessLayer,
}

export const relocatedGenericAlternateView =
  makeGenericAlternateView<Readonly<{ id: string }>>()
