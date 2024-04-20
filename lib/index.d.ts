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
 * Test the basic functionality of a Peggy grammar, to make coverage easier.
 *
 * @template T
 * @param {URL | string} grammarUrl
 * @param {PeggyTestOptions<T>[]} starts
 */
export function testPeggy<T>(grammarUrl: URL | string, starts: PeggyTestOptions<T>[]): Promise<void>;
export type PeggyTestOptions<T> = {
    startRule?: string | undefined;
    validInput?: string | undefined;
    validResult?: T | undefined;
    invalidInput?: string | undefined;
    offset?: number | undefined;
};
export type Parser = import('peggy').Parser & {
    StartRules: string[];
};
export type Location = import('peggy').Location;
