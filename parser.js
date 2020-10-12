const {
  isEmpty,
  optional,
  zeroOrMore,
  oneOrMore,
  combine,
} = require("./utils");

const matchStrHead = ([head, ...tail], exp) => {
  if (typeof head === "string" && head.startsWith(exp)) {
    var headtail = head.substr(exp.length);
    if (headtail === "") {
      return tail;
    } else {
      return [headtail, ...tail];
    }
  }
};

const parseRangeQuantifier = ([head, ...tail], exp) => {
  var match;
  if (
    typeof head === "string" &&
    (match = head.match(/^\{(\d+)(?:(,)(\d+)?)?\}/))
  ) {
    var [range, min, orMore, max] = match;
    newTail =
      head.substr(range.length) === "" ? tail : [head.substr(range), ...tail];
    min = parseInt(min);
    max = max && parseInt(max);
    if (typeof max !== "undefined" && max < min) {
      throw new Error(`max can't be less than min.`);
    }
    return [{ min, max: orMore ? (max ? max : undefined) : min }, newTail];
  }
};

const parseQuantifierType = (str) => {
  // todo: any
  var tail = matchStrHead(str, "*");
  if (tail) return [{ min: 0, max: undefined }, tail];
  tail = matchStrHead(str, "+");
  if (tail) return [{ min: 1, max: undefined }, tail];
  tail = matchStrHead(str, "?");
  if (tail) return [{ min: 0, max: 1 }, tail];
  return parseRangeQuantifier(str);
};

const parseStartAnchor = (str) => {
  var x = matchStrHead(str, "^");
  if (x) {
    return [{ kind: "START_ANCHOR" }, x];
  }
};

const parsePipe = (str) => {
  var x = matchStrHead(str, "|");
  if (x) {
    return [{ kind: "PIPE" }, x];
  }
};

const parseEndAnchor = (str) => {
  var x = matchStrHead(str, "$");
  if (x) {
    return [{ kind: "END_ANCHOR" }, x];
  }
};

const parseLazyQuantifier = (str) => {
  var x = matchStrHead(str, "?");
  if (x) {
    return [{ kind: "LAZY_QUANTIFIER" }, x];
  }
};

const parseOpenParen = (str) => {
  var x = matchStrHead(str, "(");
  if (x) {
    return [{ kind: "OPEN_PAREN" }, x];
  }
};

const parseCloseParen = (str) => {
  var x = matchStrHead(str, ")");
  if (x) {
    return [{ kind: "CLOSE_PAREN" }, x];
  }
};

const parseNonMatchingGroup = (str) => {
  var x = matchStrHead(str, "?:");
  if (x) {
    return [{ kind: "NON_MATCHING_GROUP" }, x];
  }
};

const parseAnyToken = (str) => {
  var x = matchStrHead(str, ".");
  if (x) {
    return [{ kind: "ANY_TOKEN" }, x];
  }
};

const parseNegation = (str) => {
  var x = matchStrHead(str, "^");
  if (x) {
    return [{ kind: "NEGATION" }, x];
  }
};

const parseQuantifier = (str) => {
  var x = combine(parseQuantifierType, optional(parseLazyQuantifier))(str);
  if (x) {
    return [
      { kind: "QUANTIFIER", isLazy: !isEmpty(x[0][1]), ...x[0][0] },
      x[1],
    ];
  }
};

const parseToken = (str) => {
  var x = any(
    parseAnyToken,
    combine(optional(parseNegation), parseMatchToken)
  )(str);
  if (x) {
    if (x[0].kind === "ANY_TOKEN") return x;
    return [
      {
        ...x[0][1],
        negated: !isEmpty(x[0][0]),
      },
      x[1],
    ];
  }
};

const parseMatch = (str) => {
  var x = combine(parseToken, optional(parseQuantifier))(str);
  if (x) {
    const [match, tail] = x;
    if (!isEmpty(x[0][1])) {
      return [
        { ...x[0][1], expression: { kind: "MATCH", tokenMatch: x[0][0] } },
        tail,
      ];
    }
    return [{ kind: "MATCH", tokenMatch: x[0][0] }, tail];
  }
};

const parseGroup = (str) => {
  var x = combine(
    parseOpenParen,
    optional(parseNonMatchingGroup),
    parseExpression,
    parseCloseParen,
    optional(parseQuantifier)
  )(str);
  if (x) {
    if (!isEmpty(x[0][4])) {
      return [
        {
          ...x[0][4],
          expression: {
            kind: "GROUP",
            match: isEmpty(x[0][1]),
            expression: x[0][2],
          },
        },
        x[1],
      ];
    }
    return [
      {
        kind: "GROUP",
        match: isEmpty(x[0][1]),
        expression: x[0][2],
        // quantifier: x[0][4]
      },
      x[1],
    ];
  }
};

const parseSubExpressionItem = (str) => {
  return any(parseMatch, parseGroup, parseEndAnchor)(str);
};

const any = (...parsers) => {
  return (str) => {
    // console.log(str)
    for (const parser of parsers) {
      // console.log(1)
      var x = parser(str);
      if (x) {
        return x;
      }
    }
  };
};

const parseMatchToken = (str) => {
  if (typeof str[0] === "function") {
    return [{ kind: "TOKEN", token: str[0] }, str.slice(1)];
  }
  return [{ kind: "TOKEN", token: str[0] }, str.slice(1)];
};

const parseSubExpression = (str) => {
  var x = oneOrMore(parseSubExpressionItem)(str);
  if (x) {
    return [{ kind: "SUB_EXPRESSION", subExpressionItems: x[0] }, x[1]];
  }
};

const parseExpression = (str) => {
  var x = combine(
    parseSubExpression,
    zeroOrMore(combine(parsePipe, parseSubExpression))
  )(str);
  if (x) {
    return [
      { kind: "EXPRESSION", subExpressions: [x[0][0], ...x[0][1]] },
      x[1],
    ];
  }
};

const parseRegex = (str) => {
  var x = combine(optional(parseStartAnchor), parseExpression)(str);
  if (!x) {
    throw new Error("couldnt parse expression");
  }
  if (x[1].length > 0) {
    throw new Error("couldnt parse entire expression");
  }
  return { kind: "ROOT", expression: x[0][1], startAnchor: !isEmpty(x[0][0]) };
};

module.exports = parseRegex;
