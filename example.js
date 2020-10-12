const { ore } = require("./index.js");

const expression = ore`${2}+`;
console.log(expression.exec([1, 2, 2, 2, 5]));
