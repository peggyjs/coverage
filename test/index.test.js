import { deepEqual, equal, rejects } from "node:assert";
import test from "node:test";
import { testPeggy } from "../lib/index.js";

function cleanCounts(counts) {
  equal(typeof counts.grammarPath, "string");
  delete counts.grammarPath;
  equal(typeof counts.modifiedPath, "string");
  delete counts.modifiedPath;
}

test("test peggy coverage", async() => {
  const counts = await testPeggy(new URL("minimal.js", import.meta.url), [
    {
      validInput: "foo",
      invalidInput: "",
    },
    {
      startRule: "foo",
      validInput: "\nfoo",
      validResult: "foo",
      invalidInput: "",
      peg$maxFailPos: 1,
    },
    {
      validInput: "   foo",
      validResult: "foo",
      invalidInput: " fo",
      peg$maxFailPos: 3,
    },
    {
      validInput: "afoa",
      validResult: "foa",
      peg$maxFailPos: 1,
    },
    {
      invalidInput: "ccc",
      options: {
        peg$silentFails: -1,
      },
    },
    {
      validInput: "a",
      validResult(r) {
        return r;
      },
      peg$maxFailPos: 1,
      options: {
        peg$startRuleFunction: "peg$parseinit",
      },
    },
    {
      validInput: "aa",
      validResult: ["a", "a"],
      peg$maxFailPos: 2,
      options: {
        peg$startRuleFunction: "peg$parseinit",
      },
    },
  ]);

  cleanCounts(counts);
  deepEqual(counts, {
    valid: 10,
    invalid: 8,
  });
});

test("noGenerate", async() => {
  const counts = await testPeggy(new URL("minimal.js", import.meta.url), [
    {
      validInput: "foo",
      invalidInput: "",
    },
  ], {
    noGenerate: true,
  });

  cleanCounts(counts);
  deepEqual(counts, {
    valid: 1,
    invalid: 1,
  });
});

test("noMap", async() => {
  const counts = await testPeggy(new URL("minimal.js", import.meta.url), [
    {
      validInput: "foo",
      invalidInput: "",
    },
  ], {
    noMap: true,
  });

  cleanCounts(counts);
  deepEqual(counts, {
    valid: 2,
    invalid: 2,
  });
});

test("edges", async() => {
  await rejects(() => testPeggy(), TypeError);
});
