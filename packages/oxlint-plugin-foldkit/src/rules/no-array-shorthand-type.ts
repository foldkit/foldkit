import type { CreateRule } from 'effect-oxlint'
import { Rule } from 'effect-oxlint'

const rule: CreateRule = Rule.banStatement('TSArrayType', {
  message:
    'Avoid `T[]` array-type syntax. Use `Array<T>` for mutable arrays or `ReadonlyArray<T>` for read-only — the form used throughout Foldkit exemplars. (FK-6)',
})

export default rule
