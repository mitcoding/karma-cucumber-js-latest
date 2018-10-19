/*jshint esversion: 6 */
'use strict';

var child_process_1 = require("child_process");
var cucumber = require("cucumber");
var fs = require("fs");
var chai = require("chai");
var should = chai.should();
var World = (function () {
    function World() {
        this.karmaOutput = '';
        this.tags = [];
        try {
            fs.unlinkSync('results.json');
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }
    return World;
}());

cucumber.setDefaultTimeout(15 * 1000);
cucumber.setWorldConstructor(World);
cucumber.Given(/^I have several features with (\d+) passing steps, (\d+) pending and (\d+) failing$/, function (passing, pending, failing) { });
cucumber.Given(/^Karma is configured to test these features$/, function () { });
cucumber.Given(/^one passing scenario has "([^"]+)" tag$/, function (tag) { });
cucumber.Given(/^one pending scenario has "([^"]+)" tag$/, function (tag) { });
cucumber.Given(/^Karma is configured to test scenarios of "([^"]+)" tag$/, function (tag) {
    var world = this;
    world.tags.push(tag);
});
cucumber.When(/^I run Karma$/, function (callback) {
        var world = this;
	process.env.KARMA_CLIENT_ARGS = "--tags " + world.tags.join(' ');
        child_process_1.exec('karma start', { env: process.env }, function (error, stdout, stderr) {
            world.karmaOutput = stdout;
            callback();
        });
});
cucumber.Then(/^Karma reports the following steps counts:$/, function (table) {
	var world = this;
	if (table.hashes()[0].Failed === '0') {
		let res = /.*Executed (\d+) of \d+ \(skipped (\d+)\).*success[^\(]*\(\d+(?:.\d+)? secs \/ \d+(?:.\d+)? sec(?:s)?\)\s*(.*TOTAL:\s*\d+\s*SUCCESS[^\s]*\s*)?$/gi.exec(world.karmaOutput);

		should.exist(res);
		should.exist(res[1]);
		Number(res[1]).should.equal(Number(table.hashes()[0].Passed) + Number(table.hashes()[0].Skipped) );
		should.exist(res[2]);
		res[2].should.equal(table.hashes()[0].Skipped);
		
		let results = JSON.parse(fs.readFileSync("results.json").toString() );
		let testFeature1 = results["Test feature 1"];
		let testFeature2 = results["Test feature 2"];

		should.exist(testFeature1);
		should.exist(testFeature2);
		testFeature1.featureStatus.should.equal("pending");
		testFeature1["Test scenario 1.3"].should.equal("pending");
		testFeature2.featureStatus.should.equal("passed");
		testFeature2["Test scenario 2.1"].should.equal("passed");
	
	} else {
		let res = /.*Executed (\d+) of \d+[^\(]*\((\d+) FAILED\)[^\(]*\(skipped (\d+)\)[^\(]*\(\d+(?:.\d+)? secs \/ \d+(?:.\d+)? sec(?:s)?\)\s*(.*TOTAL:\s*\d+\s*FAILED,\s*\d+\s*SUCCESS[^\s]*\s*)?$/gi.exec(world.karmaOutput);

		should.exist(res);
		should.exist(res[1]);
		Number(res[1]).should.equal(Number(table.hashes()[0].Passed) + Number(table.hashes()[0].Skipped) );
		should.exist(res[2]);
		res[2].should.equal(table.hashes()[0].Failed);
		should.exist(res[3]);
		res[3].should.equal(table.hashes()[0].Skipped);

		let results = JSON.parse(fs.readFileSync("results.json").toString() );
		let testFeature1 = results["Test feature 1"];
		let testFeature2 = results["Test feature 2"];

		should.exist(testFeature1);
		should.exist(testFeature2);
		testFeature1.featureStatus.should.equal("failed");
		testFeature1["Test scenario 1.1"].should.equal("passed");
		testFeature1["Test scenario 1.2"].should.equal("failed");
		testFeature1["Test scenario 1.3"].should.equal("pending");
		testFeature1["Test scenario 1.4"].should.equal("failed");
		testFeature2.featureStatus.should.equal("passed");
		testFeature2["Test scenario 2.1"].should.equal("passed");
	}

	should.exist(fs.statSync('results.json'));
});
