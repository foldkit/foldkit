# Rendering packet storage

The raw receipt JSON is compressed to keep the pull request's source diff
readable. It is storage-only compression; no measurement or receipt field
changed. All original report, log, protocol and asset bytes are retained.

Before following `reproduction.md`, restore the raw JSON from this directory:

```sh
shasum -a 256 -c compressed-receipts.sha256
tar -xzf key-receipts-json.tar.gz
shasum -a 256 -c final-files.sha256
```

`compressed-receipts.json` records the stored archive, decompressed tar and
individual original payload hashes. The final command verifies the same
41-entry packet manifest authenticated before compression. The human-readable
report and reproduction instructions remain available beside the archive.
