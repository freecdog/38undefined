/**
 * Created by jaric on 14.05.2015.
 */

(function (angular){

    "use strict";

    console.log("angular is here:", angular);

    var jApp = angular.module('jApp', [
        'ngRoute',
        'jControllers'
    ]);
    console.log("jApp", jApp);

    jApp.config(['$routeProvider',function($routeProvider) {
        $routeProvider.
            when('/', {
                templateUrl: 'partials/jImages.html',
                controller: 'jImagesController'
            }).
            otherwise({
                redirectTo: '/'
            });
    }]);

})(angular);