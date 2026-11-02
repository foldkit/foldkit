import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export const installNormalizedFolds = (target, ts, { native = false } = {}) => {
  const foldFile = resolve(target, 'dist/block/outMessageFold.d.ts')
  let declarations = readFileSync(foldFile, 'utf8')
  declarations += `
import type {RegistrationEvidenceTypeId} from '../update/update.js';
type FoldExact<Left,Right> = (<Value>() => Value extends Left ? 1 : 2) extends (<Value>() => Value extends Right ? 1 : 2) ? true : false;
type FoldModelRefinement<Model, Actual> = FoldExact<Model,Actual> extends true ? readonly [] : readonly [Actual];
type FoldReadModel<Model,Refinement> = Refinement extends readonly [infer Actual] ? Actual : Model;
type FoldReadonlyProperty<Value,Key extends keyof Value> = FoldExact<{[Field in Key]:Value[Field]},{-readonly [Field in Key]:Value[Field]}> extends true ? false : true;
type FoldRegistrationData<Value> = typeof RegistrationEvidenceTypeId extends keyof Value ? readonly [Required<Value>[typeof RegistrationEvidenceTypeId],{} extends Pick<Value,typeof RegistrationEvidenceTypeId> ? true : false,FoldReadonlyProperty<Value,typeof RegistrationEvidenceTypeId>] : readonly [];
export interface FoldOptionalReadonlyRegistration<Value> {readonly [RegistrationEvidenceTypeId]?:Value;}
export interface FoldOptionalMutableRegistration<Value> {[RegistrationEvidenceTypeId]?:Value;}
export interface FoldRequiredReadonlyRegistration<Value> {readonly [RegistrationEvidenceTypeId]:Value;}
export interface FoldRequiredMutableRegistration<Value> {[RegistrationEvidenceTypeId]:Value;}
type FoldRegistrationFacet<Data> = Data extends readonly [infer Value,infer IsOptional,infer IsReadonly] ? IsOptional extends true ? IsReadonly extends true ? FoldOptionalReadonlyRegistration<Value> : FoldOptionalMutableRegistration<Value> : IsReadonly extends true ? FoldRequiredReadonlyRegistration<Value> : FoldRequiredMutableRegistration<Value> : unknown;
type FoldArrayBase<Value extends ReadonlyArray<unknown>> = Value extends Array<unknown> ? [...Value] : readonly [...Value];
type FoldCommandData<Value> = Value extends ReadonlyArray<unknown> ? typeof RegistrationEvidenceTypeId extends keyof Value ? FoldArrayBase<Value> extends infer Base extends ReadonlyArray<unknown> ? FoldExact<Value,Base & FoldRegistrationFacet<FoldRegistrationData<Value>>> extends true ? readonly ['Registered',Base,FoldRegistrationData<Value>] : readonly ['Raw',Value] : never : readonly ['Raw',Value] : readonly ['Raw',Value];
type FoldRestoredCommands<Data> = Data extends readonly ['Registered',infer Base,infer Registration] ? Base & FoldRegistrationFacet<Registration> : Data extends readonly ['Raw',infer Value] ? Value : never;
type FoldResidual<Output> = {[Key in keyof Output as Key extends 'model' | typeof RegistrationEvidenceTypeId ? never : Key]:Key extends 'commands' ? FoldCommandData<Required<Output>[Key]> : Output[Key]};
type FoldRecipeResidual<Output> = {[Key in keyof Output as Key extends keyof Update.AnyResultRecipe | typeof RegistrationEvidenceTypeId ? never : Key]:Key extends 'commands' ? FoldCommandData<Required<Output>[Key]> : Output[Key]};
type FoldRestoredResidual<Residual> = {[Key in keyof Residual]:Key extends 'commands' ? FoldRestoredCommands<Required<Residual>[Key]> : Residual[Key]};
type FoldOutputData<Model,Output> = Output extends unknown ? Output extends Update.ResultRecipe<infer Actual,infer Message,infer OutMessage,infer Requirements,infer Evidence> ? readonly ['Recipe',FoldModelRefinement<Model,Actual>,Message,OutMessage,Requirements,Evidence,FoldRecipeResidual<Output>,FoldRegistrationData<Output>] : Output extends Readonly<{model:infer Actual}> ? readonly ['Plain',FoldModelRefinement<Model,Actual>,FoldReadonlyProperty<Output,'model'>,FoldResidual<Output>,FoldRegistrationData<Output>] : readonly ['Other',Output] : never;
export type NormalizedFoldCaseData<Model,Cases> = {[Tag in keyof Cases]: Cases[Tag] extends (...args:ReadonlyArray<any>)=>infer Step ? Step extends infer FunctionValue extends (...args:ReadonlyArray<any>)=>unknown ? FoldOutputData<Model,ReturnType<FunctionValue>> extends infer OutputData extends ReadonlyArray<unknown> ? [Tag,Update.GraphRequirementOf<FunctionValue>,...OutputData] : never : never : never}[keyof Cases];
type FoldModelField<Model,IsReadonly> = IsReadonly extends true ? Readonly<{model:Model}> : {model:Model};
type FoldRestoredOutput<Model,Data> = Data extends readonly ['Recipe',infer Refinement,infer Message,infer OutMessage,infer Requirements,infer Evidence,infer Residual,infer Registration] ? Update.ResultRecipe<FoldReadModel<Model,Refinement>,Message,OutMessage,Requirements,Evidence> & FoldRestoredResidual<Residual> & FoldRegistrationFacet<Registration> : Data extends readonly ['Plain',infer Refinement,infer IsReadonly,infer Residual,infer Registration] ? FoldModelField<FoldReadModel<Model,Refinement>,IsReadonly> & FoldRestoredResidual<Residual> & FoldRegistrationFacet<Registration> : Data extends readonly ['Other',infer Output] ? Output : never;
type FoldCaseTags<Data> = Data extends readonly [infer Tag extends PropertyKey,...ReadonlyArray<unknown>] ? Tag : never;
type FoldCaseData<Data,Tag> = Extract<Data,readonly [Tag,unknown,...ReadonlyArray<unknown>]>;
type FoldCaseOutput<Data> = Data extends readonly [unknown,unknown,...infer Output] ? Output : never;
type FoldCaseGraph<Data> = Data extends readonly [unknown,infer Graph,...ReadonlyArray<unknown>] ? Graph : never;
export type NormalizedFoldStep<Model,Data> = {[Tag in FoldCaseTags<Data>]:OutMessageFoldStep<Model,FoldRestoredOutput<Model,FoldCaseOutput<FoldCaseData<Data,Tag>>>,FoldCaseGraph<FoldCaseData<Data,Tag>>>}[FoldCaseTags<Data>];
declare const NormalizedFoldTypeId:unique symbol;
export interface NormalizedFoldEvidence<ChildOutMessage,ContextData,Data> {readonly [NormalizedFoldTypeId]:readonly [childOutMessage:()=>ChildOutMessage,context:()=>ContextData,data:()=>Data];}
export type NormalizedFoldContextData<Model,Context extends ReadonlyArray<unknown>> = Context extends readonly [] ? readonly [] : Context extends readonly [Update.FoldContext<infer ChildMessage,infer ParentMessage,Model>] ? readonly ['Fold',ChildMessage,ParentMessage] : readonly ['Raw',Context];
export type RestoredFoldContext<Model,Data> = Data extends readonly ['Fold',infer ChildMessage,infer ParentMessage] ? readonly [Update.FoldContext<ChildMessage,ParentMessage,Model>] : Data extends readonly ['Raw',infer Context extends ReadonlyArray<unknown>] ? Context : readonly [];
export interface NormalizedOutMessageFold<Model,ChildOutMessage,Context extends ReadonlyArray<unknown>,Data> extends OutMessageHelperEvidence<ChildOutMessage,'fold'>,NormalizedFoldEvidence<ChildOutMessage,NormalizedFoldContextData<Model,Context>,Data> { (outMessage:ChildOutMessage,...context:Context):NormalizedFoldStep<Model,Data>; }
`
  const parsed = ts.createSourceFile(
    foldFile,
    declarations,
    ts.ScriptTarget.Latest,
    true,
  )
  const replacements = []
  for (const statement of parsed.statements) {
    if (
      !native ||
      !ts.isInterfaceDeclaration(statement) ||
      statement.name.text !== 'MakeOutMessageFold'
    )
      continue
    for (const member of statement.members) {
      if (!ts.isCallSignatureDeclaration(member)) continue
      const args = member.type.typeArguments
      assert.equal(args.length, 3)
      replacements.push({
        start: member.type.getStart(parsed),
        end: member.type.end,
        replacement: `NormalizedFoldCaseData<Model,Cases> extends infer Data extends ReadonlyArray<unknown> ? NormalizedOutMessageFold<Model,${args[0].getText(parsed)},${args[2].getText(parsed)},readonly [...Data]> : never`,
      })
    }
  }
  assert.equal(replacements.length, native ? 1 : 0)
  for (const change of replacements.reverse())
    declarations =
      declarations.slice(0, change.start) +
      change.replacement +
      declarations.slice(change.end)
  writeFileSync(foldFile, declarations)
  const authoringFile = resolve(
    target,
    'dist/experimental/constructed/authoring.d.ts',
  )
  let authoring = readFileSync(authoringFile, 'utf8')
  const authoringParsed = ts.createSourceFile(
    authoringFile,
    authoring,
    ts.ScriptTarget.Latest,
    true,
  )
  const edits = []
  for (const statement of authoringParsed.statements) {
    if (
      !ts.isInterfaceDeclaration(statement) ||
      statement.name.text !== 'MakeDescriptorOutMessageFold'
    )
      continue
    for (const member of statement.members) {
      if (!ts.isCallSignatureDeclaration(member)) continue
      const args = member.type.typeArguments
      assert.equal(args.length, 3)
      edits.push({
        start: member.type.getStart(authoringParsed),
        end: member.type.end,
        replacement: `NormalizedFoldCaseData<Model,Cases> extends infer Data extends ReadonlyArray<unknown> ? NormalizedOutMessageFold<Model,${args[0].getText(authoringParsed)},${args[2].getText(authoringParsed)},readonly [...Data]> : never`,
      })
    }
  }
  assert.equal(edits.length, 1)
  for (const edit of edits.reverse())
    authoring =
      authoring.slice(0, edit.start) +
      edit.replacement +
      authoring.slice(edit.end)
  authoring +=
    "\nimport type {NormalizedFoldCaseData,NormalizedOutMessageFold} from '../../block/outMessageFold.js';\n"
  writeFileSync(authoringFile, authoring)
  const publicFile = resolve(target, 'dist/block/public.d.ts')
  writeFileSync(
    publicFile,
    readFileSync(publicFile, 'utf8') +
      "\nexport type {NormalizedFoldCaseData,NormalizedFoldStep,NormalizedOutMessageFold,NormalizedFoldEvidence,NormalizedFoldContextData,RestoredFoldContext,FoldOptionalReadonlyRegistration,FoldOptionalMutableRegistration,FoldRequiredReadonlyRegistration,FoldRequiredMutableRegistration} from './outMessageFold.js';\n",
  )
}
