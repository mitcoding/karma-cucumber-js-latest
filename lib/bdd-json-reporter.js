/*jshint esversion: 6 */
(function() {
"use strict";
	var 
		path = require("path"),
		fs = require("fs")
	;

	function hasValidSuite(karmaLog, result) {
		if (result.suite.length != 2) {
			karmaLog.warn("Unexpected suite: " + result.suite);
			return;
		}

		return true;
	}

	function onRunComplete(bddjsonReporter, config, helper, karmaLog) {
		var 
			reporterConfig = config.bddJSONReporter || { outputFile: null },
			outputFile = !reporterConfig.outputFile ? null : helper.normalizeWinPath(path.resolve(config.basePath, reporterConfig.outputFile)),
			report = bddjsonReporter.report
		;

		if (outputFile) {
			helper.mkdirIfNotExists(path.dirname(outputFile), function () {
				fs.writeFile(outputFile, JSON.stringify(report, null, 4), function (error) {
					if (error) {
						karmaLog.warn("Cannot write JSON:\n\t" + error.message);
					}
				});
			});
		}

		bddjsonReporter.report = {};
	}

	function onSpecComplete (bddjsonReporter, browser, result) {
		if (bddjsonReporter.hasValidSuite(result) ) {
			let stepStatus = BDDJSONReporter.getStepStatus(result);

			if (!bddjsonReporter.report[result.suite[0]]) {
				bddjsonReporter.report[result.suite[0]] = { featureStatus: null };
			}
			
			bddjsonReporter.report[result.suite[0]][result.suite[1]] = BDDJSONReporter.mergeStatus(bddjsonReporter.report[result.suite[0]][result.suite[1]], stepStatus);
			bddjsonReporter.report[result.suite[0]].featureStatus = BDDJSONReporter.mergeStatus(bddjsonReporter.report[result.suite[0]].featureStatus, bddjsonReporter.report[result.suite[0]][result.suite[1]]);
		}
	}

	function BDDJSONReporter(baseReporterDecorator, logger, helper, config) {
		var
			bddjsonReporter = this,
			karmaLog = logger.create('bdd-json')
		;

		this.hasValidSuite = function (result) { return hasValidSuite(karmaLog, result); };
		this.onRunComplete = function () { onRunComplete(bddjsonReporter, config, helper, karmaLog); };
		this.onSpecComplete = function (browser, result) { onSpecComplete(bddjsonReporter, browser, result); };
		this.report = {};
	}

	BDDJSONReporter.getStepStatus = function (result) {
		if (result.success) {
			return !result.skipped ? BDDJSONReporter.passed : BDDJSONReporter.pending;
		}

		return !result.skipped ? BDDJSONReporter.failed : BDDJSONReporter.pending;
	};

	BDDJSONReporter.mergeStatus = function (currStatus, newStatus) {
		if (currStatus === BDDJSONReporter.failed) {
			return BDDJSONReporter.failed;
		}

		if (currStatus === BDDJSONReporter.pending) {
			return BDDJSONReporter.pending;
		}

		return newStatus;
	};

	BDDJSONReporter.failed = 'failed';
	BDDJSONReporter.passed = 'passed';
	BDDJSONReporter.pending = 'pending';
	BDDJSONReporter.$inject = ['baseReporterDecorator', 'logger', 'helper', 'config'];

	exports.BDDJSONReporter = BDDJSONReporter;
})();
