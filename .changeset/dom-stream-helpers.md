---
'foldkit': minor
---

Move browser event, media query, and key-binding Stream helpers and their types from `Subscription` to `Dom` ([#1621](https://github.com/foldkit/foldkit/pull/1621)). Update imports from `foldkit/subscription` to `foldkit/dom`, or use `Dom` from `foldkit`, for these helpers:

| Before                                          | After                                        |
| ----------------------------------------------- | -------------------------------------------- |
| `Subscription.fromEvent`                        | `Dom.streamFromEvent`                        |
| `Subscription.fromEventFilterMap`               | `Dom.streamFromEventFilterMap`               |
| `Subscription.fromEventFilterMapPreventDefault` | `Dom.streamFromEventFilterMapPreventDefault` |
| `Subscription.fromMediaQuery`                   | `Dom.streamFromMediaQuery`                   |
| `Subscription.keyBindings`                      | `Dom.streamFromKeyBindings`                  |

Update explicit config type references as well:

| Before                                                | After                                              |
| ----------------------------------------------------- | -------------------------------------------------- |
| `Subscription.FromEventConfig`                        | `Dom.StreamFromEventConfig`                        |
| `Subscription.FromEventFilterMapConfig`               | `Dom.StreamFromEventFilterMapConfig`               |
| `Subscription.FromEventFilterMapPreventDefaultConfig` | `Dom.StreamFromEventFilterMapPreventDefaultConfig` |
| `Subscription.FromMediaQueryConfig`                   | `Dom.StreamFromMediaQueryConfig`                   |
| `Subscription.KeyBindingsConfig`                      | `Dom.StreamFromKeyBindingsConfig`                  |

`TypedEventTarget`, `KeyBinding`, `KeySequence`, and `WhileTyping` move from `Subscription` to `Dom` with their names unchanged. The helpers accept the same arguments and return Effect Streams. Use `Subscription.persistentEntry` for a Stream with no dependencies on its Model, or pass a Stream to a Model-driven Subscription entry or a Mount.
