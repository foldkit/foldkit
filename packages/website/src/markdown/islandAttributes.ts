import { Schema as S } from 'effect'

// ATTRIBUTES

/**
 * Attribute schemas for every markdown island directive used on the site. One
 * record drives both halves of the pipeline: the markdown Vite plugin validates
 * each directive against it at build time (unknown names, unknown attributes,
 * and attribute values outside the schema all fail the build), and `islandsFor`
 * decodes attributes with it before dispatching to the matching island view.
 *
 * Kept dependency-light (Schema only) so `vite.config.ts` and `vitest.config.ts`
 * can import it without pulling in the browser view layer.
 */
export const islandAttributes = {
  Snippet: S.Struct({
    name: S.String,
    label: S.optionalKey(S.String),
    class: S.optionalKey(S.String),
  }),
  Info: S.Struct({ label: S.String }),
  Warning: S.Struct({ label: S.String }),
}
