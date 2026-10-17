import { Schema } from 'effect'
import { Message as MessageApi } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { Tabs } from '@foldkit/ui'

import { ValidationMessage } from './validation'

const weather = { Message: Schema.String }
const arbitraryFactory = {
  create: () => ({
    Message: Schema.String,
    block: { Message: Schema.String },
  }),
}
const arbitrary = arbitraryFactory.create()
const arbitraryCompletion = {
  makeBlock: () => ({ Message: Schema.String }),
}
const arbitraryBlock = arbitraryCompletion.makeBlock()

const Message = defineMessageUnion({
  GotWeather: { temperature: Schema.Number, },
  GotValidation: { message: ValidationMessage, },
  GotWeatherMessage: { message: weather.Message },
  GotArbitraryMessage: { message: arbitrary.Message },
  GotArbitraryNestedMessage: { message: arbitrary.block.Message },
  GotArbitraryBlockMessage: { message: arbitraryBlock.Message },
})

const RootMessage = MessageApi.defineMessageUnion({
  GotRootApi: { message: Schema.String },
})

{
  const Tabs = {
    create: () => ({ Message: Schema.String }),
  }
  const ShadowedFactoryResult = Tabs.create()

  defineMessageUnion({
    GotShadowedFactoryMessage: { message: ShadowedFactoryResult.Message },
  })
}
