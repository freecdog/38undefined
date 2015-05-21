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

        function emptyFunction(){}
        var lastAction = emptyFunction;

        init();

        function init(){
            $scope.checkboxes = [false, false, false, false, false, false, false, false, false, false];

            $scope.game = {};

            $scope.loadingPoints = "";
            $scope.loading = false;

            $scope.restartString = "";

            lastAction = emptyFunction;
        }

        function applyImagesForView(imageList, rowsCount){
            if (!imageList) {
                console.warn('Looks like imageList is empty. Here it is:', imageList);
                return [];
            }
            var appliedImages = [];
            for (var i = 0, counter = 0; i < rowsCount; i++){
                var recArray = [];
                for (var j = 0; j < i+1; j++){
                    recArray.push({
                        //index: i == 0 ? j : i == 1 ? 1 + j : i == 2 ? 3 + j : 6 + j,
                        index: counter,
                        name: imageList[counter]
                    });
                    counter++;
                }
                appliedImages.push(recArray);
            }
            // reverse array
            for (var i = 0, length2 = appliedImages.length / 2; i < length2; i++){
                var recSwapArray = [];
                recSwapArray = appliedImages[i];
                appliedImages[i] = appliedImages[appliedImages.length - i - 1];
                appliedImages[appliedImages.length - i - 1] = recSwapArray;
            }
            return appliedImages;
        }
        function calculateResults(){
            var game = $scope.game;
            var rounds = game.rounds;
            var pId = game.myPlayerIndex;
            var results = [];

            // each player with each other
            for (var i = 0; i < game.names.length; i++){
                var result = {
                    perceptions: []
                };
                for (var j = 0; j < game.names.length; j++){
                    if (i != j) {
                        var coincidences = 0.0;
                        var suggestion = rounds[i][1].indices;
                        var choice = rounds[j][0].indices;
                        for (var p = 0; p < suggestion.length; p++){
                            for (var q = 0; q < choice.length; q++){
                                if (suggestion[p] == choice[q]) {
                                    coincidences += 1.0;
                                    break;
                                }
                            }
                        }
                        result.perceptions.push(coincidences / suggestion.length);

                    } else {
                        result.perceptions.push(1.46);
                    }
                }
                results.push(result);
                console.log("result:", result);
            }

            return results;
        }

        function processGameData(data){
            angular.extend($scope.game, data);
            //if ($scope.game.rounds[game.myPlayerIndex].length == 0){}
        }

        this.refreshIt = function(){
            console.log('trying to refresh');
            getImages();
        };

        $scope.giveup = function(callback){
            $scope.loading = true;

            $http.get('/api/giveup')
                .success(function(data){
                    init();
                    callback();
                })
                .error(function(err){
                    console.log("give up failed :C, trying one more time, error:", err);

                    lastAction = $scope.giveup(callback);
                });
        };

        $scope.connect = function(){
            $scope.loading = true;
            $scope.restartString = "re";

            var game = $scope.game;
            if (game.rounds) {
                $scope.giveup(function(){
                    doConnect();
                });
            } else {
                doConnect();
            }

            function doConnect(){
                $http.get('/api/connectPlayer').success(function(data){
                    console.log("data fetched, from connect", data);
                    $scope.sessionID = data.sessionID;

                    // !!!auto
                    $scope.findGame();
                }).error(function(err){
                    console.log("connection failed, trying one more time, error:", err);

                    lastAction = $scope.connect;
                });
            }

        };
        $scope.disconnect = function(){
            $http.get('/api/disconnectPlayer').success(function(data){
                console.log("data fetched, from disconnect", data);

                lastAction = emptyFunction;
            });
        };

        $scope.findGame = function(){
            $scope.loading = true;

            $http.get('/api/findGame').success(function(data){
                console.log("data fetched, from find:", data);
                if (!data || typeof(data) !== "object") {
                    console.warn("game data is empty, unfortunately. Data:", data);
                } else {
                    processGameData(data);

                    if ($scope.game.rounds !== undefined) {
                        if ($scope.game.myPlayerIndex == undefined) $scope.game.myPlayerIndex = $scope.game.playerIndex;

                        updateGameField();

                        $scope.loading = false;

                        // !!!auto
                        //$scope.getDice();
                        lastAction = getGameData;
                    } else {
                        console.log("game wasn't found yet.", $scope.game);

                        lastAction = $scope.findGame;
                    }
                }
            });
        };
        $scope.stopFindGame = function(){
            $http.get('/api/stopFindGame')
                .success(function(data){
                    console.log("stop find a game", data);

                    lastAction = emptyFunction;
                })
                .error(function(data){
                    console.log("error is ", data);
                });
        };

        $scope.verify = function(count){
            var counter = 0;
            for (var i = 0; i < $scope.checkboxes.length; i++){
                if ($scope.checkboxes[i]) counter++;
            }
            console.log("verification:", counter == count);
            return counter == count;
        };
        $scope.send = function(){
            var indices = "";
            for (var i = 0; i < $scope.checkboxes.length; i++){
                if ($scope.checkboxes[i]) indices += i.toString();
            }
            $http.get("/api/favoriteImages/" + indices)
                .success(function(data){
                    console.log("new data:", data);

                    processGameData(data);
                    updateGameField();

                    $scope.checkboxes = [false, false, false, false, false, false, false, false, false, false];
                })
                .error(function(data){
                    console.log("error is ", data);
                });
        };


        function getGameData(){
            $http.get('/api/game/' + $scope.game._id).success(function(data){
                console.log("data fetched, from getdata", data);

                processGameData(data);
                updateGameField();

                if ($scope.game.results != null) {
                    //alert(JSON.stringify($scope.game.winner));
                    console.log("results from getGameData:", $scope.game.results);

                    lastAction = emptyFunction;
                } else {
                    lastAction = getGameData;
                }

            });
        }

        function updateGameField(){
            var game = $scope.game;
            if (!game) {
                console.log("game isn't initialized yet");
            } else {
                var pId = game.playerIndex;
                var rounds = game.rounds[pId];

                if (rounds.length == 0){
                    $scope.imagesForView = applyImagesForView($scope.game.images, 4);
                } else if (rounds.length == 1) {
                    var newImages = [];
                    var indices = rounds[0].indices;
                    for (var i = 0; i < indices.length; i++){
                        newImages.push($scope.game.images[ indices[i] ]);
                    }
                    $scope.imagesForView = applyImagesForView(newImages, 3);
                }

                if (game.status == 90){

                    console.log("trying calculate results");

                    if (typeof(game.results) == "string"){
                        game.results = calculateResults();
                    }


                }
                if (game.status == -1){
                    console.warn("unfortunately, game was abandoned, trying to get new one");
                    $scope.connect();
                }
            }
        }

        function autoUpdater(){
            //console.log('autoUpdater', $scope.game.myPlayerIndex, $scope.game);
            lastAction();

            if ($scope.loading){
                $scope.loadingPoints += ".";
                if ($scope.loadingPoints.length > 3) $scope.loadingPoints = "";
            }

            setTimeout(autoUpdater, 1000);
        }
        setTimeout(autoUpdater, 1000);

    }]);

    jPGControllers.controller('TabController', function(){
        this.curTab = 0;

        this.setTab = function(tabIndex){
            this.curTab = tabIndex;
        };
        this.isSet = function(tabIndex){
            return this.curTab === tabIndex;
        };
    });

    jPGControllers.controller('GalleryController', function(){
        this.curTab = 2;

        this.setTab = function(tabIndex){
            this.curTab = tabIndex;
        };
        this.isSet = function(tabIndex){
            return this.curTab === tabIndex;
        };
    });

})(angular);