# Agent Context

:::Warning{label="Experimental"}
Agent Context ships from `foldkit/experimental`. Its declaration model is usable today, but names and types may change before the module moves into Foldkit's stable API.
:::

## Overview

### Context for an In-App Agent

An agent built into an application gives better answers when it knows what the person is looking at. A person who opens a thread and asks "summarize this" expects the agent to know which thread. Without that context, the agent asks "which thread?", or it guesses.

An Agent Context is a declared view of your [Model](/core/model) for that agent. You list the fields the agent may read, such as the current page, the selected record ids, and the active filter, and write a pure function that reads them from the Model. The application then sends that context with each agent turn and can publish it to a server whenever it changes.

### What the Agent Context Owns

The Agent Context owns the context Schema, the `read` function, the JSON encoding, and a JSON Schema description of the fields. It does not send anything by itself. Your application decides when a turn starts, which Command sends it, and where a published context goes. The agent integration can be an Effect AI Toolkit in the application, a server endpoint, or another service your Commands call.

### Agent Context and DevTools MCP

[DevTools MCP](/ai/mcp) gives a coding agent the complete Model, Message history, and dispatch while you develop. It runs only on the development server. An Agent Context is the production counterpart with the opposite default: it holds only the fields you declare, so a Command or Subscription that carries the context carries no other part of the Model.

## Define an Agent Context

### Fields and `read`

`AgentContext.define` takes the Model Schema, a field map in the same shape you would pass to `Schema.Struct`, and a `read` function. TypeScript checks that `read` returns a value for every declared field.

::Snippet{name="agentContextDefine" label="Agent Context definition"}

Field annotations such as `description` appear in the JSON Schema description, so the agent can learn what each field means. Every field must encode and decode without services, because the context travels as plain JSON.

### What Leaves the Model

The `read` that `define` returns keeps only the declared fields. If your `read` callback returns more of the Model than the field map declares, for example the whole Model, the extra fields are dropped. Command args, the Command entries in DevTools history, Subscription dependencies, and the encoded JSON then hold only the declared fields. DevTools itself still shows the whole Model, but only in development. The field map is the boundary, so keep credentials, session material, drafts, and private personal data out of it.

The returned value has these members:

- `Context` is the context Schema. Use it in Command args and to decode the context on a server.
- `fields` is the field map, in the shape a Subscription entry takes.
- `read` returns the context for a Model, with only the declared fields.
- `encode` returns the JSON form of a context.
- `jsonSchema` is a standalone JSON Schema (draft 2020-12) of the encoded context.

## Attach the Context to an Agent Turn

When update handles the Message that submits a prompt, it reads the context from the Model and returns a Command with the context as an argument. The Runtime then runs the Command, and its handler encodes the context and sends it with the prompt. Because the context is a Command argument, DevTools history and Story tests show exactly what each turn carried.

::Snippet{name="agentContextTurn" label="Agent turn with context"}

When the agent lives in a child Block, the parent reads the context from its own Model and passes it to the child through `delivery.toUpdateContext` on the child's Binding. The child does not read the parent's Model.

## Publish Context Changes

Some agent integrations keep a session on the server and want the latest context before the person sends a prompt. Build a [Subscription](/core/subscriptions) entry from `fields` and `read`. The Runtime compares Subscription dependencies with their Schema, so the entry's Stream starts at startup and restarts only when a declared field changes. A change to any other part of the Model does not publish anything.

::Snippet{name="agentContextSubscription" label="Publish the context through a Subscription"}

An empty `messages` list declares a silent Subscription: its Stream performs the publish and emits no Messages.

## Describe the Context to the Agent

`jsonSchema` is a standalone JSON Schema (draft 2020-12) of the encoded context. It carries `$schema`, the declared properties with their annotations, and `$defs` for any Schema with an `identifier` annotation. Put it in the agent's instructions or a tool definition so the model knows the shape and meaning of the context it receives. On the server, decode the request body, including the context, with the same `Context` Schema before you use it. In the example, `runAgentTurn` stands for your call to the language model.

::Snippet{name="agentContextDescribe" label="Decode and describe the context on a server"}

## Test the Agent Context

The context is an ordinary Command argument, so a Story asserts it like any other. Assert the encoded form when you want a test to fail if a private field reaches the agent.

::Snippet{name="agentContextStory" label="Agent Context tests"}

## Current Scope

An Agent Context is read-only. The agent can read what the person sees, but it cannot change the application through the context. An agent that should act in the UI needs a declared set of Messages it may send, validated by Schema and handled by the normal update. That part is not in this module yet.

The context is a projection of the Model only. It does not include DOM state, such as a text selection or the scroll position, unless the Model records it.

## API Reference

The [Agent Context API reference](/api-reference/experimental-agent-context) lists the exact signatures.
