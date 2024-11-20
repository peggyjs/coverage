import { deepEqual, equal, rejects } from "node:assert";
import test from "node:test";
import { testPeggy } from "../lib/index.js";

const MIN = new URL("minimal.js", import.meta.url);

function cleanCounts(counts) {
  equal(typeof counts.grammarPath, "string");
  delete counts.grammarPath;
  equal(typeof counts.modifiedPath, "string");
  delete counts.modifiedPath;
}

test("test peggy coverage", async() => {
  const counts = await testPeggy(MIN, [
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
    {
      invalidInput: "aa",
      options: {
        peg$failAfter: {
          peg$parseinit: 1,
        },
      },
    },
    {
      validInput: "aa",
      validResult: ["a", "a"],
      options: {
        peg$startRuleFunction: "peg$parseinit",
      },
    },
    // { // Replace original functions when done.
    //   validInput: "aaa",
    //   validResult: ["a", "a", "a"],
    // },
  ]);

  cleanCounts(counts);
  deepEqual(counts, {
    valid: 11,
    invalid: 9,
  });
});

test("noGenerate", async() => {
  const counts = await testPeggy(MIN, [
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
  const counts = await testPeggy(MIN, [
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

test("skip", async() => {
  const counts = await testPeggy(MIN, [
    {
      validInput: "foo",
    },
    {
      validInput: "",
      skip: true,
    },
  ]);

  cleanCounts(counts);
  deepEqual(counts, {
    valid: 2,
    invalid: 0,
  });
});

test("skip", async() => {
  const counts = await testPeggy(MIN, [
    {
      validInput: "foo",
      only: true,
    },
    {
      validInput: "",
    },
  ]);

  cleanCounts(counts);
  deepEqual(counts, {
    valid: 2,
    invalid: 0,
  });
});

test("thows errors", async() => {
  await rejects(() => testPeggy(MIN, [
    {
      validInput: "",
    },
  ]));

  await rejects(() => testPeggy(MIN, [
    {
      validInput: "",
      validResult: undefined,
      options: {
        peg$startRuleFunction: "peg$parsenot_lib",
      },
    },
  ], {
    noOriginal: true,
  }));

  await rejects(() => testPeggy(MIN, [
    {
      invalidInput: "foo",
    },
  ]));
});
