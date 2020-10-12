// returns a fn that accepts tokens and returns an iterable object
function compile(node) {
  switch (node.kind) {
    case "ROOT":
      return compile(node.expression);
    case "EXPRESSION":
      return compileSeries(node.subExpressions);
    case "SUB_EXPRESSION":
      return compileSeries(node.subExpressionItems);
    case "MATCH":
      return compileMatch(node);
    case "GROUP":
      return compileGroup(node);
    case "QUANTIFIER":
      return compileQuantifier(node);
  }
  throw new Error(`unsupported node ${node.kind}`);
}

// a is the input token, b is the expression token
// if b is a function, pass a to b and return the result
// return true if a is contains b
const tokensMatch = (a, b) => {
  if (a == null || b == null) {
    return false;
  }
  if (typeof b === "function") {
    return b(a);
  }
  if (typeof a === typeof b && typeof a !== "object") {
    return a === b;
  }
  return Object.keys(b).every((key) => a[key] === b[key]);
};

// returns a fn that accepts tokens and returns an iterable object,
// which iterates over the possible matches
const compileSeries = (nodes) => {
  const [head, ...tail] = nodes;
  if (!nodes.length) {
    return function* (state) {
      yield state;
    };
  }
  var x,
    headEx = compile(head);
  var tailEx = compileSeries(tail);
  return (state) => ({
    *[Symbol.iterator]() {
      for (x of headEx(state)) {
        if (x) {
          yield* tailEx(x);
        }
      }
    },
  });
};

// returns a fn that accepts tokens and returns an iterable object
const compileMatch = (node) => {
  var matcher = makeMatcher(node.tokenMatch);
  return (state) => ({
    *[Symbol.iterator]() {
      yield matcher(state);
    },
  });
};

const compileGroup = (node) => {
  var q = compile(node.expression);
  return (state) => ({
    *[Symbol.iterator]() {
      for (var x of q(state)) {
        if (x) {
          if (node.match) {
            var newGroup = state.tokens.slice(
              0,
              state.tokens.length - x.tokens.length
            );
            var groups = x.groups ? [...x.groups, newGroup] : [newGroup];
            yield { ...x, groups };
          } else {
            yield x;
          }
        }
      }
    },
  });
};

// returns a function that matches token and returns the tail.
const makeMatcher = (node) => {
  return (state) => {
    if (state.tokens.length === 0) {
      return undefined;
    }
    var isMatch =
      (node.kind === "ANY_TOKEN" && typeof state.tokens[0] !== "undefined") ||
      tokensMatch(state.tokens[0], node.token);
    if (node.negated) {
      isMatch = !isMatch;
    }
    return isMatch ? { ...state, tokens: state.tokens.slice(1) } : undefined;
  };
};

const matchForever = (compiledExp) => {
  const makeMatcher = () => {
    return (state) => ({
      *[Symbol.iterator]() {
        for (var x of compiledExp(state)) {
          if (x) {
            yield* matcher(x);
            yield x;
          }
        }
      },
    });
  };
  var matcher = makeMatcher();
  return matcher;
};

// returns a fn that accepts tokens and returns an iterable object
const compileQuantifier = (node) => {
  const exp = compile(node.expression);
  if (!node.isLazy) {
    if (!node.max) {
      return (state) => ({
        *[Symbol.iterator]() {
          // match as many times as possible, then decrement
          let num = node.min;
          var nmatcher = matchNTimes(exp, num);
          var q = matchForever(exp);
          for (var x of nmatcher(state)) {
            if (x) {
              // we're at the min. now match as many more as possible.
              yield* q(x);
              yield x;
            }
          }
        },
      });
    }
    if (node.max) {
      return (state) => ({
        *[Symbol.iterator]() {
          let num = node.max;
          // consumes expression exp n times:
          while (num >= node.min) {
            var nmatcher = matchNTimes(exp, num);

            for (let x of nmatcher(state)) {
              if (x) {
                yield x;
              }
            }
            num--;
          }
        },
      });
    }
  } else {
    return (state) => ({
      *[Symbol.iterator]() {
        // match as few times as possible, then increment
        let num = node.min;
        var nmatcher = matchNTimes(exp, node.min);
        let tail;
        for (let x of nmatcher(state)) {
          if (x) {
            tail = x;
            yield x;
          }
        }
        num++;
        while (tail && (typeof node.max === "undefined" || num <= node.max)) {
          for (let x of exp(tail)) {
            if (x) {
              tail = x;
              yield x;
            }
          }
          num++;
        }
      },
    });
  }
};

const matchNTimes = (compiledExp, n) => {
  if (n < 1) {
    return function* (state) {
      yield state;
    };
  }
  var compiledTailExp = matchNTimes(compiledExp, n - 1);
  return (state) => ({
    *[Symbol.iterator]() {
      for (x of compiledExp(state)) {
        if (x) {
          yield* compiledTailExp(x);
        }
      }
    },
  });
};

module.exports = compile;
