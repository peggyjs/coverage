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
let counter = 0;

/**
 * @typedef {object} TestCounts
 * @prop {number} valid
 * @prop {number} invalid
 * @prop {string} grammarPath
 * @prop {string} modifiedPath
 */

/**
 * @typedef {object} ExtraParserOptions
 * @prop {string} [peg$startRuleFunction] In the augmented code only, use this
 *   function as the start rule rather than the default.  This gives access
 *   to functions that are NOT valid start rules for internal testing.
 * @prop {{[ruleName: string]: number}} [peg$failAfter] Number of times for each of the
 *   given rules to succeed before they fail.  Only applies in the augmented
 *   code.
 */

/**
 * @template T
 * @typedef {object} PeggyTestOptions
 * @prop {string} [startRule] Which valid start rule to use?  Default: grammar
 *   default start rule.
 * @prop {string} [validInput] If specified, check this against the startRule.
 * @prop {T|((res: T) => any)} [validResult] What result should startRule return for validInput?
 *   Default: validInput.
 * @prop {string} [invalidInput] If specified, ensure that the grammar fails
 *   on this input.
 * @prop {number} [peg$maxFailPos = 0] Expected peg$maxFailPos.
 * @prop {string} [invalid = "\uffff"] What to append to validInput to make it
 *   invalid, so that library mode will return a prefix match.
 * @prop {boolean} [only] If any test has this set to true, only run the
 *   tests with this set to true.
 * @prop {boolean} [skip] If true, skip this test.
 * @prop {import('peggy').ParserOptions & ExtraParserOptions} [options = {}]
 *   Extra options to pass to parse(), overriding whatever else this library
 *   would have otherwise used.
 */

/**
 * See https://github.com/peggyjs/peggy/issues/512
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
 * @param {TestCounts} counts
 */
