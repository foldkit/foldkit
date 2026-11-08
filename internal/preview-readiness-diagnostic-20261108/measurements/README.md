# Preview readiness diagnostic evidence

This directory is the repository-ready outcome packet for the bounded Website readiness investigation performed on 2026-11-08. The result is a valid 22/22 first-attempt non-reproduction. It does not establish the cause of the earlier intermittent five-second SSR handoff timeout and does not claim that defect is fixed.

- Read `REPORT.md` for interpretation and limits.
- Read `source-provenance.json` for canonical Git and tool provenance.
- Read `archive-inventory.json` for stored and decompressed hashes.
- Verify repository packet files with `shasum -a 256 -c final-files.sha256` from this directory.
- The `evidence/` archives preserve v1, v2 and v3 raw packets. Extract them into an empty directory and use `evidence/raw-files.sha256` to verify all original files.

Suggested repository destination: `internal/preview-readiness-diagnostic-20261108/`.

No production source, timeout, assertion, retry policy or browser configuration change is included.
