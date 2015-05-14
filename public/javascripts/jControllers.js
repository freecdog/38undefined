/**
 * Created by jaric on 14.05.2015.
 */

(function (angular){

    "use strict";

    console.log("jControllers", angular);

    var jControllers = angular.module('jControllers', []);

    jControllers.controller('jImagesController', ['$scope', '$http', function($scope, $http) {

        // till http request doesn't processed there will be temp data
        $scope.jElements = [
            {
                'name': 'Qwe',
                'snippet': 'qsc qscr'
            },
            {
                'name': 'Asd',
                'snippet': 'axe axef'
            },
            {
                'name': 'Zxc',
                'snippet': 'zwd zwdv'
            }
        ];

        $http.get('/api/images').success(function(data){
            console.log("images fetched", data);
            $scope.jElements = data;
        });
    }]);

})(angular);