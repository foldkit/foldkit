import { Schema as S } from 'effect'
import { Schema as T } from 'effect'

const Model = S.Struct({ value: T.String })

export { Model }
