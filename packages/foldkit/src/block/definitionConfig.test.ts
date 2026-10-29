import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { defineMessageUnion } from '../message/public.js'
import * as Block from './public.js'

const Model = Schema.Struct({ value: Schema.String })
type Model = typeof Model.Type
const Message = defineMessageUnion({ Updated: {} })
type Message = typeof Message.Type
const OutMessage = defineMessageUnion({ Completed: {} })
type OutMessage = typeof OutMessage.Type
const ChildInitContext = Schema.Struct({ seed: Schema.Number })
type ChildInitContext = typeof ChildInitContext.Type

const callDirectDefinition = (config: unknown): unknown =>
  Reflect.apply(Block.makeDefinition, undefined, [
    'DefinitionConfigDirect',
    config,
  ])

const DefinitionConfigNamespace = Block.makeNamespace('DefinitionConfig')
const callNamespacedDefinition = (config: unknown): unknown =>
  Reflect.apply(DefinitionConfigNamespace.makeDefinition, undefined, [config])

const publicDefinitionFactories = [
  ['direct', callDirectDefinition],
  ['Namespace', callNamespacedDefinition],
] as const

describe('Block Definition config', () => {
  for (const [kind, makeDefinition] of publicDefinitionFactories) {
    it(`accepts the complete ${kind} contract and symbol metadata`, () => {
      const metadata = Symbol('metadata')
      const definition = makeDefinition({
        Model,
        Message,
        OutMessage,
        ChildInitContext,
        [metadata]: true,
      })

      expect(definition).toBeTypeOf('object')
    })

    it(`rejects unknown own string fields through the ${kind} factory`, () => {
      expect(() =>
        makeDefinition({ Model, Message, unsupported: true }),
      ).toThrow(
        'Block.makeDefinition config field "unsupported" is not supported',
      )
    })

    it(`preserves the missing Schema diagnostic through the ${kind} factory`, () => {
      expect(() => makeDefinition({ Model })).toThrow(
        'Block.makeDefinition requires Model and Message Schemas',
      )
    })

    it(`rejects malformed optional Schemas through the ${kind} factory`, () => {
      expect(() =>
        makeDefinition({ Model, Message, OutMessage: 'Completed' }),
      ).toThrow('Block.makeDefinition OutMessage must be a Schema when present')
      expect(() =>
        makeDefinition({ Model, Message, ChildInitContext: { seed: 1 } }),
      ).toThrow(
        'Block.makeDefinition ChildInitContext must be a Schema when present',
      )
    })
  }
})
