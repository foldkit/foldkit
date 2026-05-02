#!/usr/bin/env node
import { NodeRuntime, NodeServices, NodeStdio } from '@effect/platform-node'
import { Effect, Layer, Match, Option, Schema, String, flow } from 'effect'
import { Command, Flag } from 'effect/unstable/cli'
import { FetchHttpClient } from 'effect/unstable/http'
import { createRequire } from 'node:module'

import { create as create_ } from './commands/create.js'

/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
const packageJson = createRequire(import.meta.url)('../package.json') as {
  version: string
}

const validateName = Schema.makeFilter<string>((name: string) =>
  Match.value(name).pipe(
    Match.whenOr(
      String.includes('/'),
      String.includes('\\'),
      () => 'Project name cannot contain path separators (/ or \\)',
    ),
    Match.when(
      String.includes(' '),
      () => 'Project name cannot contain spaces',
    ),
    Match.when(
      flow(String.match(/[<>:"|?*]/), Option.isSome),
      () => 'Project name cannot contain special characters: < > : " | ? *',
    ),
    Match.whenOr(
      String.startsWith('.'),
      String.startsWith('-'),
      () => 'Project name cannot start with . or -',
    ),
    Match.when(String.isEmpty, () => 'Project name cannot be empty'),
    Match.orElse(() => true),
  ),
)

const nameSchema = Schema.String.pipe(Schema.check(validateName))

const name = Flag.string('name').pipe(
  Flag.withAlias('n'),
  Flag.withDescription('The name of the project to create'),
  Flag.withSchema(nameSchema),
)

const example = Flag.choice('example', [
  'counter',
  'todo',
  'stopwatch',
  'crash-view',
  'form',
  'job-application',
  'weather',
  'routing',
  'query-sync',
  'snake',
  'auth',
  'shopping-cart',
  'pixel-art',
  'websocket-chat',
  'kanban',
  'ui-showcase',
]).pipe(
  Flag.withAlias('e'),
  Flag.withDescription(
    "The example application to start from. Pick an example that's similar to the application you're building. Or create multiple projects and take pieces of each!\n\n" +
      'Available examples:\n' +
      '  counter - Simple increment/decrement with reset\n' +
      '  todo - CRUD operations with localStorage persistence\n' +
      '  stopwatch - Timer with start/stop/reset functionality\n' +
      '  crash-view - Custom crash fallback UI with crash.view and crash.report\n' +
      '  form - Form validation with async email checking\n' +
      '  job-application - Multi-step form with async validation, file uploads, and per-step error indicators\n' +
      '  weather - HTTP requests with async state handling\n' +
      '  routing - URL routing with parser combinators and route parameters\n' +
      '  query-sync - URL-driven filtering, sorting, and search with query parameters\n' +
      '  snake - Classic game built with subscriptions\n' +
      '  auth - Authentication with Submodels, OutMessage, and protected routes\n' +
      '  shopping-cart - Complex state management with nested models and routing\n' +
      '  pixel-art - Pixel editor with undo/redo, time-travel history, UI components, and localStorage persistence\n' +
      '  websocket-chat - Managed resources with WebSocket integration\n' +
      '  kanban - Drag-and-drop board with fractional indexing, keyboard navigation, and screen reader announcements\n' +
      '  ui-showcase - Every Foldkit UI component with routing and Submodels',
  ),
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
