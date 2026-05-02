#!/usr/bin/env node
import { NodeRuntime, NodeServices, NodeStdio } from '@effect/platform-node'
import { Effect, Layer, Option, Schema } from 'effect'
import { Command, Flag } from 'effect/unstable/cli'
import { FetchHttpClient } from 'effect/unstable/http'
import { createRequire } from 'node:module'

import { create as create_ } from './commands/create.js'
import { EXAMPLE_VALUES } from './examples.js'
import { validateProjectName } from './validateName.js'

/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
const packageJson = createRequire(import.meta.url)('../package.json') as {
  version: string
}

const nameSchema = Schema.String.pipe(
  Schema.check(
    Schema.makeFilter<string>(value =>
      Option.match(validateProjectName(value), {
        onNone: () => true,
        onSome: message => message,
      }),
    ),
  ),
)

const name = Flag.string('name').pipe(
  Flag.withAlias('n'),
  Flag.withDescription('The name of the project to create'),
  Flag.withSchema(nameSchema),
  Flag.optional,
)

const example = Flag.choice('example', EXAMPLE_VALUES).pipe(
  Flag.withAlias('e'),
  Flag.withDescription(
    "The example application to start from. Run with no flags for an interactive picker that shows each example's description.",
  ),
  Flag.optional,
)

const packageManager = Flag.choice('package-manager', [
  'pnpm',
  'npm',
  'yarn',
]).pipe(
  Flag.withAlias('p'),
  Flag.withDescription(
    'The package manager to use for installing dependencies',
  ),
  Flag.optional,
)

const create = Command.make(
  'create',
  {
    name,
    example,
    packageManager,
  },
  create_,
).pipe(Command.withDescription('Create a new Foldkit application'))

const cli = Command.run(create, {
  version: packageJson.version,
})

cli.pipe(
  Effect.provide([
    FetchHttpClient.layer,
    Layer.mergeAll(NodeServices.layer, NodeStdio.layer),
  ]),
  NodeRuntime.runMain,
)
