import {
  deepEqual,
  equal,
  fail,
  ok,
  throws,
} from "node:assert/strict";
import { SourceNode } from "source-map-generator";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";

const INVALID = "\uffff";

/**
 * @template T
 * @typedef {object} PeggyTestOptions
 * @prop {string} [startRule]
 * @prop {string} [validInput]
 * @prop {T} [validResult]
 * @prop {string} [invalidInput]
 * @prop {number} [offset = 0]
 * @prop {import('peggy').ParserOptions} [options = {}]
 */

/**
 * @typedef {import('peggy').Parser & { StartRules: string[]}} Parser
 */

/**
 * @typedef {import('peggy').Location} Location
 */

/**
 * @template T
 * @param {Parser} grammar
 * @param {PeggyTestOptions<T>[]} starts
 * @param {boolean} modified
 */
function checkParserStarts(grammar, starts, modified) {
  for (const start of starts) {
    const startRule = start.startRule || undefined;  // NOT `??`
    const offset = start.offset ?? 0;
    const options = start.options ?? {};
    if (!modified && options.peg$startRuleFunction) {
      continue;
    }
    if (typeof start.validInput === "string") {
      const expected = start.validResult ?? start.validInput;

      let res = grammar.parse(start.validInput, { startRule, ...options });
      if (typeof expected === "string") {
        equal(res, expected);
      } else if (typeof expected === "function") {
        res = expected(res);
      } else {
        deepEqual(res, expected);
      }

      const expectedLib = {
        peg$result: res,
        peg$currPos: start.validInput.length,
        peg$FAILED: {},
        peg$maxFailPos: offset,
      };
      let lib = grammar.parse(start.validInput, {
        peg$library: true,
        startRule,
        ...options,
      });
      delete lib.peg$maxFailExpected;
      if (typeof expected === "function") {
        lib.peg$result = expected(lib.peg$result);
      }
      deepEqual(lib, expectedLib);

      lib = grammar.parse(start.validInput + INVALID, {
        peg$library: true,
        startRule,
        ...options,
      });
      delete lib.peg$maxFailExpected;
      if (typeof expected === "function") {
        lib.peg$result = expected(lib.peg$result);
      }
      deepEqual(lib, expectedLib);

      throws(() => grammar.parse(start.validInput + INVALID, {
        startRule,
        ...options,
      }));
    }

    if (typeof start.invalidInput === "string") {
      throws(
        // @ts-expect-error CFA should be able to tell invalidInput is string
        () => grammar.parse(start.invalidInput),
        `used invalidInput: "${start.invalidInput}"`
      );

      try {
        grammar.parse(start.invalidInput, {
          grammarSource: "test",
          ...options,
        });
        fail("Cannot reach here");
      } catch (er) {
        ok(er instanceof grammar.SyntaxError);
        equal(typeof er.format, "function");
        let fmt = er.format([{ source: "test", text: start.invalidInput }]);
        equal(typeof fmt, "string");
        fmt = er.format([]);
        equal(typeof fmt, "string");
      }

      const grammarSource = {
        /**
         * @param {Location} range
         * @returns {Location}
         */
        offset(range) {
          return range;
        },
      };
      try {
        grammar.parse(start.invalidInput, {
          grammarSource,
          ...options,
        });
        fail("Cannot reach here");
      } catch (er) {
        ok(er instanceof grammar.SyntaxError);
        equal(typeof er.format, "function");
        const fmt = er.format([{
          source: grammarSource,
          text: start.invalidInput,
        }]);
        equal(typeof fmt, "string");
      }
    }
  }
}

/**
 * Test the basic functionality of a Peggy grammar, to make coverage easier.
 *
 * @template T
 * @param {URL | string} grammarUrl
 * @param {PeggyTestOptions<T>[]} starts
 */
