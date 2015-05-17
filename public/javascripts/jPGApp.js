/**
 * Created by jaric on 15.05.2015.
 */

(function (angular){

    "use strict";

    console.log("angular is here:", angular);

    var jPGApp = angular.module('jPGApp', [
        //'ngRoute',
        'jPGControllers'
    ]);
    console.log("jPGApp", jPGApp);

    //jPGApp.config(['$routeProvider',function($routeProvider) {
    //    $routeProvider.
    //        when('/', {
    //            templateUrl: 'partials/predictionGame.html',
    //            controller: 'jPredictionGameController'
    //        }).
    //        otherwise({
    //            redirectTo: '/'
    //        });
    //}]);

})(angular);