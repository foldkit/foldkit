import { Effect, Layer } from 'effect'
import { Program, Runtime } from 'foldkit'

import { Profile, ProfileLive } from './blockProfileParent'
import { SettingsStore } from './blockSettingsContract'
import { SettingsLive } from './blockSettingsLive'

const SettingsStoreLive = Layer.succeed(SettingsStore, {
  saveTheme: theme => Effect.sync(() => localStorage.setItem('theme', theme)),
})

const program = Program.make(Profile, {
  layer: ProfileLive.pipe(
    Layer.provide(SettingsLive),
    Layer.provide(SettingsStoreLive),
  ),
  container: document.getElementById('root'),
})

Runtime.run(program)
