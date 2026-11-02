import { SettingsBlock } from './blockDefinition'
import { SettingsBinding } from './blockProfile'

export const SettingsModel = SettingsBlock.Model
export type SettingsModel = typeof SettingsModel.Type

export const SettingsMessage = SettingsBlock.Message
export type SettingsMessage = typeof SettingsMessage.Type

export const SettingsOutMessage = SettingsBlock.OutMessage
export type SettingsOutMessage = typeof SettingsOutMessage.Type

export const resetSettings = SettingsBinding.requestReset()
export const requestThemeChange = SettingsBinding.requestThemeChange
