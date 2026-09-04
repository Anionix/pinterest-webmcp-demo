# Pinterest Idea Search update log

Machine-readable fields for every entry are in
[`evidence/state-transitions.jsonl`](evidence/state-transitions.jsonl).

## 2026-09-04

* **Local candidate ready**: Sequence 7 (`01a06baf-2907-7264-8387-009f0e0767c6`)
  observed 30 of 30 tests passing after identity joins and responsive-width
  hardening, then moved the project to `local_candidate_ready`. Public WebMCP
  discovery and execution remain unmeasured.
* **Candidate verification**: Sequence 6 (`01a06bab-2e37-7c31-bc2c-2522e037efee`)
  observed 29 of 29 tests and the whitespace check passing after the fail-closed
  form and production policy checks were added, then moved the project to
  `candidate_verified`.
* **Browser verification**: Sequence 5 (`01a06ba8-d6a0-7a5a-8bf5-c371b034f5c3`)
  exercised valid and invalid inputs in Chrome, read back the normalized input,
  visible result, fixed link, cleared stale result, and visible error, then moved
  the project to `browser_checks_passed`.
* **Automated verification**: Sequence 4 (`01a06ba8-d69f-740a-8661-9972f59af041`)
  observed 28 of 28 tests passing on Node.js 24.15.0 and moved the project to
  `automated_checks_passed`.
* **Contract reconciliation**: Sequence 3 checked the recovered behavior
  against current primary WebMCP sources and moved the project from
  `local_source_restored` to `contract_reconciled`.
* **Source recovery**: Sequence 2 restored the deployed two-file behavior into
  the empty local repository and moved it to `local_source_restored`.
* **Initialization**: Sequence 1 began recovery from the shared product brief
  and the live deployment.
