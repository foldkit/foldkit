import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'
import { Option } from 'effect'
import * as Child from './child'
import * as Products from './products'
import * as Settings from './settings'

type Model = Readonly<{
  child: Child.Model
  childBlock: Child.Model
  productsPage: Products.Model
  settings: Settings.Model
}>

type Message =
  | Readonly<{ type: 'GotSettingsMessage'; message: Settings.Message }>
  | Readonly<{ type: 'GotChildMessage'; message: Child.Message }>
  | Readonly<{ type: 'GotProductsMessage'; message: Products.Message }>

declare const model: Model
declare const message: Child.Message

const GotSettingsMessage = (input: {
  message: Settings.Message
}): Message => ({ type: 'GotSettingsMessage', ...input })

const GotChildMessage = (input: { message: Child.Message }): Message => ({
  type: 'GotChildMessage',
  ...input,
})

const GotProductsMessage = (input: { message: Products.Message }): Message => ({
  type: 'GotProductsMessage',
  ...input,
})

const foldSettings = Update.foldChild({
  update: Settings.update,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) =>
    evo(model, { settings: () => nextSettings }),
  toParentMessage: (message: Settings.Message) =>
    GotSettingsMessage({ message }),
})

const foldChild = Update.foldChild({
  update: Child.update,
  read: (model: Model) => Option.some(model.child),
  write: (model, nextChild) => evo(model, { child: () => nextChild }),
  toParentMessage: (message: Child.Message) => GotChildMessage({ message }),
})

const foldChildBlock = Update.foldChild({
  update: Child.update,
  read: (model: Model) => Option.some(model.childBlock),
  write: (model, nextChildBlock) =>
    evo(model, { childBlock: () => nextChildBlock }),
  toParentMessage: (message: Child.Message) => GotChildMessage({ message }),
})

const foldProducts = Update.foldChild({
  update: Products.update,
  read: (model: Model) => Option.some(model.productsPage),
  write: (model, nextProductsPage) =>
    evo(model, { productsPage: () => nextProductsPage }),
  toParentMessage: (message: Products.Message) =>
    GotProductsMessage({ message }),
})

const settingsReset = Settings.setTheme(model.settings, 'Light')
const childUpdate = Child.update(model.child, message)
const childBlockUpdate = Child.update(model.childBlock, message)
const productsUpdate = Products.update(model.productsPage, message)

export const update = () => ({
  model: evo(model, {
    settings: () => settingsReset.model,
    child: () => childUpdate.model,
    childBlock: () => {
      return childBlockUpdate.model
    },
    productsPage: () => productsUpdate.model,
  }),
})

export const folds = { foldSettings, foldChild, foldChildBlock, foldProducts }
