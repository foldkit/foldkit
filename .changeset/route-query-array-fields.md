---
'foldkit': patch
---

Round-trip array fields in `Route.query`. A `Schema.Struct` query field whose encoded form is an array, such as `Schema.Array(Schema.String)`, built one comma-joined parameter (`?tags=rent%2Clease`), and that URL parsed to the not-found route. The field now builds one parameter for each element (`?tags=rent&tags=lease`) and parses every value of that parameter back into the array. Each element must encode to a string, as every query value does. An empty array builds no parameter. When the URL has no parameter for an array field, a required field parses to an empty array, and an optional field parses as a missing key. An optional field therefore does not keep an empty array: it parses back as absent, or as its decoding default.
