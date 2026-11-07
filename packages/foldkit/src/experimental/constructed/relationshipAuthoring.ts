import type { Schema } from 'effect'

import type { MakeOwnedVariantBinding } from '../../block/variantBinding.js'
import type {
  ConstructionKind,
  MakeCustomKeyedBinding,
  MakeFieldBinding,
  MakeMapBinding,
  MakeSingularBinding,
} from './authoring.js'

type AnySchema = Schema.Codec<any, any, any, any>
type SelfContainedSchema = Schema.Codec<any, any, never, never>

/** Parent-specialized constructors for each supported child relationship. */
export interface RelationshipConstructors<
  ModelSchema extends SelfContainedSchema,
  MessageSchema extends SelfContainedSchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContextSchema extends AnySchema | undefined,
  Kind extends ConstructionKind,
  ParentOwner,
> {
  /** Binds one required parent field with exactly the child Model's decoded shape.
   *
   * `activeWhen` may deactivate the occurrence while retaining its stored Model.
   * Omit `init` for automatic no-argument initialization; `init: false` leaves
   * initial storage to the parent.
   *
   * @example
   * ```ts
   * const SearchBinding = ParentBlock.makeRequiredFieldBinding(SearchBlock, {
   *   field: 'search',
   * })
   * ``` */
  readonly makeRequiredFieldBinding: MakeSingularBinding<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Kind,
    ParentOwner,
    'Required'
  >
  /** Binds a required parent field storing `Option<ChildModel>`.
   *
   * `None` deactivates the occurrence. `activeWhen` may also deactivate a stored
   * child without clearing it. Folds and operations never insert a missing child.
   *
   * @example
   * ```ts
   * const MaybeDialogBinding = ParentBlock.makeOptionalFieldBinding(DialogBlock, {
   *   field: 'maybeDialog',
   * })
   * ``` */
  readonly makeOptionalFieldBinding: MakeSingularBinding<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Kind,
    ParentOwner,
    'Optional'
  >
  /** Binds one optional keyed child in a closed Struct wrapper.
   *
   * `field` selects a required Option field. Distinct required wrapper fields
   * supply its string or finite-number `key` and exact child Model `childField`.
   * The parent owns presence through `Binding.init`; startup `init` is unsupported.
   *
   * @example
   * ```ts
   * const MaybeEditorBinding = ParentBlock.makeOptionalKeyedFieldBinding(EditorBlock, {
   *   field: 'maybeEditor', key: 'issueId', childField: 'model',
   * })
   * ``` */
  readonly makeOptionalKeyedFieldBinding: MakeFieldBinding<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Kind,
    ParentOwner,
    'OptionalKeyed'
  >
  /** Binds a required array of child Models or closed parent-owned wrappers.
   *
   * `key` names a required string or finite-number identity field. Add
   * `childField` for wrapped Models. The parent owns membership and order;
   * generated writes preserve other wrapper fields and never insert an entry.
   *
   * @example
   * ```ts
   * const CountersBinding = ParentBlock.makeKeyedArrayBinding(CounterBlock, {
   *   field: 'counters', key: 'key', childField: 'model',
   * })
   * ``` */
  readonly makeKeyedArrayBinding: MakeFieldBinding<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Kind,
    ParentOwner,
    'KeyedArray'
  >
  /** Binds a required Record field, using its decoded string keys as occurrence identities.
   *
   * Add `childField` for closed wrappers. The parent owns insertion and removal;
   * direct values support `initAndInsert` from `foldkit/binding`.
   * See {@link MakeMapBinding} for storage, key and initialization contracts.
   *
   * @example
   * ```ts
   * const EditorsBinding = ParentBlock.makeRecordBinding(EditorBlock, {
   *   field: 'editors',
   * })
   * ``` */
  readonly makeRecordBinding: MakeMapBinding<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Kind,
    ParentOwner,
    'Record'
  >
  /** Binds a required Effect HashMap field, using its primitive keys as occurrence identities.
   *
   * Keys decode to strings or numbers; actual numeric keys must be finite.
   * Add `childField` for closed wrappers. Parents own membership; direct values
   * support `initAndInsert` from `foldkit/binding`.
   * See {@link MakeMapBinding} for storage, key and initialization contracts.
   *
   * @example
   * ```ts
   * const EditorsBinding = ParentBlock.makeHashMapBinding(EditorBlock, {
   *   field: 'editors',
   * })
   * ``` */
  readonly makeHashMapBinding: MakeMapBinding<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Kind,
    ParentOwner,
    'HashMap'
  >
  /** Binds one child through parent-owned `read` and `write` accessors.
   *
   * `read` returns an Option; `None` deactivates the occurrence. `write` places
   * the next child Model. Handle parent reactions through OutMessage policy.
   *
   * @example
   * ```ts
   * const EditorBinding = ParentBlock.makeCustomBinding(EditorBlock, {
   *   read: model => model.editorState,
   *   write: (model, nextEditor) => modifyFields(model, {
   *     editorState: () => Option.some(nextEditor),
   *   }),
   * })
   * ``` */
  readonly makeCustomBinding: MakeSingularBinding<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Kind,
    ParentOwner,
    'Custom'
  >
  /** Binds keyed children through explicit membership and storage accessors.
   *
   * Supply `readAll`, a function-valued `key`, `read` and `writeAt`. A messageful
   * child also needs the exact primitive `keySchema` for generated delivery.
   * The parent owns membership and custom placement; use `Binding.init` to create.
   *
   * @see makeKeyedArrayBinding
   * @see makeRecordBinding
   * @see makeHashMapBinding */
  readonly makeCustomKeyedBinding: MakeCustomKeyedBinding<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    Kind,
    ParentOwner
  >
  /** Binds one complete tagged child member of the parent union.
   *
   * Include the actual child Model Schema in the parent `Schema.Union`. Folds
   * and operations leave other variants unchanged. Parent update owns switches
   * and explicit creation through `Binding.init`.
   *
   * @example
   * ```ts
   * const EditingBinding = ParentBlock.makeVariantBinding(EditingBlock)
   * ``` */
  readonly makeVariantBinding: MakeOwnedVariantBinding<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContextSchema,
    ParentOwner
  >
}
