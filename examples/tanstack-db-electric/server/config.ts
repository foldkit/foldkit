export const databaseUrl = (): string =>
  process.env['DATABASE_URL'] ??
  'postgresql://postgres:password@localhost:54329/electric'

export const electricUrl = (): string =>
  process.env['ELECTRIC_URL'] ?? 'http://localhost:30000'
