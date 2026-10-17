import { Array, Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

type SettingsModel = Readonly<{ theme: string }>
type ParentModel = Readonly<{ settings: SettingsModel }>
type OtherModel = Readonly<{ settings: SettingsModel }>
type OuterModel = Readonly<{ settings: SettingsModel; other: OtherModel }>
type Entry = Readonly<{
  id: string
  isSelected: boolean
  settings: SettingsModel
}>
type KeyedModel = Readonly<{ entries: ReadonlyArray<Entry> }>

const readSettings = (model: ParentModel) => Option.some(model.settings)

const writeSettings = (
  model: ParentModel,
  nextSettings: SettingsModel,
): ParentModel => modifyFields(model, { settings: () => nextSettings })

const foldSettings = Update.foldChild({
  update: (settings: SettingsModel, _message: unknown) => ({ model: settings }),
  read: readSettings,
  write: writeSettings,
  toParentMessage: message => message,
})

const readOtherSettings = (model: OtherModel) => Option.some(model.settings)

const writeOtherSettings = (
  model: OtherModel,
  nextSettings: SettingsModel,
): OtherModel => modifyFields(model, { settings: () => nextSettings })

const foldOtherSettings = Update.foldChild({
  update: (settings: SettingsModel, _message: unknown) => ({ model: settings }),
  read: readOtherSettings,
  write: writeOtherSettings,
  toParentMessage: message => message,
})

const foldEntry = Update.foldChildAt({
  update: (settings: SettingsModel, _message: unknown) => ({ model: settings }),
  readAt: (model: KeyedModel, entryId: string) =>
    Option.map(
      Array.findFirst(model.entries, entry => entry.id === entryId),
      entry => entry.settings,
    ),
  writeAt: (model, entryId, nextSettings) =>
    modifyFields(model, {
      entries: Array.map(entry =>
        entry.id === entryId
          ? modifyFields(entry, { settings: () => nextSettings })
          : entry,
      ),
    }),
  toParentMessage: (_entryId, message) => message,
})

export const updateParent = (model: ParentModel, message: unknown) =>
  foldSettings(model, message)

export const updateOther = (model: OtherModel) => ({
  model: modifyFields(model, {
    settings: settings => modifyFields(settings, { theme: () => 'Light' }),
  }),
})

export const clearSelection = (
  model: KeyedModel,
  entryId: string,
  message: unknown,
) => {
  const entryUpdate = foldEntry(model, entryId, message)

  return {
    model: modifyFields(entryUpdate.model, {
      entries: Array.map(entry =>
        modifyFields(entry, { isSelected: () => false }),
      ),
    }),
  }
}

export const updateParentWithOtherFold = (
  model: OuterModel,
  message: unknown,
) => {
  const update = Update.combine(model, [
    stepModel => {
      const otherUpdate = foldOtherSettings(message)(stepModel.other)

      return { model: stepModel, commands: otherUpdate.commands }
    },
    stepModel => ({ model: stepModel }),
  ])

  return {
    model: modifyFields(model, {
      settings: settings => modifyFields(settings, { theme: () => 'Light' }),
    }),
    commands: update.commands,
  }
}
