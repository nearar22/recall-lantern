# Recall Lantern

**Recall Lantern turns an exact product label into an attributable, challengeable recall decision.** It is a consumer-safety instrument built on GenLayer Studio Next, not a generic chat interface and not a private AI lookup.

The user locks four identity fields — product, brand, model, and lot — to two independent HTTPS authorities: a regulator notice and a manufacturer notice. Validators retrieve those pages themselves, bind every decisive quote to a source index, and settle one of four explicit outcomes:

- `MATCH`: the exact item is covered and a concrete safety action is required;
- `NO_MATCH`: readable notices materially exclude the supplied item;
- `UNCERTAIN`: the evidence is readable but incomplete or conflicting;
- `SOURCE_UNAVAILABLE`: at least one required authority could not be retrieved, so the contract refuses to make a substantive claim.

This repository includes the Intelligent Contract, direct GenVM tests, a wallet-enabled React interface, deployment tooling, and clearly labelled demo fixtures.

## Why decentralized judgment belongs here

A conventional recall checker asks one server or one model to interpret a notice. That creates three hidden trust boundaries: which page was actually read, whether the quoted language exists, and whether a near-match was promoted into an exact match. Recall Lantern makes those boundaries inspectable.

Each validator independently retrieves the same frozen URLs and re-evaluates the same exact label. Consensus must preserve the verdict and action, bind matched fields to the notices, retain indexed quotes, and keep hazard scores within a bounded tolerance. The stored result includes SHA-256 receipts for every fetched page.

## Contract lifecycle

```text
READY
  │ assess_case (permissionless; web + LLM consensus)
  ▼
ASSESSED ── owner accepts ────────────────────────────┐
  │                                                  │
  ├─ owner challenge within 24h, new authority host  │
  │        ▼                                         │
  │    CHALLENGED ── finalize by anyone ─────────────┤
  │                                                  │
  └─ after 24h, finalize by anyone ──────────────────┤
                                                     ▼
                                                   FINAL
```

The original assessment remains in `history` after a challenge. A challenge is single-use, owner-bound, time-bounded, and must introduce a third independent host. After the challenge resolves, any caller may finalize. If the owner disappears without challenging, any caller may finalize after the protected window.

## Source and consensus invariants

- Source URLs must use public HTTPS with no credentials, local hosts, or nonstandard ports.
- Regulator and manufacturer hosts must differ.
- Challenge authority must use a third host.
- Source identifiers are frozen at case creation and preserved by index.
- Every evidence quote must occur verbatim in the cited fetched page.
- Duplicate source indexes and duplicate case IDs are rejected.
- A fetch failure forces `SOURCE_UNAVAILABLE`; it cannot be silently converted into a match.
- A `MATCH` requires at least one supported identity field, bound evidence, a positive hazard, and a concrete action.
- State changes happen only after consensus returns.
- Final records are immutable and include a digest over identity plus assessment.

## Interface: a label inspection bench

The frontend is organized as an industrial field instrument rather than a landing-page form:

1. **Capture label** — edit a physical-tag surface with product, brand, model, lot, barcode, and case ID.
2. **Lock authorities** — place regulator and manufacturer notices into two visibly separate lanes.
3. **Decision signal** — read a signal tower, hazard load, matched identity fields, and required action.
4. **Source receipts** — inspect per-authority host, digest, availability lamp, and exact quotes.
5. **Correction path** — the owner can introduce one third authority during the protected window.

Wallet writes use Transaction Kit RC2 and track through `FINALIZED`. Read paths remain public.

## Local setup

Requirements: Node.js 20+, Python with `pytest` and `gltest`, and a browser wallet for live writes.

```bash
npm install
npm --prefix frontend install
pytest -q
npm --prefix frontend test
npm --prefix frontend run build
```

Copy `frontend/.env.example` to `frontend/.env` and set the deployed address. The frontend targets:

- network: GenLayer Studio Next
- chain ID: `61997`
- RPC: `https://studio-next.genlayer.com/api`

For deployment, copy `.env.example` to `.env`, set `GENLAYER_PRIVATE_KEY`, and run `npm run deploy`. Never commit the private key.

## Test coverage

The direct suite exercises:

- duplicate IDs;
- malformed and same-host sources;
- assessment persistence and replay rejection;
- owner-bound challenges;
- third-authority separation;
- single-use and expired challenges;
- protected-window finalization;
- permissionless completion after the window;
- early owner acceptance;
- challenged-case finalization and history preservation.

Frontend unit tests cover bigint normalization, verdict signals, appeal authorization, label shortening, and countdown display. The production Vite build is also part of the verification gate.

## Demo-fixture boundary

The two files under `frontend/public/demo/` are intentionally fictional and labelled **DEMO FIXTURE — NOT A REAL PRODUCT RECALL**. They demonstrate the source-binding path only. They do not claim to be independent real-world authorities and must never be used as safety advice.

## Failure modes

- A blocked, empty, or too-short page produces `SOURCE_UNAVAILABLE`.
- Similar products and nearby lots are not exact matches.
- Conflicting readable notices produce `UNCERTAIN`, not an invented resolution.
- Wallet rejection, network backpressure, terminal consensus failure, and polling timeout remain visible in the transaction panel.
- The interface distinguishes case state from finality; it refreshes stored state only after the transaction reaches `FINALIZED`.

## Repository map

```text
contracts/recall_lantern.py   Intelligent Contract
tests/                        direct GenVM lifecycle tests
frontend/                     wallet-enabled inspection interface
scripts/deploy.mjs            Studio Next deployment
```

Recall Lantern is advisory. For a real product, follow the regulator and manufacturer directly.

## Reviewed deployment

- Network: GenLayer Studio Next (`61997`)
- Contract: `0x686821D6faacf435b8b0713Fc3d37fE2eA0BE214`
- Deployment transaction: `0x4e0d4b63f1f0b6664da57b40d41ecee0838c84281a0380424ed37f74f58e94eb`
- Reviewed source commit: `454485023daf411daedaf9d28569731dbdd8f25e`
- Deployment result: `FINISHED_WITH_RETURN` / `MAJORITY_AGREE`
