import {
  deepEqual,
  equal,
  fail,
  ok,
  throws,
} from "node:assert/strict";
import { SourceNode } from "source-map-generator";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const INVALID = "\uffff";

/**
 * @template T
 * @typedef {object} PeggyTestOptions
 * @prop {string} [startRule]
 * @prop {string} [validInput]
 * @prop {T} [validResult]
 * @prop {string} [invalidInput]
 * @prop {number} [offset = 0]
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
 */
function checkParserStarts(grammar, starts) {
  for (const start of starts) {
    const startRule = start.startRule || undefined;  // NOT `??`
    const offset = start.offset ?? 0;
    if (typeof start.validInput === "string") {
      const expected = start.validResult ?? start.validInput;
      ok(typeof expected === "string");
      equal(grammar.parse(start.validInput, { startRule }), expected);

      let lib = grammar.parse(start.validInput, {
        peg$library: true,
        startRule,
      });
      const expectedLib = {
        peg$result: expected,
        peg$currPos: expected.length + offset,
        peg$FAILED: {},
        peg$maxFailPos: offset,
      };
      // @ts-expect-error ignore this for testing
      delete lib.peg$maxFailExpected;
      deepEqual(lib, expectedLib);

      lib = grammar.parse(start.validInput + INVALID, {
        peg$library: true,
        startRule,
      });
      // @ts-expect-error ignore this for testing
      delete lib.peg$maxFailExpected;
      deepEqual(lib, expectedLib);

      throws(() => grammar.parse(start.validInput + INVALID));
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
  const gus = String(grammarUrl);
  const grammar = /** @type {Parser} */ (
    await import(gus)
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
  // @ts-expect-error null is not valid startRule
  throws(() => grammar.parse("", {
    startRule: null,
  }));
  throws(() => grammar.parse("", {
    startRule: undefined,
  }));
  throws(() => grammar.parse("", {
    startRule: "",
  }));
  throws(() => grammar.parse("", {
    startRule: "__ INVALID __",
  }));

  for (const startRule of grammar.StartRules) {
    // @ts-expect-error null is not valid input
    throws(() => grammar.parse(null, {
      startRule,
    }));
  }
  checkParserStarts(grammar, starts);

  const grammarJs = await fs.promises.readFile(grammarUrl, "utf8");
  ok(grammarJs);
  equal(typeof grammarJs, "string");
  const m = grammarJs.match(/^\s*peg\$result = peg\$startRuleFunction\(\);/m);
  ok(m);

  const gusp = fileURLToPath(gus);
  const tus = gus.replace(/(\.[mc]?js)$/, `___TEST___${process.pid}___TEST___$1`);
  const tusp = fileURLToPath(tus);

  const src = new SourceNode();
  let lineNum = 1;
  for (const line of grammarJs.split(/(?<=\n)/)) {
    if (/^\s*peg\$result = peg\$startRuleFunction\(\);/.test(line)) {
      src.add(`\
  (() => {
    // Inserted by @peggyjs/coverage
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

    peg$buildStructuredError([
        { type: 'other', description: 'one' },
        {
          type: 'class',
          parts: [ [ 'a', 'b' ], '\x7F' ],
          inverted: true,
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
    src.add(new SourceNode(lineNum++, 0, gusp, line));
  }

  const withMap = src.toStringWithSourceMap();
  const map = Buffer.from(withMap.map.toString()).toString("base64");
  const code = withMap.code + `
//# sourceMappingURL=data:application/json;charset=utf-8;base64,${map}
  `;
  await fs.promises.writeFile(tusp, code);

  const agrammar = /** @type {Parser} */ (
    await import(tus)
  );
  ok(agrammar);
  checkParserStarts(agrammar, starts);
  await fs.promises.rm(tusp);
}
