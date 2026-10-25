import { Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

const owner = { makeBinding: (_child: unknown, config: unknown) => config }
owner.makeBinding({}, {
  read: (model: { child: { label: string } }) => Option.some(model.child),
  write: (model: { child: { label: string }; announcement: string }, nextChild: { label: string }) =>
    modifyFields(model, { child: () => nextChild, announcement: () => nextChild.label }),
})
