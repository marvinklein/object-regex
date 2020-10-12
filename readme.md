# Object RegEx
A zero dependency regular expression engine for matching series/arrays of arbitrary objects in node or in the browser.

## Examples
You can match any type of object:
```javascript
const haystack = [1,2,3,3,4];
const re = ore`${{3}}{2,}`; // match two or more occurances of the actual number 3 (not a string represenation of the number)
re.exec(tokens) // start: 2, match: [3,3];
```

Suppose you have some text "The boy ran quickly", and you've tagged that text with the part of speech of each word:
```javascript
const tokens = [
  {word:"The",part;"Determiner"},
  {word:"boy",part;"Noun"},
  {word:"ran",part;"Verb"},
  {word:"quickly",part;"Adverb"}
]
```

And now you want to find any noun optionally followed by a verb. You can concisely write:
```javascript
const re = ore`${{part:"Noun"}}${{part:"Verb"}}?`;
re.exec(tokens) // start: 1, match: [{word:"boy",part;"Noun"},{word:"ran",part;"Verb"}]
```
The ${{...}} syntax is a just a javascript template literal. The question mark makes the Verb optional, just like in normal RegEx.

## Installation and Use
```bash
npm install object-regex
```

```javascript
const { ore } = require("object-regex");

const re = ore`${2}+`;
console.log(re.exec([1, 2, 2, 2, 5])); // { index: 1, match: [2, 2, 2] }
```

# Supported operators:
```
^       Start anchor
$       End anchor
|       Alternation
()      Groups
.       Match any token
^       Negation operator (e.g. ^2)
*       Zero or more
*?      Lazy zero or more
+       One or more
+?      Lazy one or more
?       Zero or One
{3}     Exact quantifier
{3,}    Minimum quantifier
{3,5}   Range quantifier
{3,}?   Lazy minimum quantifier
{3,5}?  Lazy range quantifier
```
