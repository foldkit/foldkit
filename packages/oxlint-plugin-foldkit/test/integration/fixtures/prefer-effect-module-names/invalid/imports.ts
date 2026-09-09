import {
  Match as M,
  Schema as S,
  String as String_,
  pipe as effectPipe,
} from 'effect'

const Model = S.Struct({ value: S.String })
const render = M.value(Model.make({ value: 'value' })).pipe(
  M.when({ value: String_.isNonEmpty }, effectPipe),
  M.orElse(() => undefined),
)

export { Model, render }
