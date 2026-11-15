import sys
import pytest

CONTRACT = "contracts/recall_lantern.py"
REG = "https://regulator.example.gov/recalls/kettle"
MAKER = "https://maker.example.com/safety/kettle"


def open_case(contract):
    return contract.open_case("kettle-24", "Electric kettle", "Northstar", "K200", "LOT-24A", REG, MAKER)


def patch_now(contract, monkeypatch, callback):
    instance = object.__getattribute__(contract, "_instance")
    monkeypatch.setattr(sys.modules[instance.__class__.__module__], "_now", callback)


def result(verdict="MATCH"):
    if verdict == "MATCH":
        return {"verdict": "MATCH", "hazard": 84, "matched_fields": ["PRODUCT", "BRAND", "MODEL", "LOT"], "action": "STOP_USE", "summary": "The exact model and production lot appear in both authoritative recall notices.", "evidence": [{"source_index": 0, "quote": "Northstar K200 LOT-24A"}], "source_receipts": [{"source_index": 0, "url": REG, "host": "regulator.example.gov", "available": True, "sha256": "a" * 64}, {"source_index": 1, "url": MAKER, "host": "maker.example.com", "available": True, "sha256": "b" * 64}]}
    return {"verdict": verdict, "hazard": 0, "matched_fields": [], "action": "MONITOR", "summary": "The available notices do not support a safe exact match for this supplied item.", "evidence": [], "source_receipts": []}


def test_open_normalizes_identity_and_rejects_duplicate_id(direct_deploy):
    contract = direct_deploy(CONTRACT)
    assert open_case(contract) == "kettle-24"
    with pytest.raises(Exception):
        open_case(contract)


def test_sources_must_be_https_and_independent(direct_deploy):
    contract = direct_deploy(CONTRACT)
    with pytest.raises(Exception):
        contract.open_case("bad-http", "Kettle", "Northstar", "K200", "24A", "http://regulator.test/a", MAKER)
    with pytest.raises(Exception):
        contract.open_case("same-host", "Kettle", "Northstar", "K200", "24A", "https://same.test/a", "https://same.test/b")


def test_assessment_stores_consensus_result_and_appeal_window(direct_deploy, monkeypatch):
    contract = direct_deploy(CONTRACT); open_case(contract)
    monkeypatch.setattr(contract, "_judge", lambda *args: result())
    patch_now(contract, monkeypatch, lambda: 1000)
    assessed = contract.assess_case("kettle-24")
    state = contract.get_case("kettle-24")
    assert assessed["verdict"] == "MATCH"
    assert state["status"] == "ASSESSED" and state["appeal_deadline"] == 87400


def test_assessment_cannot_be_replayed(direct_deploy, monkeypatch):
    contract = direct_deploy(CONTRACT); open_case(contract)
    monkeypatch.setattr(contract, "_judge", lambda *args: result())
    contract.assess_case("kettle-24")
    with pytest.raises(Exception):
        contract.assess_case("kettle-24")


def test_only_owner_may_challenge(direct_vm, direct_deploy, direct_alice, monkeypatch):
    contract = direct_deploy(CONTRACT); open_case(contract)
    monkeypatch.setattr(contract, "_judge", lambda *args: result())
    patch_now(contract, monkeypatch, lambda: 1000)
    contract.assess_case("kettle-24")
    direct_vm.sender = direct_alice
    with pytest.raises(Exception):
        contract.challenge_case("kettle-24", "https://consumer.example.org/notice", "This authority names the exact production lot in a correction notice.")


def test_challenge_requires_new_authority_and_is_single_use(direct_deploy, monkeypatch):
    contract = direct_deploy(CONTRACT); open_case(contract)
    queue = [result(), result("UNCERTAIN")]
    monkeypatch.setattr(contract, "_judge", lambda *args: queue.pop(0))
    patch_now(contract, monkeypatch, lambda: 1000)
    contract.assess_case("kettle-24")
    with pytest.raises(Exception):
        contract.challenge_case("kettle-24", "https://maker.example.com/correction", "The maker issued a correction that changes the affected lot range.")
    resolved = contract.challenge_case("kettle-24", "https://consumer.example.org/correction", "A separate consumer authority published a correction to the lot range.")
    assert resolved["verdict"] == "UNCERTAIN"
    with pytest.raises(Exception):
        contract.challenge_case("kettle-24", "https://third.example.net/a", "A second challenge must never overwrite the resolved assessment.")


