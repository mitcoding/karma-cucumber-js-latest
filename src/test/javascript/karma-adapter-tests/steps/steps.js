'use strict';
Before("@test", function(scenario) {
	expect(["Test scenario 2.1", "Test scenario 1.3"].indexOf(scenario.pickle.name) !== -1).to.equal(true);
});
Given(/^there is a test step$/, function () { });
Given(/^there is an ambiguous test step$/, function () { });
When(/^it is executed$/, function () { });
When(/^it is not executed$/, function (callback) { return callback(null, 'pending'); });
Then(/^test succeeds$/, function () { });
Then(/^test fails$/, function (callback) { return callback(new Error("Step failed") ); });
