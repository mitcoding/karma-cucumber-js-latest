/*jshint esversion: 6 */
((global) => {
	'use strict';
	var fileCache = {};

	function convertToMillis(durration, isCucumber6Plus) {
		durration = durration || 0;

		if (isCucumber6Plus) { return durration / 1000000; }

		return durration;
	}

	function loadFile(url) {
		var client;

		if (fileCache[url] === undefined) {
			client = new XMLHttpRequest();
			client.open("GET", url, false);
			client.send();
			fileCache[url] = client.responseText;
		}

		return fileCache[url];
	}

	function loadTestFiles(featuresUrls) {
		return featuresUrls.map((url) => { return [url, loadFile(url)]; });
	}

	class CucumberTestCase {
		constructor(status) {
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
			this.getStatus = () => { return _status; };
		}

		getFeatureDescription() {
			var featureLines = this.getFeatureLines();

			for (let i = 0; i < featureLines.length; i++) {
				if (featureLines[i].toLowerCase().indexOf("feature:") !== -1) {
					return featureLines[i].replace(/^(.*)?feature:\s*/i, "");
				}
			}

			return "";
				
		}

		getFeatureLines() {
			return loadTestFiles([this.sourceLocation.uri])[0][1].split(/\n/gi);
		}

		getScenarioDescription() {
			var featureLines = this.getFeatureLines();

			return featureLines[this.sourceLocation.line - 1].replace(/scenario:\s?/i, "");
		}
	}
	
	class CucumberTestStep {
		constructor(status) {
			status = status || { testCase: {}, index: 0 };
			this.sourceLocation = status.testCase.sourceLocation || {
				uri: "",
				line: 0
			}
			
			this.result = status.result || {
				duration: 0,
				exception: {
					message: "",
					showDiff: true,
					actual: null,
					expected: null
				},
				status: ""
			}
		}

		getDescription() {
			var description = (this.getFeatureFileLines()[(this.sourceLocation.line + status.index)] || "").trim();
			return description !== "" ? description : this.getFeatureFileLines()[this.sourceLocation.line - 1].trim();
		}

		getFeatureFileLines() {
			return loadTestFiles([this.sourceLocation.uri])[0][1].split("\n");
		}

		getId() {
			var description = this.getDescription();
			return description + " <- " + this.sourceLocation.uri + ":" + (this.sourceLocation.line + (description.indexOf("Scenario:") === 0 ? 0 : status.index + 1) );
		}
	}
	
	class CucumberAdapter {
		constructor(karma) {
			this.karma = karma;
			this.log = [];
			this.testCaseCache = {};
			this.totalSteps = 0;
		}

		checkAllFeaturesTested() {
			var cucumberAdapter = this;
		
			console.log("\n" + cucumberAdapter.log.join("\n") );
			return cucumberAdapter.karma.complete({ coverage: window.__coverage__ });
		}

		createTestCase(status) { 
			var cucumberTestCase = this.testCaseCache[status.sourceLocation.uri + status.sourceLocation.line] = new CucumberTestCase(status);
			this.totalSteps += cucumberTestCase.totalSteps;
			this.karma.info({ total: this.totalSteps });
		}

		getStart() {
			var cucumberAdapter = this;

			return () => {
				var 
					featuresUrls = Object.keys(cucumberAdapter.karma.files).filter((f) => { return /\.feature$/.test(f); }),
					features = loadTestFiles(featuresUrls),
					stepUrls = Object.keys(cucumberAdapter.karma.files).filter((f) => { return /steps(\/.*)?\.js$/.test(f); }),
					tagExpression = cucumberAdapter.getTagExpression(cucumberAdapter.karma.config.args)
				;

				for (let property in Cucumber) {
					if (Cucumber.hasOwnProperty(property)) {
						global[property] = Cucumber[property];
					}
				}
				
				cucumberAdapter.setupFeatures(features, stepUrls, tagExpression);
			};
		}

		getSupportCodeLibrary(stepUrls) {
			return new Promise((resolve, reject) => {
				function finalize(stepIndex) {
					if (stepIndex === stepUrls.length - 1) {
						resolve(Cucumber.supportCodeLibraryBuilder.finalize() );
					}
				}

				Cucumber.supportCodeLibraryBuilder.reset("");
				stepUrls.forEach((stepUrl, stepIndex) => {
					var 
						script = document.createElement("script"),
						scripts = document.getElementsByTagName("script")
					;
				
					script.src = stepUrl;
					script.type = "text/javascript";
					script.async = false;
					script.setAttribute("crossorigin", "anonymous");
					script.onload = () => { finalize(stepIndex); };
					script.onerror = reject;
					document.body.insertBefore(script, scripts[scripts.length - 1]);
				});
			});
		}

		getTagExpression(args) {
			let tagsIndex = args.indexOf('--tags');
			if (tagsIndex === -1) {
				return "";
			}

			let 
				doAddTagExpression = true,
				lastTagsIndex = args.indexOf("--", tagsIndex + 1),
				tags = args.slice(tagsIndex + 1, lastTagsIndex < 0 ? args.length : lastTagsIndex).filter((s) => { return !!s; })
			;

			if (tags.length <= 0) { return ""; }

			let tagExpression = "(";
			tags.forEach((tag) => {
				if (tag.match(/^--tags$/i) ) { 
					tagExpression += ") and (";
					doAddTagExpression = true;
				} else if (tag.match(/--[\w\d]*/gi) ) {
					doAddTagExpression = false;
				} else if (doAddTagExpression) { 
					if (tagExpression.substring(tagExpression.length - 1) !== "(") { tagExpression += " or "; }
					tagExpression += tag.replace("~", "not ").replace(/\s*,\s*/gi, " or "); 
				}
			});

			tagExpression += ")";
			return tagExpression;
		}

		setupFeatures(features, stepUrls, tagExpression) {
			var 
				cucumberAdapter = this,
				eventBroadcaster = new EventEmitter(),
				eventDataCollector = new Cucumber.formatterHelpers.EventDataCollector(eventBroadcaster),
				pickleFilter = new Cucumber.PickleFilter({ tagExpression: tagExpression }),
				testCases = cucumberAdapter.getTestCases(eventBroadcaster, features, pickleFilter)
			;

			if (features.length === 0) { return cucumberAdapter.karma.complete({ coverage: window.__coverage__ }); }
			cucumberAdapter.runFeatures(eventBroadcaster, eventDataCollector, testCases, stepUrls);
		}

		getTestCases(eventBroadcaster, features, pickleFilter) {
			return new Promise((resolve, reject) => {
				var 
					totalFeatures = features.length - 1,
					_testCases = []
				;

				function finalize(featureIndex, testCases) {
					if (featureIndex === totalFeatures) {
						resolve(testCases);
					}
				}

				features.forEach((feature, index) => {
					Cucumber
						.getTestCases({
							eventBroadcaster: eventBroadcaster,
							pickleFilter: pickleFilter,
							source: feature[1],
							uri: feature[0]
						})
						.then((testCases) => { 
							testCases.forEach((test) => {
								_testCases.push(test);
							});

							finalize(index, _testCases);
						})
						.catch(reject)
					;
				});
			});
			
		}

		logTestStep(status) {
			var 
				testCase = status.testCase,
				cucumberAdapter = this,
				cucumberTestCase = cucumberAdapter.testCaseCache[testCase.sourceLocation.uri + testCase.sourceLocation.line],
				cucumberTestStep = new CucumberTestStep(status), 
				isCucumber6Plus = testCase.attemptNumber !== undefined,
				result = {
					id: cucumberTestStep.getId(),
					description: cucumberTestStep.getDescription(),
					log: [],
					suite: [cucumberTestCase.getFeatureDescription(), cucumberTestCase.getScenarioDescription()],
					success: false,
					skipped: false,
					time: convertToMillis(cucumberTestStep.result.duration, isCucumber6Plus)
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

					Object.keys(error).forEach((key) => {
						errorMessage += "\n" + key + ": " + error[key];
					});
					result.log.push("Step: " + result.id + errorMessage);
			}

			cucumberAdapter.karma.result(result);
		}

		runFeatures(eventBroadcaster, eventDataCollector, testCases, stepUrls) {
			var 
				cucumberAdapter = this,
				_supportCodeLibrary = cucumberAdapter.getSupportCodeLibrary(stepUrls)
			;

			_supportCodeLibrary	
				.then((supportCodeLibrary) => {
					var 
						formatterOptions = {
							colorsEnabled: true,
							cwd: '/',
							eventBroadcaster: eventBroadcaster,
							eventDataCollector: eventDataCollector,
							log: (stdout) => {
								stdout = stdout.trim();
								if (stdout === "") { return; }
								cucumberAdapter.log.push(stdout);
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
			
					eventBroadcaster.on("test-case-prepared", (status) => { cucumberAdapter.createTestCase(status); });
					eventBroadcaster.on("test-step-finished", (status) => { cucumberAdapter.logTestStep(status); });
			
					cucumberInstance
						.start()
						.then((success) => {
							cucumberAdapter.checkAllFeaturesTested(success);
						})
						.catch((error) => {
							cucumberAdapter.checkAllFeaturesTested(error);
						})
					;
				})
				.catch((error) => {
					cucumberAdapter.checkAllFeaturesTested(error);
				})
			;

		}
	}
	
	const adapter = new CucumberAdapter(__karma__);	
	__karma__.start = adapter.getStart();

})(typeof window !== 'undefined' ? window : global);