def test_expired_challenge_is_rejected(direct_deploy, monkeypatch):
    contract = direct_deploy(CONTRACT); open_case(contract)
    monkeypatch.setattr(contract, "_judge", lambda *args: result())
    clock = {"now": 1000}; patch_now(contract, monkeypatch, lambda: clock["now"])
    contract.assess_case("kettle-24"); clock["now"] = 90000
    with pytest.raises(Exception):
        contract.challenge_case("kettle-24", "https://consumer.example.org/correction", "This challenge arrives after the protected review period has ended.")


def test_outsider_cannot_finalize_during_window_but_can_after(direct_vm, direct_deploy, direct_alice, monkeypatch):
    contract = direct_deploy(CONTRACT); open_case(contract)
    monkeypatch.setattr(contract, "_judge", lambda *args: result())
    clock = {"now": 1000}; patch_now(contract, monkeypatch, lambda: clock["now"])
    contract.assess_case("kettle-24"); direct_vm.sender = direct_alice
    with pytest.raises(Exception):
        contract.finalize_case("kettle-24")
    clock["now"] = 90000
    assert contract.finalize_case("kettle-24")["status"] == "FINAL"


def test_owner_can_accept_early_and_final_is_immutable(direct_deploy, monkeypatch):
    contract = direct_deploy(CONTRACT); open_case(contract)
    monkeypatch.setattr(contract, "_judge", lambda *args: result())
    patch_now(contract, monkeypatch, lambda: 1000)
    contract.assess_case("kettle-24")
    final = contract.finalize_case("kettle-24")
    assert len(final["receipt"]) == 64
    with pytest.raises(Exception):
        contract.finalize_case("kettle-24")


def test_challenged_case_is_permissionlessly_finalizable(direct_vm, direct_deploy, direct_alice, monkeypatch):
    contract = direct_deploy(CONTRACT); open_case(contract); owner = direct_vm.sender
    queue = [result(), result("UNCERTAIN")]
    monkeypatch.setattr(contract, "_judge", lambda *args: queue.pop(0))
    patch_now(contract, monkeypatch, lambda: 1000)
    contract.assess_case("kettle-24")
    contract.challenge_case("kettle-24", "https://consumer.example.org/correction", "A separate authority narrows the affected production lot range.")
    direct_vm.sender = direct_alice
    final = contract.finalize_case("kettle-24")
    assert final["assessment"]["verdict"] == "UNCERTAIN"
    assert contract.get_case("kettle-24")["history"][0]["verdict"] == "MATCH"


def test_normalizer_accepts_distinct_quotes_from_the_same_source(direct_deploy):
    contract = direct_deploy(CONTRACT)
    instance = object.__getattribute__(contract, "_instance")
    normalize = sys.modules[instance.__class__.__module__]._normalize
    content = "Northstar K200 LOT-24A is recalled. Stop using the kettle immediately."
    fetched = [
        {"source_index": 0, "url": REG, "host": "regulator.example.gov", "available": True, "content": content, "sha256": "a" * 64},
        {"source_index": 1, "url": MAKER, "host": "maker.example.com", "available": True, "content": "Northstar confirms the K200 LOT-24A recall.", "sha256": "b" * 64},
    ]
    raw = {"verdict": "MATCH", "hazard": 84, "matched_fields": ["PRODUCT", "BRAND", "MODEL", "LOT"], "action": "STOP_USE", "summary": "Both authorities identify the exact product model and lot as recalled.", "evidence": [{"source_index": 0, "quote": "Northstar K200 LOT-24A is recalled."}, {"source_index": 0, "quote": "Stop using the kettle immediately."}]}
    assert len(normalize(raw, fetched)["evidence"]) == 2
