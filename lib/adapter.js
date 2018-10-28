/*jshint esversion: 6 */
var karma;
(function (karma, global) {
	'use strict';

	var CucumberTestCase = (function () {
		function CucumberTestCase(status) {
			var _status = status || { steps: [] };
			this.sourceLocation = _status.sourceLocation || {
				uri: "",
				line: 0
			};
			this.result = {
				duration: 0,
				exception: {
					message: "",
					showDiff: true,
					actual: null,
					expected: null
				},
				status: ""
			};
			this.totalSteps = _status.steps.length;
			this.completedSteps = [];
			this.log = [];
			this.getStatus = function() { return _status; };
		}

		CucumberTestCase.prototype.getFeatureDescription = function() {
			var featureLines = this.getFeatureLines();

			for (let i = 0; i < featureLines.length; i++) {
				if (featureLines[i].toLowerCase().indexOf("feature:") !== -1) {
					return featureLines[i].replace(/^(.*)?feature:\s*/i, "");
				}
			}

			return "";
				
		};

		CucumberTestCase.prototype.getFeatureLines = function() {
			return CucumberAdapter.loadTestFiles([this.sourceLocation.uri])[0][1].split(/\n/gi);
		};

		CucumberTestCase.prototype.getScenarioDescription = function() {
			var featureLines = this.getFeatureLines();

			return featureLines[this.sourceLocation.line - 1].replace(/scenario:\s?/i, "");
		};
		
		return CucumberTestCase;
	})();
	
	var CucumberTestStep = (function () {
		function getFeatureFileLines(uri) {
			return CucumberAdapter.loadTestFiles([uri])[0][1].split("\n");
		}

		function CucumberTestStep(status) {
			status = status || { testCase: {}, index: 0 };
			this.sourceLocation = status.testCase.sourceLocation || {
				uri: "",
				line: 0
			};
			
			this.result = status.result || {
				duration: 0,
				exception: {
					message: "",
					showDiff: true,
					actual: null,
					expected: null
				},
				status: ""
			};

			this.getDescription = function() {
				var description = (getFeatureFileLines(this.sourceLocation.uri)[(this.sourceLocation.line + status.index)] || "").trim();       
				return description !== "" ? description : getFeatureFileLines(this.sourceLocation.uri)[this.sourceLocation.line - 1].trim();
			};

			this.getId = function() {
				var description = this.getDescription();
				return description + " <- " + this.sourceLocation.uri + ":" + (this.sourceLocation.line + (description.indexOf("Scenario:") === 0 ? 0 : status.index + 1) );
			};
		}

		return CucumberTestStep;
	})();
	
	var CucumberAdapter = (function () {
		var fileCache = {};
		function CucumberAdapter(karma) {
			this.completedFatures = 0;
			this.karma = karma;
			this.testCaseCache = {};
			this.totalFeatures = 0;
			this.totalSteps = 0;
			this.log = [];
			this.results = [];
		}
		
		CucumberAdapter.prototype.createTestCase = function(status) { 
			var cucumberTestCase = this.testCaseCache[status.sourceLocation.uri + status.sourceLocation.line] =  new CucumberTestCase(status);
			
			this.totalSteps += cucumberTestCase.totalSteps;
			
		};

		CucumberAdapter.prototype.getStart = function () {
			var cucumberAdapter = this;

			return function () {
				var 
					featuresUrls = Object.keys(cucumberAdapter.karma.files).filter(function (f) { return /\.feature$/.test(f); }),
					features = CucumberAdapter.loadTestFiles(featuresUrls),
					stepUrls = Object.keys(cucumberAdapter.karma.files).filter(function (f) { return /steps(\/.*)?\.js$/.test(f); }),
					tagExpression = CucumberAdapter.getTagExpression(cucumberAdapter.karma.config.args)
				;

				for (let property in Cucumber) {
					if (Cucumber.hasOwnProperty(property)) {
						global[property] = Cucumber[property];
					}
				}
				
				cucumberAdapter.totalFeatures = features.length;
				Cucumber.supportCodeLibraryBuilder.reset('');
				cucumberAdapter.runFeatures(features, stepUrls, tagExpression);
			};
		};

		CucumberAdapter.loadTestFiles = function (featuresUrls) {
			var res = [];
			return featuresUrls.map(function (f) { return [f, CucumberAdapter.loadFile(f)]; });
		};

		CucumberAdapter.loadFile = function (url) {
			var client;

			if (fileCache[url] === undefined) {
				client = new XMLHttpRequest();
				client.open("GET", url, false);
				client.send();
				fileCache[url] = client.responseText;
			}

			return fileCache[url];
		};

		CucumberAdapter.getTagExpression = function (args) {
			let tagsIndex = args.indexOf('--tags');
			if (tagsIndex === -1) {
				return "";
			}

			let doAddTagExpression = true;
			let lastTagsIndex = args.indexOf("--", tagsIndex + 1);
			let tags = args.slice(tagsIndex + 1, lastTagsIndex < 0 ? args.length : lastTagsIndex).filter(function (s) { return !!s; });
			if (tags.length <= 0) { return ""; }

			let tagExpression = "(";
			tags.forEach(function(tag, index) {
				if (tag.match(/^--tags$/i) ) { 
					tagExpression += ") and (";
					doAddTagExpression = true;
				} else if (tag.match(/--[\w\d]*/gi) ) {
					doAddTagExpression = false;
				} else if (doAddTagExpression) { 
					if (tagExpression.substring(tagExpression.length - 1) !== "(") { tagExpression += " or ";  }
					tagExpression += tag.replace("~", "not ").replace(/\s*,\s*/gi, " or "); 
				}
			});

			tagExpression += ")";
			return tagExpression;
		};

		CucumberAdapter.prototype.runFeatures = function (features, stepUrls, tagExpression) {
			var 
				cucumberAdapter = this,
				stepsLeftToLoad = stepUrls.length
			;

			function runFeatures() {
				if (--stepsLeftToLoad <= 0) {	
					features.forEach(function(feature, index) {
						cucumberAdapter.runFeature(cucumberAdapter, feature, tagExpression);
					});
				}
			}

			if (features.length === 0) { return cucumberAdapter.karma.complete({ coverage: window.__coverage__ }); }      
			if (stepUrls.length === 0) { runFeatures(); }
			stepUrls.forEach(function(stepUrl, index) {
				var 
					script = document.createElement("script"),
					scripts = document.getElementsByTagName("script")
				;
				
				script.src = stepUrl;
				script.type = "text/javascript";
				script.setAttribute("crossorigin", "anonymous");
				script.onload = runFeatures;
				script.onerror = function() { console.log("error loading step: " + stepUrl); runFeatures(); };
				document.body.insertBefore(script, scripts[scripts.length - 1]);
			});
		};

		CucumberAdapter.prototype.runFeature = function(cucumberAdapter, feature, tagExpression) {
			var
				eventBroadcaster = new EventEmitter(),
				eventDataCollector = new Cucumber.formatterHelpers.EventDataCollector(eventBroadcaster),
				supportCodeLibrary = Cucumber.supportCodeLibraryBuilder.finalize(),
				pickleFilter = new Cucumber.PickleFilter({ tagExpression: tagExpression }),
				testCases = Cucumber.getTestCases({
					eventBroadcaster: eventBroadcaster,
					pickleFilter: pickleFilter,
					source: feature[1],
					uri: feature[0]
				}),
				formatterOptions = {
					colorsEnabled: true,
					cwd: '/',
					eventBroadcaster: eventBroadcaster,
					eventDataCollector: eventDataCollector,
					log: function log(stdout) {
						if (stdout.trim() !== "") {
							if (stdout.toLowerCase().indexOf("scenario") !== -1) {
								cucumberAdapter.log.push(cucumberAdapter.getFeatureName(feature) );
							}

							cucumberAdapter.log.push(stdout.trim() );
						}
					},
					supportCodeLibrary: supportCodeLibrary
				},
				cucumberInstance
			;

			Cucumber.FormatterBuilder.build('summary', formatterOptions);
			cucumberInstance = new Cucumber.Runtime({
				eventBroadcaster: eventBroadcaster,
				options: {},
				testCases: testCases,
				supportCodeLibrary: supportCodeLibrary
			});
			
			eventBroadcaster.on("test-case-prepared", function(status) { cucumberAdapter.createTestCase(status); });
			eventBroadcaster.on("test-step-finished", function(status) { cucumberAdapter.logTestStep(status); });
			
			cucumberInstance
				.start()
				.then(function (success) {
					cucumberAdapter.completedFatures++;
					cucumberAdapter.checkAllFeaturesTested(["success: ", success], feature);
				})
				.catch(function (error) {
					cucumberAdapter.completedFatures++;
					cucumberAdapter.checkAllFeaturesTested(["error: ", error], feature);
				})
			;
		};

		CucumberAdapter.prototype.checkAllFeaturesTested = function(status, feature) {
			var 
				cucumberAdapter = this
			;

			if (cucumberAdapter.completedFatures >= cucumberAdapter.totalFeatures) {
				console.log(cucumberAdapter.log.join("\n") );
			
				cucumberAdapter.results.forEach(function(result, index) {
					cucumberAdapter.karma.info({ total: cucumberAdapter.totalSteps });
					cucumberAdapter.karma.result(result);
				});
			
				return cucumberAdapter.karma.complete({ coverage: window.__coverage__ });
			}
		};

		CucumberAdapter.prototype.getFeatureName = function(feature) {
			var 
				fileContents = feature[1],
				fileUrl = feature[0],
				myRegex = /feature:([^\n\r]*)/gi,
				parts = myRegex.exec(fileContents),
				featureName = parts[1].trim()
			;
		
			return "\n\x1b[93mFeature: " + featureName + " \x1b[33m(" + fileUrl + ")\x1b[0m";
		};

		CucumberAdapter.prototype.logTestStep = function(status) {
			var 
				testCase = status.testCase,
				cucumberAdapter = this,
				cucumberTestCase = cucumberAdapter.testCaseCache[testCase.sourceLocation.uri + testCase.sourceLocation.line],
				cucumberTestStep = new CucumberTestStep(status), 
				result = {
					id: cucumberTestStep.getId(),
					description: cucumberTestStep.getDescription(),
					log: [],
					suite: [cucumberTestCase.getFeatureDescription(), cucumberTestCase.getScenarioDescription()],
					success: false,
					skipped: false,
					time: (cucumberTestStep.result.duration || 0)
				}
			;
			
			switch(cucumberTestStep.result.status) {
				case 'passed':
					result.success = true;
					break;
				case 'pending':
					result.skipped = true;
					result.log.push("Step is pending: " + result.suite.join(' -> ') + " -> " + result.id);
					break;
				case 'undefined':
					result.log.push("Step is undefined: " + result.suite.join(' -> ') + " -> " + result.id);
					/* falls through */
				case 'skipped':
					result.success = true;
					result.skipped = true;
					break;
				case 'ambiguous' :
					result.log.push("Step is ambiguous: " + result.id);
					break;
				default:
					let error = cucumberTestStep.exception || {};
					let errorMessage = "";

					Object.keys(error).forEach(function(key, index) {
						errorMessage += "\n" + key + ": " + error[key];
					});
					result.log.push("Step: " + result.id + errorMessage);
			}
 			
			cucumberTestCase.completedSteps.push(cucumberTestStep);
		
			cucumberAdapter.results.push(result);
		};

		return CucumberAdapter;
	}());

	karma.CucumberAdapter = CucumberAdapter;
})(karma || (karma = {}), typeof window !== 'undefined' ? window : global);

var __adapter__;
(function (global) {
	var adapter = new karma.CucumberAdapter(__karma__);
	__adapter__ = adapter;
	__karma__.start = adapter.getStart();
	
})(typeof window !== 'undefined' ? window : global);
