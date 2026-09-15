import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'
import { Option } from 'effect'
import * as Child from './child'
import * as Products from './products'
import * as Settings from './settings'

type Model = Readonly<{
  child: Child.Model
  productsPage: Products.Model
  settings: Settings.Model
}>

declare const model: Model
declare const message: Child.Message

const GotSettingsMessage = (input: { message: Settings.Message }) => input
const GotChildMessage = (input: { message: Child.Message }) => input

const foldSettings = Update.foldChild({
  update: Settings.update,
  read: (model: Model) => Option.some(model.settings),
  write: (model, nextSettings) =>
    evo(model, { settings: () => nextSettings }),
  toParentMessage: message => GotSettingsMessage({ message }),
})

const foldChild = Update.foldChild({
  update: Child.update,
  read: (model: Model) => Option.some(model.child),
  write: (model, nextChild) => evo(model, { child: () => nextChild }),
  toParentMessage: message => GotChildMessage({ message }),
})

const foldProducts = Update.foldChild({
  update: Products.update,
  read: (model: Model) => Option.some(model.productsPage),
  write: (model, nextProductsPage) =>
    evo(model, { productsPage: () => nextProductsPage }),
  toParentMessage: message => GotChildMessage({ message }),
})

const settingsReset = Settings.setTheme(model.settings, 'Light')
const childUpdate = Child.update(model.child, message)
const productsUpdate = Products.update(model.productsPage, message)

export const update = () => ({
  model: evo(model, {
    settings: () => settingsReset.model,
    child: () => childUpdate.model,
    productsPage: () => productsUpdate.model,
  }),
})

export const folds = { foldSettings, foldChild, foldProducts }
