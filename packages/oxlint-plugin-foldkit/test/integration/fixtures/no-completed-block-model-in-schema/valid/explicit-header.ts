import { Schema } from 'effect'
import { Block as Boundary } from 'foldkit'
import * as Feature from 'foldkit/block'
import type {
  FromAssemblyWithView as ViewHeader,
  FromAssemblyWithViewAndOutMessage as ViewOutHeader,
  FromAssemblyWithOutMessage as OutHeader,
  FromAssemblyWithoutViewOrOutMessage as PlainHeader,
} from 'foldkit/block'

import {
  PublicInterfaceHeader,
  PublicHeader,
} from '../shared/header-barrel'
import * as HeaderFeature from '../shared/header-barrel'

const Model = Schema.Struct({ count: Schema.Number })
const Composition = Feature.makeDefinition('Child', { Model }).makeComposition()
const prepareQualified = () => Composition.prepareBlock({})
const Qualified: Boundary.FromAssemblyWithoutViewOrOutMessage<typeof Model, typeof prepareQualified> = Boundary.assemble(prepareQualified)
const prepareView = () => Composition.prepareBlock({})
const View: ViewHeader<typeof Model, typeof prepareView> = Feature.assemble(prepareView)
const prepareViewOut = () => { return Composition.prepareBlock({}) }
const ViewOut: ViewOutHeader<typeof Model, typeof prepareViewOut> = Feature.assemble(prepareViewOut)
const prepareOut = () => Composition.prepareBlock({})
const Out: OutHeader<typeof Model, typeof prepareOut> = Feature.assemble(prepareOut)
const preparePlain = () => Composition.prepareBlock({})
const Plain: PlainHeader<typeof Model, typeof preparePlain> = Feature.assemble(preparePlain)
const checkedBoundaryProducer = () => Composition.prepareBlock({})
const NamedBoundary: PlainHeader<typeof Model, typeof checkedBoundaryProducer> = Feature.assemble(checkedBoundaryProducer)
const prepareInterface = () => Composition.prepareBlock({})
export interface InterfaceBoundary extends PlainHeader<
  typeof Model,
  typeof prepareInterface
> {}
export const InterfaceBoundary: InterfaceBoundary =
  Feature.assemble(prepareInterface)
const alias = Qualified
export const Parent = Schema.Struct({
  qualified: Schema.Option(Schema.Array(alias.Model)),
  satisfies: (alias satisfies unknown).Model,
  parenthesized: (alias).Model,
  nonNull: alias!.Model,
  view: View.Model,
  viewOut: ViewOut.Model,
  out: Out.Model,
  plain: Plain.Model,
  namedBoundary: NamedBoundary.Model,
  localInterface: InterfaceBoundary.Model,
  importedInterface: PublicInterfaceHeader.Model,
  imported: PublicHeader.Model,
  namespace: HeaderFeature.PublicHeader.Model,
})
export type ChildModel = typeof Qualified.Model.Type
export const ordinary = Qualified.Model
