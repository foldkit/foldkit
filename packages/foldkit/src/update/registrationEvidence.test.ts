import { Schema } from 'effect'
import { expectTypeOf, it } from 'vitest'

import { defineMessageUnion } from '../message/index.js'
import type {
  Commands,
  DeferredResultEvidence,
  DeferredResultEvidenceOf,
  DeferredUpdateEvidence,
  RegistrationEvidence,
  RegistrationEvidenceOf,
  ResultEvidenceChannelOf,
  ValidateConcreteResultEvidence,
} from './update.js'

const Model = Schema.Struct({ id: Schema.String })
type Model = typeof Model.Type
const Message = defineMessageUnion({ CompletedSave: {} })
type Message = typeof Message.Type
type FirstChild = Readonly<{ child: 'First' }>
type SecondChild = Readonly<{ child: 'Second' }>
type RegisteredCommands = Commands<Message> & RegistrationEvidence<FirstChild>

it('retains evidence on required and optional Commands and result records', () => {
  expectTypeOf<
    RegistrationEvidenceOf<Readonly<{ commands: RegisteredCommands }>>
  >().toEqualTypeOf<FirstChild>()
  expectTypeOf<
    RegistrationEvidenceOf<Readonly<{ commands?: RegisteredCommands }>>
  >().toEqualTypeOf<FirstChild>()
  expectTypeOf<
    RegistrationEvidenceOf<
      RegistrationEvidence<SecondChild> &
        Readonly<{ model: Model; commands?: RegisteredCommands }>
    >
  >().toEqualTypeOf<FirstChild | SecondChild>()
  expectTypeOf<
    RegistrationEvidenceOf<
      | Readonly<{ model: Model }>
      | Readonly<{ commands: RegisteredCommands | null | undefined }>
    >
  >().toEqualTypeOf<FirstChild>()
})

it('keeps index-only shapes distinct from a declared Commands property', () => {
  expectTypeOf<
    RegistrationEvidenceOf<Readonly<Record<string, RegisteredCommands>>>
  >().toEqualTypeOf<never>()
  expectTypeOf<
    RegistrationEvidenceOf<
      Readonly<Record<`commands${string}`, RegisteredCommands>>
    >
  >().toEqualTypeOf<never>()
  expectTypeOf<
    RegistrationEvidenceOf<
      Readonly<Record<string, RegisteredCommands>> &
        Readonly<{ commands?: RegisteredCommands }>
    >
  >().toEqualTypeOf<FirstChild>()
})

it('keeps deferred obligations opaque and separate from concrete registration', () => {
  type Obligation = DeferredResultEvidence<FirstChild>
  type Deferred = DeferredUpdateEvidence<Model, Message, never, Obligation>

  expectTypeOf<ResultEvidenceChannelOf<Deferred>>().toEqualTypeOf<Obligation>()
  expectTypeOf<DeferredResultEvidenceOf<Deferred>>().toEqualTypeOf<Obligation>()
  expectTypeOf<RegistrationEvidenceOf<Deferred>>().toEqualTypeOf<never>()
  expectTypeOf<
    ResultEvidenceChannelOf<
      Deferred &
        Readonly<{
          commands: Commands<Message> & RegistrationEvidence<SecondChild>
        }>
    >
  >().toEqualTypeOf<Obligation>()
})

it('rejects erased evidence retained on a result or its Commands', () => {
  type Invalid = Readonly<{
    'Composition results must preserve concrete Binding graph evidence': unknown
  }>

  expectTypeOf<
    ValidateConcreteResultEvidence<RegistrationEvidence<unknown>>
  >().toEqualTypeOf<Invalid>()
  expectTypeOf<
    ValidateConcreteResultEvidence<
      Readonly<{
        commands?: Commands<Message> & RegistrationEvidence<unknown>
      }>
    >
  >().toEqualTypeOf<Invalid>()
})
