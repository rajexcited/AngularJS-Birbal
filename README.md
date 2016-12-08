Due to lack of time and resource availability, There will not be any further enhancements.

# AngularJS-Birbal
Learn Angular performance effects. It provides extra eye to developer for ngApp.

##[Chrome Webstore link](https://chrome.google.com/webstore/detail/lpgcgfldhlpcekibknamgefpbifakkai)
##[Group Discussion](https://groups.google.com/forum/#!forum/angularjs-birbal)

Features include:
  - digest cycle list with details
  - filter capability to debug and analyze
  - watch details
  - effects of custom and browser events 
  - effect of http

It is in initial phase of developement.
Goal is to provide angular developers more run-time information of the application.

## Roadmap:
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

  - run example and inspect this extension,

    ```
    npm run build
    grunt connect:example
    ```

####Inspirational Projects:
- [AngularJS Batarang] (https://github.com/angular/batarang)
- [Angular-performance] (https://github.com/Linkurious/angular-performance)
- [AngularJS dependency graph] (https://github.com/filso/ng-dependency-graph)
- [AngularJS] (https://github.com/angular/angular.js)


## License
  [MIT] (https://github.com/rajexcited/AngularJS-Birbal/blob/master/LICENSE)
