# AngularJS-Birbal
Learn Angular App. It's an analysis tool. performance analysis, architecture analysis, avoid server calls using Http mock.

##[Chrome Webstore link](https://chrome.google.com/webstore/detail/lpgcgfldhlpcekibknamgefpbifakkai)
##[Group Discussion Forum](https://groups.google.com/forum/#!forum/angularjs-birbal)

Features included (Highlights):
  - digest cycle list with details in table format
  - filter capability to debug and analyze watchers
  - watch details
  - effects of custom and browser events 
  - effect of http
  - detects auto(ngApp) or manual bootstrap
  - dependency graph of available modules to application
  - active dependency graph of modules injected for page or page-actions
  - Mock $http calls and develop faster without server.


To provide angular developers more run-time information of the application.
Due to lack of time and resource availability, There will not be any further enhancements 0.0.9

## Roadmap:
  - add examples
  - include automation test and build process.
  - Provide performance statistics for module.
  - ngView and ngRoute statistics
  - Provide dependency chart.
  - Provide real time map between modules.
  - learn and find memory leak
  - learn and find DOM leak

# How to Develop?

#### Requirements:
This project is setup using NodeJS/npm and grunt. 
### Getting Started:
  - Clone the repository: ``` git clone https://github.com/rajexcited/AngularJS-Birbal.git ``` 
  - run below commands in project folder.
      ```    
      npm install
      npm run build
      ```

  - use 'load unpacked extension' option from chrome extension developer mode.

  - to update, install, manage dependencies and clean dist, use this command
    ```
    npm run clean
    ```

  - run example and inspect this extension.
    ```
    npm run build
    grunt connect:example
    ```
  - Additional example is angular-phonecat.
  https://github.com/angular/angular-phonecat
  
 

####Inspirational Projects:
- [AngularJS Batarang] (https://github.com/angular/batarang)
- [Angular-performance] (https://github.com/Linkurious/angular-performance)
- [AngularJS dependency graph] (https://github.com/filso/ng-dependency-graph)
- [AngularJS] (https://github.com/angular/angular.js)


## License
  [MIT] (https://github.com/rajexcited/AngularJS-Birbal/blob/master/LICENSE)
