// NOTE: TypeDoc-only entry point. The website's API reference documents foldkit and
// @foldkit/ui as separate TypeDoc projects and composes them. This barrel wraps the
// package's exports under a `Ui` namespace so the merged reference renders them as
// `Ui/Button`, `Ui/Calendar`, and so on, distinct from core's own modules. It is never
// imported by library or application code, and is excluded from the package build.

export * as Ui from './src/index.js'
