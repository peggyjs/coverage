import { deepEqual, equal, rejects } from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { SourceNode } from "source-map";
import { join } from "node:path";
import test from "node:test";
import { testPeggy } from "../lib/index.js";
import { tmpdir } from "node:os";

const MIN = new URL("minimal.js", import.meta.url);
const tmp = await mkdtemp(join(tmpdir(), "peggyjs-coverage-"));

test.after(async() => {
  await rm(tmp, { recursive: true });
});

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
    total: 20,
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
    total: 2,
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
    total: 4,
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
    total: 2,
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
    total: 2,
  });
});

test("thows errors", async() => {
  await rejects(() => testPeggy(MIN, [
    {
      validInput: "",
    },
  ]), SyntaxError);

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

test("peg$debugger", async() => {
  const old = console.error;
  const stderr = [];
  console.error = (...args) => stderr.push(args);
  await testPeggy(MIN, [
    {
      validInput: "foo",
      options: {
        peg$debugger: true,
      },
    },
  ]);
  console.error = old;
  deepEqual(stderr, [["WARNING: sourcemap disabled due to peg$debugger"]]);
});

test("inputSourceMap", async() => {
  // MIN doesn't have sourcemap
  await testPeggy(MIN, [
    {
      validInput: "foo",
    },
  ], {
    inputSourceMap: true,
  });

  const tmpMin = join(tmp, "minimal.js");
  const src = new SourceNode();
  const tmpTxt = await readFile(MIN, "utf8");
  let lineNum = 1;
  for (const line of tmpTxt.split(/(?<=\n)/)) {
    const sn = new SourceNode(lineNum++, 0, MIN, line);
    src.add(sn);
  }
  const withMap = src.toStringWithSourceMap();
  const map = Buffer.from(withMap.map.toString()).toString("base64");
  const { code } = withMap;
  const START = "//#";
  const codeWithDataMap = code + `
${START} sourceMappingURL=data:application/json;charset=utf-8;base64,${map}
`;
  await writeFile(tmpMin, codeWithDataMap);

  // With data: URL
  await testPeggy(tmpMin, [
    {
      validInput: "foo",
    },
  ], {
    inputSourceMap: true,
  });

  // With file reference
  const codeWithFileMap = code + `
${START} sourceMappingURL=minimal.js.map
`;
  await writeFile(tmpMin, codeWithFileMap);
  const tmpMinMap = join(tmp, "minimal.js.map");
  await writeFile(tmpMinMap, withMap.map.toString());
  await testPeggy(tmpMin, [
    {
      validInput: "foo",
    },
  ], {
    inputSourceMap: true,
  });
});
