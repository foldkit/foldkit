import { Effect, Layer, Option, Schema } from 'effect'
import { Program, Runtime } from 'foldkit'

import { SettingsStore, Theme } from './previewMigrationCommandAfter'
import {
  Application,
  ApplicationLive,
  Flags,
} from './previewMigrationRootAfter'

const ApplicationLayer = Layer.succeed(SettingsStore, {
  saveTheme: theme => Effect.sync(() => localStorage.setItem('theme', theme)),
})

const flags = Effect.sync(() =>
  Flags.make({
    savedTheme: Option.getOrElse(
      Schema.decodeUnknownOption(Theme)(localStorage.getItem('theme')),
      () => 'System',
    ),
  }),
)

const program = Program.make(Application, {
  layer: ApplicationLive.pipe(Layer.provide(ApplicationLayer)),
  Flags,
  container: document.getElementById('root'),
  devTools: { dispatch: true },
})

Runtime.run(program, { flags })
