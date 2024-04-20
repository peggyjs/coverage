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
      validInput: "foo",
      invalidInput: "",
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
  ]);
});
