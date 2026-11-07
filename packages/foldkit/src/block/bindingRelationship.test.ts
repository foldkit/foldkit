import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import { assertBindingRelationship } from './bindingRelationship.js'

const ChildModel = Schema.Struct({ count: Schema.Number })
const WrappedChild = Schema.Struct({
  child: ChildModel,
  id: Schema.String,
  label: Schema.String,
})

describe('Binding relationships', () => {
  it('distinguishes direct relationship storage from the child Model shape', () => {
    const children = [
      Schema.Option(ChildModel),
      Schema.Array(ChildModel),
      Schema.Record(Schema.String, ChildModel),
      Schema.HashMap(Schema.String, ChildModel),
    ]

    for (const childModel of children) {
      const RequiredParent = Schema.Struct({ child: childModel })
      const OptionalParent = Schema.Struct({ child: Schema.Option(childModel) })

      expect(() =>
        assertBindingRelationship('Required', RequiredParent, childModel, {
          field: 'child',
        }),
      ).not.toThrow()
      expect(() =>
        assertBindingRelationship('Optional', OptionalParent, childModel, {
          field: 'child',
        }),
      ).not.toThrow()
      expect(() =>
        assertBindingRelationship('Required', OptionalParent, childModel, {
          field: 'child',
        }),
      ).toThrow(/makeRequiredFieldBinding requires a required field/)
      expect(() =>
        assertBindingRelationship('Optional', RequiredParent, childModel, {
          field: 'child',
        }),
      ).toThrow(/makeOptionalFieldBinding requires a required field/)
    }
  })

  it('requires declared required direct fields and separate custom forms', () => {
    const ParentModel = Schema.Struct({
      child: ChildModel,
      maybeChild: Schema.Option(ChildModel),
      optionalChild: Schema.optional(ChildModel),
    })

    expect(() =>
      assertBindingRelationship('Required', ParentModel, ChildModel, {
        field: 'optionalChild',
      }),
    ).toThrow(/makeRequiredFieldBinding requires a required field/)
    expect(() =>
      assertBindingRelationship('Optional', ParentModel, ChildModel, {
        field: 'maybeChild',
        key: 'id',
      }),
    ).toThrow(/makeOptionalFieldBinding does not support the key/)
    expect(() =>
      assertBindingRelationship('Custom', ParentModel, ChildModel, {
        read: () => {
          throw new Error('read must remain passive')
        },
        write: () => {
          throw new Error('write must remain passive')
        },
      }),
    ).not.toThrow()
    expect(() =>
      assertBindingRelationship('Custom', ParentModel, ChildModel, {
        read: () => undefined,
      }),
    ).toThrow(/makeCustomBinding requires read and write functions/)
  })

  it('validates exact keyed arrays and wrapped array fields', () => {
    const ChildWithKey = Schema.Struct({
      count: Schema.Number,
      id: Schema.String,
    })
    const ParentModel = Schema.Struct({
      children: Schema.Array(ChildWithKey),
      wrappedChildren: Schema.Array(WrappedChild),
      maybeChild: Schema.Option(WrappedChild),
    })

    expect(() =>
      assertBindingRelationship('KeyedArray', ParentModel, ChildWithKey, {
        field: 'children',
        key: 'id',
      }),
    ).not.toThrow()
    expect(() =>
      assertBindingRelationship('KeyedArray', ParentModel, ChildModel, {
        childField: 'child',
        field: 'wrappedChildren',
        key: 'id',
      }),
    ).not.toThrow()
    expect(() =>
      assertBindingRelationship('KeyedArray', ParentModel, ChildModel, {
        childField: 'child',
        field: 'maybeChild',
        key: 'id',
      }),
    ).toThrow(/makeKeyedArrayBinding requires Schema.Array storage/)
    expect(() =>
      assertBindingRelationship('KeyedArray', ParentModel, ChildModel, {
        childField: 'child',
        field: 'wrappedChildren',
        key: 'child',
      }),
    ).toThrow(/makeKeyedArrayBinding requires distinct key and childField/)
  })

  it('validates keyed optional slots without evaluating initialization', () => {
    const ParentModel = Schema.Struct({
      maybeChild: Schema.Option(WrappedChild),
      wrappedChildren: Schema.Array(WrappedChild),
    })

    expect(() =>
      assertBindingRelationship('OptionalKeyed', ParentModel, ChildModel, {
        childField: 'child',
        field: 'maybeChild',
        key: 'id',
      }),
    ).not.toThrow()
    expect(() =>
      assertBindingRelationship('OptionalKeyed', ParentModel, ChildModel, {
        childField: 'child',
        field: 'wrappedChildren',
        key: 'id',
      }),
    ).toThrow(/makeOptionalKeyedFieldBinding requires Schema.Option wrapper/)
    expect(() =>
      assertBindingRelationship('OptionalKeyed', ParentModel, ChildModel, {
        childField: 'child',
        field: 'maybeChild',
        init: {
          instances: () => {
            throw new Error('init must remain passive')
          },
        },
        key: 'id',
      }),
    ).toThrow(/makeOptionalKeyedFieldBinding cannot use init/)
  })

  it('keeps Record and HashMap relationships distinct', () => {
    const ParentModel = Schema.Struct({
      childrenById: Schema.Record(Schema.String, ChildModel),
      childrenByNumber: Schema.HashMap(Schema.Finite, ChildModel),
      rowsById: Schema.Record(Schema.String, WrappedChild),
      rowsByNumber: Schema.HashMap(Schema.Finite, WrappedChild),
    })

    expect(() =>
      assertBindingRelationship('Record', ParentModel, ChildModel, {
        field: 'childrenById',
      }),
    ).not.toThrow()
    expect(() =>
      assertBindingRelationship('HashMap', ParentModel, ChildModel, {
        field: 'childrenByNumber',
      }),
    ).not.toThrow()
    expect(() =>
      assertBindingRelationship('Record', ParentModel, ChildModel, {
        childField: 'child',
        field: 'rowsById',
      }),
    ).not.toThrow()
    expect(() =>
      assertBindingRelationship('HashMap', ParentModel, ChildModel, {
        childField: 'child',
        field: 'rowsByNumber',
      }),
    ).not.toThrow()
    expect(() =>
      assertBindingRelationship('Record', ParentModel, ChildModel, {
        field: 'childrenByNumber',
      }),
    ).toThrow(/makeRecordBinding requires a required Schema.Record/)
    expect(() =>
      assertBindingRelationship('HashMap', ParentModel, ChildModel, {
        field: 'childrenById',
      }),
    ).toThrow(/makeHashMapBinding requires a required Schema.HashMap/)
    expect(() =>
      assertBindingRelationship('Record', ParentModel, ChildModel, {
        childField: 'missing',
        field: 'rowsById',
      }),
    ).toThrow(/makeRecordBinding does not match its declared storage/)
  })

  it('validates custom keyed adapters and key Schemas without invoking them', () => {
    const ParentModel = Schema.Struct({ child: ChildModel })
    const passive = () => {
      throw new Error('custom keyed adapter must remain passive')
    }

    expect(() =>
      assertBindingRelationship('CustomKeyed', ParentModel, ChildModel, {
        key: passive,
        keySchema: Schema.String,
        read: passive,
        readAll: passive,
        writeAt: passive,
      }),
    ).not.toThrow()
    expect(() =>
      assertBindingRelationship('CustomKeyed', ParentModel, ChildModel, {
        key: passive,
        keySchema: Schema.Boolean,
        read: passive,
        readAll: passive,
        writeAt: passive,
      }),
    ).toThrow(/makeCustomKeyedBinding requires keySchema/)
    expect(() =>
      assertBindingRelationship('CustomKeyed', ParentModel, ChildModel, {
        field: 'child',
        key: passive,
        read: passive,
        readAll: passive,
        writeAt: passive,
      }),
    ).toThrow(/makeCustomKeyedBinding does not support the field/)
  })

  it('does not execute relationship callbacks during validation', () => {
    const ParentModel = Schema.Struct({ child: ChildModel })
    const failIfCalled = () => {
      throw new Error('relationship callback must remain passive')
    }

    expect(() =>
      assertBindingRelationship('Required', ParentModel, ChildModel, {
        delivery: { toParentMessage: failIfCalled },
        field: 'child',
        init: { args: failIfCalled },
        activeWhen: failIfCalled,
        subscriptions: { when: failIfCalled },
      }),
    ).not.toThrow()
  })
})
