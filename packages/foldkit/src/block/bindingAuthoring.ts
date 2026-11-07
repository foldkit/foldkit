import type { Schema } from 'effect'

import type {
  BindCustomKeyedChild,
  BindFieldChild,
  BindSingularChild,
} from './bindChild.js'
import type { MakeMapBinding } from './mapBinding.js'
import type { MakeNativeOwnedVariantBinding } from './variantBinding.js'

type AnySchema = Schema.Codec<any, any, any, any>

/** Parent-specialized Binding constructors for completed native child Blocks. */
export interface NativeRelationshipConstructors<
  ModelSchema extends AnySchema,
  MessageSchema extends AnySchema,
  OutMessageSchema extends AnySchema | undefined,
  ChildInitContext,
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
  readonly makeRequiredFieldBinding: BindSingularChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext,
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
  readonly makeOptionalFieldBinding: BindSingularChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext,
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
  readonly makeOptionalKeyedFieldBinding: BindFieldChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext,
    'OptionalKeyed'
  >
  /** Binds a required array of child Models or closed parent-owned wrappers.
   *
   * `key` names a required string or finite-number identity field. Add
   * `childField` for wrapped Models. The parent owns membership and order;
   * generated writes preserve other wrapper fields and never insert an entry.
   * Keyed startup initialization stores direct child Models without an adapter;
   * wrapped items require `init.toItem` for their parent-owned metadata.
   *
   * @example
   * ```ts
   * const CountersBinding = ParentBlock.makeKeyedArrayBinding(CounterBlock, {
   *   field: 'counters', key: 'key', childField: 'model',
   * })
   * ``` */
  readonly makeKeyedArrayBinding: BindFieldChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext,
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
    ChildInitContext,
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
    ChildInitContext,
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
  readonly makeCustomBinding: BindSingularChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext,
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
  readonly makeCustomKeyedBinding: BindCustomKeyedChild<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext
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
  readonly makeVariantBinding: MakeNativeOwnedVariantBinding<
    ModelSchema,
    MessageSchema,
    OutMessageSchema,
    ChildInitContext
  >
}
