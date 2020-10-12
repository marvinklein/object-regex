const parser = require("./parser.js");
const assert = require("./assert.js");
const compile = require("./compiler.js");

// ([1,2,3], [a,b]) => [1,a,2,b,3]
function braid(a, b) {
  assert(a.length - 1 === b.length);
  return [...Array(a.length + b.length)].map((_, i) => {
    return i % 2 === 0 ? a[i / 2] : b[(i - 1) / 2];
  });
}

function match(tokens, ast) {
  assert(ast && ast.kind === "ROOT");
  const compiledExpression = compile(ast);
  var state, index, compiledExpressionInstance;
  const searchUntilIndex = ast.startAnchor ? 1 : tokens.length;
  for (index = 0; index < searchUntilIndex; index++) {
    compiledExpressionInstance = compiledExpression({
      tokens: tokens.slice(index),
    });
    for (state of compiledExpressionInstance) {
      if (state) {
        return {
          index,
          match: tokens.slice(index, tokens.length - state.tokens.length),
          groups: state.groups,
        };
      }
    }
  }
}

function ore(strs, ...objs) {
  const ast = parser(braid(strs, objs).filter((s) => s !== ""));
  return {
    exec: (tokens) => match(tokens, ast),
  };
}

module.exports = { ore };