function checkParserStarts(grammar, starts, modified, counts) {
  let count = 0;
  const M = modified ? "M_" : "U_";
  const only = starts.some(s => s.only);
  for (const start of starts) {
    let source = `${M}valid_${count++}`;
    const startRule = start.startRule || undefined;  // NOT `??`
    const peg$maxFailPos = start.peg$maxFailPos ?? undefined;
    const options = start.options ?? Object.create(null);
    const invalid = start.invalid ?? INVALID;
    if (start.skip || (only && !start.only)) {
      continue;
    }
    if (!modified) {
      if (options.peg$startRuleFunction || options.peg$failAfter) {
        continue;
      }
    }
    if (typeof start.validInput === "string") {
      // Note: validResult might be specified as undefined.
      const expected = Object.prototype.hasOwnProperty.call(start, "validResult")
        ? start.validResult
        : start.validInput;

      // eslint-disable-next-line no-useless-assignment
      let res = undefined;
      try {
        res = grammar.parse(start.validInput, {
          startRule,
          grammarSource: source,
          ...options,
        });
      } catch (er) {
        const e = /** @type {import('peggy').parser.SyntaxError} */ (er);
        e.message = e.format([{ source, text: start.validInput }]);
        throw e;
      }
      if (typeof expected === "string") {
        equal(res, expected, `${source} (eq): "${start.validInput}"`);
      } else if (typeof expected === "function") {
        // @ts-expect-error Can't figure this out
        res = expected(res);
      } else {
        deepEqual(res, expected, `${source} (dp_eq): "${start.validInput}"`);
      }

      const expectedLib = {
        peg$result: res,
        peg$currPos: start.validInput.length,
        peg$FAILED: {},
        peg$maxFailPos,
      };
      if (peg$maxFailPos === undefined) {
        delete expectedLib.peg$maxFailPos;
      }
      source = `${M}valid_library_${count}`;
      // No exception in library mode
      let lib = grammar.parse(start.validInput, {
        peg$library: true,
        startRule,
        grammarSource: source,
        ...options,
      });
      if (lib.peg$result === lib.peg$FAILED) {
        throw new Error(`Failed in library context: ${source}`);
      }

      // @ts-expect-error This is for testing.
      delete lib.peg$maxFailExpected;
      if (peg$maxFailPos === undefined) {
        // @ts-expect-error This is for testing.
        delete lib.peg$maxFailPos;
      }

      if (typeof expected === "function") {
        // @ts-ignore
        lib.peg$result = expected(lib.peg$result);
      }
      deepEqual(lib, expectedLib, `${source} (dp_eq): "${start.validInput}"`);

      if (invalid) {
        source = `${M}valid+_${count}`;
        lib = grammar.parse(start.validInput + invalid, {
          peg$library: true,
          startRule,
          grammarSource: source,
          ...options,
        });

        // @ts-expect-error This is for testing.
        delete lib.peg$maxFailExpected;
        if (peg$maxFailPos === undefined) {
          // @ts-expect-error This is for testing.
          delete lib.peg$maxFailPos;
        }
        if (typeof expected === "function") {
          // @ts-ignore
          lib.peg$result = expected(lib.peg$result);
        }
        deepEqual(lib, expectedLib, `${source} (dp_eq): "${start.validInput}"`);

        throws(() => grammar.parse(start.validInput + invalid, {
          startRule,
          ...options,
        }));
      }
      counts.valid++;
    }

    if (typeof start.invalidInput === "string") {
      try {
        grammar.parse(start.invalidInput, {
          grammarSource: "test",
          startRule,
          ...options,
        });
        fail(`Expected error but none received for invalidInput: "${start.invalidInput}"`);
      } catch (er) {
        if (!(er instanceof grammar.SyntaxError)) {
          throw er;
        }
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
      counts.invalid++;
    }
  }
}

/**
 * @typedef {object} TestPeggyOptions
 * @prop {boolean} [noDelete] Do not delete the generated file.
 * @prop {boolean} [noMap] Do not add a sourcemap to the generated file.
 *   Defaults to true if peg$debugger is set on any start, otherwise false.
 * @prop {boolean} [noGenerate] Do not generate a file, only run tests on the
 *   original.
 * @prop {boolean} [noOriginal] Do not run tests on the original code, only
 *   on the generated code.
 */

/**
 * Test the basic functionality of a Peggy grammar, to make coverage easier.
 *
 * @template T
 * @param {URL | string} grammarUrl The file name for the compiled grammar.
 * @param {PeggyTestOptions<T>[]} starts List of tests.  Ensure you have at
 *   least one validInput and at least one invalidInput.
 * @param {TestPeggyOptions} [opts] Options for processing.
 * @returns {Promise<TestCounts>}
 */
export async function testPeggy(grammarUrl, starts, opts) {
  if (!(typeof grammarUrl === "string") && !(grammarUrl instanceof URL)) {
    throw new TypeError("Invalid grammarUrl");
  }

  let grammarPath = String(grammarUrl);
  if (grammarPath.startsWith("file:")) {
    grammarPath = fileURLToPath(grammarPath);
  }

  // Can't use @peggyjs/from-mem since c8 can't see into those modules for
  // coverage.  Maybe file a bug on c8? Given that, the modified file MUST be
  // written to the same directory, with the same file name, so that `import`
  // or `require` of relative paths or npm modules will work as expected.
  const gp = path.parse(grammarPath);
  // @ts-expect-error This TS error is bogus.
  delete gp.base;
  gp.name += `___TEST-${process.pid}-${counter++}`;
  const modifiedPath = path.format(gp);

  /** @type {TestCounts} */
  const counts = {
    valid: 0,
    invalid: 0,
    grammarPath,
    modifiedPath,
  };

  if (!opts?.noOriginal) {
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
    checkParserStarts(grammar, starts, false, counts);
  }

  if (!opts?.noGenerate) {
    const grammarJs = await fs.readFile(grammarPath, "utf8");
    ok(grammarJs);
    equal(typeof grammarJs, "string");

    // Approach: generate a new file next to the existing grammar file, with
    // test code injected just before the parser runs.  Source map information
    // embedded in the new file will make coverage show up on the original file.
    const src = new SourceNode();
    let lineNum = 1;
    for (const line of grammarJs.split(/(?<=\n)/)) {
      if (/^\s*peg\$result = peg\$startRuleFunction\(\);/.test(line)) {
        src.add(`\
  //#region Inserted by @peggyjs/coverage
  let replacements = Object.create(null);
  (() => {
    if (options.peg$debugger) {
      debugger;
    }
    if (options.peg$startRuleFunction) {
      peg$startRuleFunction = eval(options.peg$startRuleFunction); // Ew.
    }
    if (options.peg$failAfter) {
      for (const [name, count] of Object.entries(options.peg$failAfter)) {
        const fn = eval(name); // Ew, again.
        replacements[name] = fn;
        if (typeof fn !== 'function') {
          throw new Error('Unknown function for peg$failAfter: ' + name);
        }
        let remains = count;
        const replace = name + \` = (...args) => {
          if (remains-- > 0) {
            return fn.call(this, ...args)
          }
          return peg$FAILED;
        }\`;
        eval(replace); // We've already called eval twice.  What's one more?
      }
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
      peg$otherExpectation('one'),
      peg$anyExpectation(),
    ], "", loc);

    peg$buildStructuredError([
        peg$literalExpectation('b', false),
        peg$literalExpectation('b', true),
        peg$classExpectation([ [ 'a', 'b' ], '\\x7f' ], true, false),
        peg$classExpectation([ 'a' ], false, false),
        peg$anyExpectation(),
        peg$endExpectation(),
        peg$otherExpectation('one'),
      ], "", loc);
    peg$padEnd("foo", 2);
    const oldMax = peg$maxFailPos;
    peg$maxFailPos = Infinity;
    peg$fail();
    peg$maxFailPos = oldMax;
  })();
  //#endregion

`);
        src.add(new SourceNode(lineNum++, 0, grammarPath, line));
        src.add(`
  //#region Inserted by @peggyjs/coverage
  for (const [name, orig] of Object.entries(replacements)) {
    eval(name + '= orig');
  }
  replacements = Object.create(null);
  //#endregion
`);
      } else {
        src.add(new SourceNode(lineNum++, 0, grammarPath, line));
      }
    }

    const withMap = src.toStringWithSourceMap();
    const map = Buffer.from(withMap.map.toString()).toString("base64");
    let code = withMap.code;
    let sm = starts.every(s => !s.options?.peg$debugger);
    if (opts && Object.prototype.hasOwnProperty.call(opts, "noMap")) {
      sm = !opts.noMap;
    } else {
      if (!sm) {
        console.error("WARNING: sourcemap disabled due to peg$debugger");
      }
    }
    const start = "//#"; // c8: THIS file is not mapped.
    if (sm) {
      code += `
${start} sourceMappingURL=data:application/json;charset=utf-8;base64,${map}
`;
    }
    await fs.writeFile(modifiedPath, code);
    try {
      const agrammar = /** @type {Parser} */ (
        await import(modifiedPath)
      );
      ok(agrammar);
      checkParserStarts(agrammar, starts, true, counts);
    } finally {
      if (!opts?.noDelete) {
        await fs.rm(modifiedPath);
      }
    }
  }
  return counts;
}
