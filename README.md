# @peggyjs/coverage

Up the code coverage on your [Peggy](https://peggyjs.org/) grammars, ensuring
that the generated boilerplate code is covered in your unit tests.  This makes
it easier to find places in your grammar that actually need to be tested.

This library uses a few unsavory hacks to get to pieces of the Peggy boilerplate
that are always included, even thought they aren't used in your particular
grammar or in your configuration.  For example, a few lines of code are only
ever executed if you are in trace mode.

## Installation

```sh
npm install --dev @peggyjs/coverage
```

## API

Full [documentation](https://peggyjs.github.io/coverage/) is available.

Pass in the `file:` URL for the JavaScript output from Peggy:

```js
await testPeggy(new URL("../lib/parser.js", import.meta.url), [
  {
    validInput: "foo",
    validResult: ["f", "o", "o"],
    invalidInput: "bar",
  }
]);
```

The second parameter is an array of tests.  You should include at least one
valid input, and at least one invalid input, but they need not be in the same
test.

Each test definition has the following type:

```ts
export type PeggyTestOptions<T> = {
    /**
     * Which valid start rule to use?  Default: grammar default start rule.
     */
    startRule?: string | undefined;
    /**
     * If specified, check this against the startRule.
     */
    validInput?: string | undefined;
    /**
     * What result should startRule return for validInput? Default:
     * validInput.
     */
    validResult?: T | ((res: T) => any) | undefined;
    /**
     * If specified, ensure that the grammar fails on this input.
     */
    invalidInput?: string | undefined;
    /**
     * Expected peg$maxFailPos.
     */
    peg$maxFailPos?: number | undefined;
    /**
     * What to append to validInput to make it invalid, so that library mode
     * will return a prefix match.
     */
    invalid?: string | undefined;
    /**
     * If any test has this set to true, only run the tests with this set to
     * true.
     */
    only?: boolean | undefined;
    /**
     * If true, skip this test.
     */
    skip?: boolean | undefined;
    /**
     * Extra options to pass to parse(), overriding whatever else this library
     * would have otherwise used.
     */
    options?: (import("peggy").ParserOptions & ExtraParserOptions) | undefined;
};

export type ExtraParserOptions = {
    /**
     * In the augmented code only, use this function as the start rule rather
     * than the default.  This gives access to functions that are NOT valid
     * start rules for internal testing.
     */
    peg$startRuleFunction?: string | undefined;
    /**
     * Number of times for each of the given rules to succeed before they
     * fail.  Only applies in the augmented code.
     */
    peg$failAfter?: {
        [ruleName: string]: number;
    } | undefined;
};
```

## Runtime support

Only tested on nodejs 18, 20, 22, and 23.  Only tested in es6 mode.

---
[![Tests](https://github.com/peggyjs/coverage/actions/workflows/node.js.yml/badge.svg)](https://github.com/peggyjs/coverage/actions/workflows/node.js.yml)
[![codecov](https://codecov.io/gh/peggyjs/coverage/graph/badge.svg?token=KIIAM551FQ)](https://codecov.io/gh/peggyjs/coverage)
