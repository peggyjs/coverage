import test from "node:test";
import { testPeggy } from "../lib/index.js";

test("test peggy coverage", async() => {
  await testPeggy(new URL("minimal.js", import.meta.url), [
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
  ]);
});
