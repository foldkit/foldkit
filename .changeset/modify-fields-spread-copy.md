---
'foldkit': patch
---

Make `modifyFields` and `makeModifyFieldsFor` cost proportional to the fields they change. They wrapped Effect's `Struct.evolve`, which visits every key of the struct through `Reflect.ownKeys` and `propertyIsEnumerable` on each call, so updating one field of a large Model paid for all of its keys. In one canvas game it was about half of the update time in a busy frame.

Both now copy the struct with an object spread and then apply only the given transforms, to keys the struct has as own enumerable properties. The result has the same own enumerable keys in the same order as before, including symbol keys and an own `__proto__` key, and the types are unchanged.
