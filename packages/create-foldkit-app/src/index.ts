#!/usr/bin/env node
import { Effect, Layer, Option, Schema } from 'effect'
import { Command, Flag } from 'effect/unstable/cli'
import { createRequire } from 'node:module'

import { NodeRuntime, NodeServices, NodeStdio } from '@effect/platform-node'

import { create as create_ } from './commands/create.js'
import { EXAMPLE_VALUES } from './examples.js'
import { RENDERING_VALUES } from './rendering.js'
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

const rendering = Flag.choice('rendering', RENDERING_VALUES).pipe(
  Flag.withAlias('r'),
  Flag.withDescription(
    'How the application renders: spa renders entirely in the browser, ssg prerenders routes to static HTML at build time, ssr renders each request then hydrates',
  ),
  Flag.optional,
)

const example = Flag.choice('example', EXAMPLE_VALUES).pipe(
  Flag.withAlias('e'),
  Flag.withDescription(
    "The example application to start from with spa rendering. Run with no flags for an interactive picker that shows each example's description.",
  ),
  Flag.optional,
)

const packageManager = Flag.choice('package-manager', [
  'pnpm',
  'npm',
  'yarn',
  'bun',
]).pipe(
  Flag.withAlias('p'),
  Flag.withDescription(
    'The package manager to use for installing dependencies',
  ),
  Flag.optional,
)

const maybeDependencyManifestsDirectory = Option.fromNullishOr(
  process.env['CREATE_FOLDKIT_APP_DEPENDENCY_MANIFESTS_DIRECTORY'],
)

const create = Command.make(
  'create',
  {
    name,
    rendering,
    example,
    packageManager,
  },
  input => create_({ ...input, maybeDependencyManifestsDirectory }),
).pipe(Command.withDescription('Create a new Foldkit application'))

const cli = Command.run(create, {
  version: packageJson.version,
})

cli.pipe(
  Effect.provide([Layer.mergeAll(NodeServices.layer, NodeStdio.layer)]),
  NodeRuntime.runMain,
)
