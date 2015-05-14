/**
 * Created by jaric on 14.05.2015.
 */

(function (angular){

    "use strict";

    console.log("jControllers", angular);

    var jControllers = angular.module('jControllers', []);

    jControllers.controller('jImagesController', ['$scope', '$http', function($scope, $http) {

        init();

        function init(){
            getImages();
        }

        function getImages(){
            $scope.jElements = {};
            $http.get('/api/images').success(function(data){
                console.log("images fetched", data);
                $scope.jElements = data;
            });
        }

        this.refreshIt = function(){
            getImages();
        };
    }]);

})(angular);