export async function testPeggy(grammarUrl, starts) {
  let grammarPath = String(grammarUrl);
  if (grammarPath.startsWith("file:")) {
    grammarPath = fileURLToPath(grammarPath);
  }
  const grammar = /** @type {Parser} */ (
    await import(grammarPath)
  );
  // @ts-ignore
  ok(grammar);
  ok(grammar.parse);
  ok(typeof grammar.parse, "function");
  ok(grammar.StartRules);
  ok(Array.isArray(grammar.StartRules));
  ok(grammar.StartRules.length > 0);
  ok(grammar.SyntaxError);
  equal(typeof grammar.SyntaxError, "function");

  // @ts-expect-error null is not valid input
  throws(() => grammar.parse(null));
  throws(() => grammar.parse("", {
    startRule: "__ INVALID __",
  }));

  for (const startRule of grammar.StartRules) {
    // @ts-expect-error null is not valid input
    throws(() => grammar.parse(null, {
      startRule,
    }));
  }
  checkParserStarts(grammar, starts, false);

  const grammarJs = await fs.readFile(grammarPath, "utf8");
  ok(grammarJs);
  equal(typeof grammarJs, "string");

  const src = new SourceNode();
  let lineNum = 1;
  for (const line of grammarJs.split(/(?<=\n)/)) {
    if (/^\s*peg\$result = peg\$startRuleFunction\(\);/.test(line)) {
      src.add(`\
  (() => {
    // Inserted by @peggyjs/coverage
    if (options.peg$startRuleFunction) {
      peg$startRuleFunction = eval(options.peg$startRuleFunction); // Ew.
    }

    text();
    offset();
    range();

    // Check cache
    const loc = location();
    try {
      error('generated error');
    } catch (_ignored) {
    }
    try {
      error('generated error', loc);
    } catch (_ignored) {
    }
    try {
      expected('generated error');
    } catch (_ignored) {
    }
    try {
      expected('generated error', loc);
    } catch (_ignored) {
    }
    peg$computeLocation(0, input.length, true);

    const err = peg$buildStructuredError([
      { type: 'other', description: 'one' },
    ], "a", {
      source: 'source',
      start: {
        offset: 0,
        line: 1,
        column: 1,
      },
      end: {
        offset: 3,
        line: 2,
        column: 2
      }
    });
    err.format([{ source: 'source', text: 'a\\nb' }]);

    peg$buildStructuredError([
      { type: 'other', description: 'one' },
      { type: 'any' },
    ], "", loc);

    peg$buildStructuredError([
        { type: 'other', description: 'one' },
        { type: 'any' },
        { type: 'literal', text: 'b', ignoreCase: false },
        { type: 'literal', text: 'b', ignoreCase: true },
        {
          type: 'class',
          parts: [ [ 'a', 'b' ], '\x7f' ],
          inverted: true,
          ignoreCase: false
        },
        {
          type: 'class',
          parts: [ 'a' ],
          inverted: false,
          ignoreCase: false
        },
      ], "", loc);
    peg$padEnd("foo", 2);
    const oldMax = peg$maxFailPos;
    peg$maxFailPos = Infinity;
    peg$fail();
    peg$maxFailPos = oldMax;
  })();

`);
    }
    src.add(new SourceNode(lineNum++, 0, grammarPath, line));
  }

  const withMap = src.toStringWithSourceMap();
  const map = Buffer.from(withMap.map.toString()).toString("base64");
  const code = withMap.code + `
//# sourceMappingURL=data:application/json;charset=utf-8;base64,${map}
`;

  // Can't use @peggyjs/from-mem since c8 can't see into those modules for
  // coverage.  Maybe file a bug on c8? Given that, the modified file MUST be
  // written to the same directory, with the same file name, so that `import`
  // or `require` of relative paths or npm modules will work as expected.
  const gp = path.parse(grammarPath);
  // @ts-expect-error This TS error is bogus.
  delete gp.base;
  gp.name += `___TEST-${process.pid}`;
  const modifiedPath = path.format(gp);

  await fs.writeFile(modifiedPath, code);

  const agrammar = /** @type {Parser} */ (
    await import(modifiedPath)
  );
  ok(agrammar);
  checkParserStarts(agrammar, starts, true);
  await fs.rm(modifiedPath);
}
