---
'foldkit': minor
---

Add experimental `AgentContext` to `foldkit/experimental`. An Agent Context declares the part of a Model that an in-app agent may read, such as the current page, the selected record ids, and the active filter. Before, an application that attached UI state to an agent turn wrote its own projection, JSON encoding, and description, and nothing kept other Model fields out of what it sent.

`AgentContext.define(Model, fields, { read })` takes the Model Schema, a field map in the shape of `Schema.Struct`, and a pure `read` function. The result exposes `Context` (the Schema, for Command args and server decoding), `fields`, `read`, `encode`, and `jsonSchema`. The returned `read` keeps only the declared fields, even when the callback returns more of the Model, so Command args, Subscription dependencies, and the JSON from `encode` hold nothing else. `jsonSchema` is a standalone draft 2020-12 JSON Schema of the encoded context, with `$schema`, field annotations such as `description`, and `$defs`.

```ts
import { Schema } from 'effect'
import { AgentContext } from 'foldkit/experimental'

const WorkspaceAgentContext = AgentContext.define(
  Model,
  {
    page: Schema.Literals(['Inbox', 'Thread']),
    selectedThreadIds: Schema.Array(Schema.String),
  },
  {
    read: model => ({
      page: model.page,
      selectedThreadIds: model.selectedThreadIds,
    }),
  },
)
```

When update handles the Message that submits a prompt, it reads the context and returns a Command with the context as an argument; the Runtime runs that Command. To publish changes to a server session, build a Subscription entry from `fields` and `read`; its Stream restarts only when a declared field changes. The context is read-only: declaring Messages that an agent may send is not part of this release. The new Agent Context guide covers each step.
