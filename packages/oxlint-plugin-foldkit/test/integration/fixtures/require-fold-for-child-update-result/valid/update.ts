import { Update } from 'foldkit'
import { evo } from 'foldkit/struct'
import { Option } from 'effect'
import * as Child from './child'
import * as Preferences from './preferences'
import * as Products from './products'
import * as Settings from './settings'
import * as Slider from './slider'

type Model = Readonly<{
  child: Child.Model
  preferences: Preferences.Model
  products: Products.Model
  productsPage: Products.Model
  settings: Settings.Model
  slider: Slider.Model
}>

type Message = Readonly<{ type: 'GotChildMessage'; message: Child.Message }>

export const init = () => {
  const settingsInit = Settings.init()

  return {
    model: {
      child: Child.init(),
      settings: settingsInit.model,
      slider: Slider.init(),
    },
    commands: settingsInit.commands,
  }
}

const foldChild = Update.foldChild({
  update: Child.update,
  read: (model: Model) => Option.some(model.child),
  write: (model, nextChild) => evo(model, { child: () => nextChild }),
  toParentMessage: (message: Child.Message) => ({
    type: 'GotChildMessage',
    message,
  }),
})

const foldProducts = Update.foldChild({
  update: Products.update,
  read: (model: Model) => Option.some(model.productsPage),
  write: (model, nextProductsPage) =>
    evo(model, { productsPage: () => nextProductsPage }),
  toParentMessage: (message: Products.Message) => ({
    type: 'GotChildMessage',
    message,
  }),
})

export const updateProducts = (model: Model, message: Products.Message) => {
  const productsUpdate = Products.update(model.products, message)

  return {
    model: evo(model, {
      products: () => productsUpdate.model,
    }),
  }
}

export const update = (model: Model, message: Message) =>
  foldChild(
    evo(model, {
      slider: Slider.reflectRange({ min: 0, max: 100 }),
    }),
    message.message,
  )

export const folds = { foldChild, foldProducts }

export const normalizePreferences = (model: Model) => {
  const preferencesNormalized = Preferences.normalize(model.preferences)

  return {
    model: evo(model, {
      preferences: () => preferencesNormalized.model,
    }),
  }
}
