import { assert, describe, it } from "@effect/vitest"
import { HttpApi } from "effect/unstable/httpapi"

describe("HttpApi", () => {
  it("stores the supplied identifier", () => {
    const api = HttpApi.make("Api")

    assert.strictEqual(api.identifier, "Api")
  })

  it("initializes groups as a readonly record", () => {
    const api = HttpApi.make("Api")

    assert.deepStrictEqual(api.groups, {})
  })
})
