# Pinterest Idea Search update log

Machine-readable fields for every entry are in
[`evidence/state-transitions.jsonl`](evidence/state-transitions.jsonl).

## 2026-09-04

* **Preview verification complete**: Sequence 11 (`01a06bb8-43f8-7b8a-9d93-b672f55220bc`)
  exercised the ordinary form with a valid value and a whitespace-only value,
  including removal of the stale link after failure. Production remains
  unchanged and unmeasured.
* **Preview WebMCP verified**: Sequence 10 (`01a06bb6-8a22-7e97-bc12-c76a97714abf`)
  discovered and executed `prepare_pinterest_idea_search` in the Codex in-app
  browser, matched its normalized return to the visible query and link,
  and rediscovered it after reload.
* **Preview deployed**: Sequence 9 (`01a06bb6-8a21-724f-b70f-a89e105a2190`)
  observed Vercel preview deployment `dpl_82SHGa4fRxNttNp5moepxLJfrSrv` in the
  ready state and read back the expected security headers. Production was not
  changed by this observation.
* **Public repository verified**: Sequence 8 (`01a06bb6-8a20-7820-a072-d9b54490bbbe`)
  read back public `main` commit `e2df22aa36b3014b7ae88fe7dc46c97809469c11`
  and the successful GitHub Actions checks on Node.js 20 and 24.
* **Local candidate ready**: Sequence 7 (`01a06baf-2907-7264-8387-009f0e0767c6`)
  observed 30 of 30 tests passing after identity joins and responsive-width
  hardening, then moved the project to `local_candidate_ready`. At that point,
  public WebMCP discovery and execution were still unmeasured.
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
