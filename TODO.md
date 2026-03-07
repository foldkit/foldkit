# TODO

## Router

- Route builders should accept an optional `{ hash: string }` object so internal links with hash fragments don't require string interpolation (e.g. `bestPracticesRouter({ hash: 'immutable-updates' })` instead of `` `${bestPracticesRouter()}#immutable-updates` ``)
