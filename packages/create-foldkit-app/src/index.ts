#!/usr/bin/env node
// @ts-nocheck
import { Command, HelpDoc, Options } from 'effect/unstable/cli'
import { FetchHttpClient } from 'effect/unstable/http'
import { NodeContext, NodeRuntime } from '@effect/platform-node'
import { Effect, Match, Option, Schema, String, flow } from 'effect'
import { createRequire } from 'node:module'

import { create as create_ } from './commands/create.js'

/* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
const packageJson = createRequire(import.meta.url)('../package.json') as {
  version: string
}

const nameSchema = Schema.String.pipe(
  Schema.filter(name =>
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
  ),
)

const name = Options.text('name').pipe(
  Options.withAlias('n'),
  Options.withDescription('The name of the project to create'),
  Options.withSchema(nameSchema),
)

const example = Options.choice('example', [
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
  Options.withAlias('e'),
  Options.withDescription(
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

const packageManager = Options.choice('package-manager', [
  'pnpm',
  'npm',
  'yarn',
]).pipe(
  Options.withAlias('p'),
  Options.withDescription(
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
)

const cli = Command.run(create, {
  name: 'Create Foldkit App',
  version: packageJson.version,
  summary: HelpDoc.getSpan(HelpDoc.p('Create a new Foldkit application')),
})

cli(process.argv).pipe(
  Effect.provide([FetchHttpClient.layer, NodeContext.layer]),
  NodeRuntime.runMain,
)
