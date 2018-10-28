### [1.0.5] (https://github.com/mitcoding/karma-cucumber-js-latest/compare/v1.0.4...v1.0.5)
* bug fixes
** fixed null pointer issue in getDescription method that was causing the cucumber output to go silent, due to .trim() being called on an undefined object. 
### [1.0.4] (https://github.com/mitcoding/karma-cucumber-js-latest/compare/v1.0.3...v1.0.4)
* bug fixes
** changed cucumber-js report to summary format as it removed the need for array.pop to remove the progress dots which sometimes removed the entire output"
### [1.0.3] (https://github.com/mitcoding/karma-cucumber-js-latest/compare/v1.0.2...v1.0.3)
* bug fixes
** updated adapter so that karma.complete is called even their are no feature files
### [1.0.2] (https://github.com/mitcoding/karma-cucumber-js-latest/compare/v1.0.1...v1.0.2)
* updated readme to on how to correctly configure karma-cucumber-js in karma.conf.js
### [1.0.1] (https://github.com/mitcoding/karma-cucumber-js-latest/compare/v1.0.0...v1.0.1)
* bug fixes:
** updated adapter so that it checked if no step files existed so that cucumber can let you know what step files are needed to be created
### [1.0.0] (https://github.com/mitcoding/karma-cucumber-js-latest/tree/v1.0.0)
* intial commit of karma-cucumber-js-latest	
