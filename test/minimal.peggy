// Simplest grammar that uses only very-common constructs
foo
  = (ws / init)* @$("fo" .)

init
  = [a-b\x7f]+

ws "whitespace"
  =  [ \t\r\n]

not_lib
  = !{ return options.peg$library }
