import { Schema as S } from 'effect'

/**
 * Schema for one island's attributes: a struct that decodes the directive's
 * string attributes into typed values. Use transforming field schemas to
 * decode past strings, for example `S.NumberFromString` for numeric
 * attributes.
 */
export type IslandDefinition = S.Struct<S.Struct.Fields> &
  Readonly<{ DecodingServices: never; EncodingServices: never }>

/**
 * Attribute schemas by island directive name. One definition record serves
 * both halves of the pipeline: the Vite plugin validates every directive
 * against it at build time (unknown names, unknown attributes, and attribute
 * values outside the schema all fail the build), and `islandsFor` decodes
 * attributes with it before dispatching to the matching typed island view.
 */
export type IslandDefinitions = Readonly<Record<string, IslandDefinition>>
