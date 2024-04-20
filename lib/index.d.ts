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
