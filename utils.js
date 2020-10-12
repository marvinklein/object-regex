const isEmpty = (arr) => arr.length === 0;

const optional = (parser) => {
  return (str) => {
    var x = parser(str);
    if (x) {
      return x;
    }
    return [[], str];
  };
};

const zeroOrMore = (parser) => {
  return optional(oneOrMore(parser));
};

const oneOrMore = (parser) => {
  return (str) => {
    var nodes = [];
    var x = parser(str);
    if (!x) {
      return;
    }
    tail = x[1];
    nodes.push(x[0]);
    while (tail.length && (x = parser(tail))) {
      tail = x[1];
      nodes.push(x[0]);
    }
    return [nodes, tail];
  };
};

const combine = (...parsers) => {
  return (str) => {
    var nodes = [];
    var tail = str;
    for (const parser of parsers) {
      var x = parser(tail);
      if (!x) return undefined;
      nodes.push(x[0]);
      tail = x[1];
    }
    return [nodes, tail];
  };
};

module.exports = { isEmpty, optional, zeroOrMore, oneOrMore, combine };
