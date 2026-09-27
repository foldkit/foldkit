import { Effect, Redacted } from 'effect'
import { readFile } from 'node:fs/promises'

import { PgClient } from '@effect/sql-pg'

import { databaseUrl } from '../server/config.ts'

const migration = await readFile(
  new URL('../server/migration.sql', import.meta.url),
  'utf8',
)

await Effect.runPromise(
  Effect.gen(function* () {
    const sql = yield* PgClient.PgClient
    yield* sql.unsafe(migration).unprepared
  }).pipe(
    Effect.provide(
      PgClient.layer({
        url: Redacted.make(databaseUrl()),
      }),
    ),
  ),
)
