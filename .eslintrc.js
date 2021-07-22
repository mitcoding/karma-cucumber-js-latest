module.exports = {
  "env": {
    "browser": true,
    "es6": true
  },
  "globals": {
    "__karma__" : true,
    "Cucumber": true,
    "EventEmitter": true,
    "global" : true

  },
  "rules": {
    "curly": 2,
    "eqeqeq": 2,
    "wrap-iife": [
      2,
      "any"
    ],
    "no-use-before-define": [
      2,
      {
        "functions": false
      }
    ],
    "new-cap": 2,
    "no-caller": 2,
    "dot-notation": 0,
    "no-undef": 2,
    "no-unused-vars": 2,
    "no-cond-assign": [
      2,
      "except-parens"
    ],
    "no-eq-null": 2
  }
}
