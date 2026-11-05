---
'create-foldkit-app': patch
---

Align generated applications and agent guidance with the current Block file roles. Split features declare their passive Block and internal authoring helpers in `block.ts`, configure relationships in `composition.ts`, construct their implementation in `layer.ts`, and place an extracted local handler bundle in `effectsLayer.ts`. Compact features keep the complete implementation in `block.ts`.

Require the Story or Scene DSL for application behavior tests, using the Block-aware runners and Effect-aware test integration. Document generated InMessage methods, explicit public feature barrels, adjacent identity keys, and feature-owned helper imports.

When reorganizing an existing split feature, move its declaration from `definition.ts` to `block.ts`, its construction Layer from the former `block.ts` to `layer.ts`, and its former handler bundle from `layer.ts` to `effectsLayer.ts`. Update imports according to responsibility and retain unique-symbol key exports needed by emitted declarations.
