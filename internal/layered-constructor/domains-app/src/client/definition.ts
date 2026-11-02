import * as Layered from 'foldkit/experimental/layered'

import { Message } from './message'
import { Model } from './model'

export const ApplicationDefinition = Layered.makeDefinition('Application', {
  Model,
  Message,
})

export const {
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeStep,
  makeOutMessageFold,
  makeBinding,
  makeComposition,
} = ApplicationDefinition
