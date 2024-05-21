/**
 * @typedef {object} TestPeggyOptions
 * @prop {boolean} [noDelete] Do not delete the generated file.
 * @prop {boolean} [noMap] Do not add a sourcemap to the generated file.
 *   Defaults to true if peggy$debugger is set on any start, otherwise false.
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
export function testPeggy<T>(grammarUrl: URL | string, starts: PeggyTestOptions<T>[], opts?: TestPeggyOptions | undefined): Promise<TestCounts>;
export type TestCounts = {
    valid: number;
    invalid: number;
    grammarPath: string;
    modifiedPath: string;
};
export type ExtraParserOptions = {
    /**
     * In the augmented code only, use this
     * function as the start rule rather than the default.  This gives access
     * to functions that are NOT valid start rules for internal testing.
     */
    peg$startRuleFunction?: string | undefined;
};
export type PeggyTestOptions<T> = {
    /**
     * Which valid start rule to use?  Default: grammar
     * default start rule.
     */
    startRule?: string | undefined;
    /**
     * If specified, check this against the startRule.
     */
    validInput?: string | undefined;
    /**
     * What result should startRule return for validInput?
     * Default: validInput.
     */
    validResult?: T | ((res: T) => any) | undefined;
    /**
     * If specified, ensure that the grammar fails
     * on this input.
     */
    invalidInput?: string | undefined;
    /**
     * Expected peg$maxFailPos.
     */
    peg$maxFailPos?: number | undefined;
    /**
     * What to append to validInput to make it
     * invalid, so that library mode will return a prefix match.
     */
    invalid?: string | undefined;
    /**
     * Extra options to pass to parse(), overriding whatever else this library
     * would have otherwise used.
     */
    options?: (import("peggy").ParserOptions & ExtraParserOptions) | undefined;
};
/**
 * See https://github.com/peggyjs/peggy/issues/512
 */
export type Parser = import('peggy').Parser & {
    StartRules: string[];
};
export type Location = import('peggy').Location;
export type TestPeggyOptions = {
    /**
     * Do not delete the generated file.
     */
    noDelete?: boolean | undefined;
    /**
     * Do not add a sourcemap to the generated file.
     * Defaults to true if peggy$debugger is set on any start, otherwise false.
     */
    noMap?: boolean | undefined;
    /**
     * Do not generate a file, only run tests on the
     * original.
     */
    noGenerate?: boolean | undefined;
    /**
     * Do not run tests on the original code, only
     * on the generated code.
     */
    noOriginal?: boolean | undefined;
};
