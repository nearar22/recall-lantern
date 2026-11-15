import test from"node:test";import assert from"node:assert/strict";import{clean,short,verdictTone,remaining,canChallenge}from"../src/model.mjs";
test("cleans bigint values recursively",()=>assert.deepEqual(clean({x:2n,a:[1n]}),{x:2,a:[1]}));
test("maps verdicts to distinct signals",()=>{assert.equal(verdictTone("MATCH"),"danger");assert.equal(verdictTone("SOURCE_UNAVAILABLE"),"offline")});
test("appeal requires owner, state, and time",()=>{const r={status:"ASSESSED",challenge_used:false,owner:"0xAb",appeal_deadline:200};assert.equal(canChallenge(r,"0xab",100),true);assert.equal(canChallenge(r,"0xcd",100),false);assert.equal(canChallenge(r,"0xab",201),false)});
test("formats bounded identity and time",()=>{assert.equal(short("1234567890123456",4),"1234…3456");assert.equal(remaining(3700,100),"1h 00m")});
