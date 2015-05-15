/**
 * Created by jaric on 15.05.2015.
 */

(function (angular){

    "use strict";

    console.log("jPGControllers", angular);

    var jPGControllers = angular.module('jPGControllers', []);

    jPGControllers.controller('jPredictionGameController', ['$scope', '$http', function($scope, $http) {

        init();

        function init(){
            getImages();

            $scope.checkboxes = [false, false, false, false, false, false, false, false, false, false];
            $scope.checkboxes1 = [false, false, false, false, false];
            $scope.checkboxes2 = [false, false, false, false, false];
        }

        function getImages(){
            $scope.images1 = [];
            $scope.images2 = [];
            $http.get('/api/images/10').success(function(data){
                console.log("images fetched", data);
                $scope.images1 = data.images1;
                $scope.images2 = data.images2;

                $scope.images = [];
                for (var i = 0; i < data.images1.length; i++){
                    $scope.images.push(data.images1[i]);
                }
                for (var i = 0; i < data.images2.length; i++){
                    $scope.images.push(data.images2[i]);
                }

                $scope.imagesForView = [];
                for (var i = 0, counter = 0; i < 4; i++){
                    var recArray = [];
                    for (var j = 0; j < i+1; j++){
                        recArray.push($scope.images[counter]);
                        counter++;
                    }
                    $scope.imagesForView.push(recArray);
                }
                // reverse array
                for (var i = 0, length2 = $scope.imagesForView.length / 2; i < length2; i++){
                    var recSwapArray = [];
                    recSwapArray = $scope.imagesForView[i];
                    $scope.imagesForView[i] = $scope.imagesForView[$scope.imagesForView.length - i - 1];
                    $scope.imagesForView[$scope.imagesForView.length - i - 1] = recSwapArray;
                }
                console.log($scope.imagesForView);

            });
        }

        this.refreshIt = function(){
            getImages();
        };
    }]);

})(angular);