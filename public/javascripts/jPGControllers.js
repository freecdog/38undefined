/**
 * Created by jaric on 15.05.2015.
 */

(function (angular){

    "use strict";

    console.log("jPGControllers", angular);

    var jPGControllers = angular.module('jPGControllers', []);

    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }
    function getSearchPlayersCount(){
        var defaultCount = '2';
        var localStorage = window.localStorage;
        if (!localStorage) return defaultCount;
        var searchPlayersCount = localStorage.getItem("searchPlayersCount");
        if (isNumber(searchPlayersCount)) {
            //searchPlayersCount = Math.floor(parseFloat(searchPlayersCount));
            return searchPlayersCount.toString();   // due to next usage as a string
        } else return defaultCount;
    }

    jPGControllers.controller('jPredictionGameController', ['$scope', '$http', function($scope, $http) {

        init();

        function init(){
            getImages();

            $scope.checkboxes = [false, false, false, false, false, false, false, false, false, false];
            $scope.checkboxes1 = [false, false, false, false, false];
            $scope.checkboxes2 = [false, false, false, false, false];
            console.warn('initialized, probably a lot of times =/');
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
            console.log('trying to refresh');
            getImages();
        };



        $scope.connect = function(){
            $http.get('/api/connectPlayer').success(function(data){
                console.log("data fetched, from connect", data);
                $scope.sessionID = data.sessionID;

                // !!!auto
                //$scope.findGame();
            });
        };

        $scope.findGame = function(){
            var searchPlayersCount = getSearchPlayersCount();
            $http.get('/api/findGame' + '/' + searchPlayersCount).success(function(data){
                console.log("data fetched, from find:", data);
                $scope.game = data;

                if ($scope.game.playersOnline == null) {
                    if ($scope.game.myPlayerIndex == undefined) $scope.game.myPlayerIndex = $scope.game.playerIndex;

                    // !!!auto
                    //$scope.getDice();
                } else {
                    console.log("game wasn't found yet");
                }
            });
        };
        $scope.stopFindGame = function(){
            $http.get('/api/stopFindGame').success(function(data){
                console.log("stop find a game", data);
            });
        };



    }]);

})(angular);