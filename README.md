# karma-cucumber-js-latest

In contrast to other adapters this one supports the latest version of Cucumber.js (6.0.5). The minimum supported Karma is 1.3.0. The minimum Supported Cucumber.js is 3.0.5. This adapter does not include Cucumber.js or Karma.js, because they are peer dependencies.

## Getting Started

```Shell
npm install cucumber --save-dev
npm install karma --save-dev
npm install karma-cucumber-js-latest --save-dev
```

### Configuring karma.conf.js

```JavaScript
...
frameworks: ['cucumber-js'],
...
plugins: [
  ...
  require("karma-cucumber-js-latest")
  ...
],
...
files: [
  // Feature files to test
  { pattern: 'features/*.feature', included: false },
  ... // Include JS files with step definitions and any other files they require
],
...
client: { // Specify this if you want to test features/scenarios with certain tags only [Feature/Scenario Tags](https://docs.cucumber.io/cucumber/api/#tags)
  args: ['--tags', '@frontend']
},
...
reporters: ['progress', 'bdd-json'], // Specify this reporter if you need to integrate the test results into living documentation
bddJSONReporter: {
  outputFile: 'results.json' // 'results.json' will be filled with all scenarios test results
},
...
```

## Step Definitions

[step definitions](https://github.com/cucumber/cucumber-js/blob/master/docs/support_files/step_definitions.md) are written like this (no need to re-import cucumber methods, as shown in official documentation, as the karma adapter does this for your already):

```JavaScript
Given(/^there is a test step$/, function () { });
When(/^it is executed$/, function () { });
When(/^step is pending$/, function (callback) { callback(null, 'pending'); });
Then(/^test succeeds$/, function () { });
Then(/^test fails$/, function (callback) { callback(new Error('Step failed')); });
```

## License
Copyright (c) 2018 Timothy Gross.
This project is licensed under the terms of the MIT license.
