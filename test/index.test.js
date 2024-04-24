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
      offset: 1,
    },
    {
      offset: 3,
      validInput: "   foo",
      validResult: "foo",
      invalidInput: " fo",
    },
    {
      validInput: "afoa",
      validResult: "foa",
      offset: 1,
    },
    {
      invalidInput: "ccc",
      options: {
        peg$silentFails: -1,
      },
    },
  ]);
});
