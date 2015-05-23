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
            $scope.overallPrediction = {
                value: 0,
                attempts: 0,
                gamesIds: []
            };

            $scope.restartString = "";

            restartLevel();
        }

        function restartLevel(){
            $scope.checkboxes = [false, false, false, false, false, false, false, false, false, false];

            $scope.game = {};

            $scope.loadingDots = "";
            $scope.loading = false;

            lastAction = emptyFunction;
        }

        function applyImagesForView(imageList, rowsCount, indices){
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
                        index: indices == null ? counter : indices[counter],
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
            var predictions = [], samePredictions = [], sameImages = [], averages = [];
            var ans = {
                haveResults: true,
                message: "",
                predictions: predictions,
                samePredictions: samePredictions,
                sameImages: sameImages,
                averages: averages
            };

            var canCalculate = true;
            var standardLength = 2;
            for (var i = 0; i < rounds.length; i++){
                if (rounds[i].length == standardLength) {
                    for (var j = 0; j < rounds[i].length; j++) {
                        if (rounds[i][j].hasOwnProperty('indices') == false) {
                            canCalculate = false;
                            break;
                        }
                    }
                } else {
                    canCalculate = false;
                    break;
                }
            }

            if (canCalculate){
                // each player with each other
                for (var i = 0; i < game.names.length; i++){
                    var playerPrediction = [];
                    var samePrediction = [];
                    var sameImage = [];
                    var average = [];
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
                            playerPrediction.push(coincidences / suggestion.length);

                            var samePredictionCoincidences = 0.0;
                            var predictionPlayeri = rounds[i][1].indices;
                            var predictionPlayerj = rounds[j][1].indices;
                            for (var p = 0; p < predictionPlayeri.length; p++){
                                for (var q = 0; q < predictionPlayerj.length; q++){
                                    if (predictionPlayeri[p] == predictionPlayerj[q]) {
                                        samePredictionCoincidences += 1.0;
                                        break;
                                    }
                                }
                            }
                            samePrediction.push(samePredictionCoincidences / predictionPlayeri.length);

                            var sameImageCoincidences = 0.0;
                            var imagesPlayeri = rounds[i][0].indices;
                            var imagesPlayerj = rounds[j][0].indices;
                            for (var p = 0; p < imagesPlayeri.length; p++){
                                for (var q = 0; q < imagesPlayerj.length; q++){
                                    if (imagesPlayeri[p] == imagesPlayerj[q]) {
                                        sameImageCoincidences += 1.0;
                                        break;
                                    }
                                }
                            }
                            sameImage.push(sameImageCoincidences / imagesPlayeri.length);

                            average.push( (coincidences / suggestion.length + samePredictionCoincidences / predictionPlayeri.length + sameImageCoincidences / imagesPlayeri.length) / 3 );

                        } else {
                            playerPrediction.push(1.46);
                            samePrediction.push(1.46);
                            sameImage.push(1.46);
                            average.push(1.46);
                        }
                    }
                    predictions.push(playerPrediction);
                    samePredictions.push(samePrediction);
                    sameImages.push(sameImage);
                    averages.push(average);
                }
            } else {
                ans.haveResults = false;
                ans.message = "Game was abandoned, my apologize. Please, start new one";
            }

            return ans;
        }
        function calculateOverallPrediction(prediction, game){
            var needCalculate = true;
            for (var i = 0; i < prediction.gamesIds.length; i++){
                if (game._id == prediction.gamesIds[i]){
                    needCalculate = false;
                    break;
                }
            }
            if (needCalculate){
                //var newValue = ((prediction.value * prediction.attempts) + game.results.predictions[game.myPlayerIndex][1 - game.myPlayerIndex] ) / (prediction.attempts + 1);
                var newValue = ((prediction.value * prediction.attempts) + game.results.averages[game.myPlayerIndex][1 - game.myPlayerIndex] ) / (prediction.attempts + 1);
                prediction.value = newValue;
                prediction.attempts++;
                prediction.gamesIds.push(game._id);
            } else {
                console.log("No need to recalculate overall prediction");
            }
        }

        function processGameData(data){
            angular.extend($scope.game, data);
            //if ($scope.game.rounds[game.myPlayerIndex].length == 0){}
        }

        $scope.giveup = function(callback){
            $scope.loading = true;

            $http.get('/api/giveup')
                .success(function(data){
                    restartLevel();
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
                        $scope.loadingDots = "";

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

        $scope.$watch('checkboxes', function(newValue){
            var cntr = 0;
            for (var i = 0; i < $scope.checkboxes.length; i++) if ($scope.checkboxes[i] == true) cntr++;

            if (cntr >= 0 && cntr < 3) $scope.send6ButtonClass = "btn-default";
            else if (cntr >= 3 && cntr < 6) $scope.send6ButtonClass = "btn-warning";
            else if (cntr == 6 ) $scope.send6ButtonClass = "btn-success";
            else $scope.send6ButtonClass = "btn-warning";

            if (cntr >= 0 && cntr < 1) $scope.send4ButtonClass = "btn-default";
            else if (cntr >= 1 && cntr < 4) $scope.send4ButtonClass = "btn-warning";
            else if (cntr == 4 ) $scope.send4ButtonClass = "btn-success";
            else $scope.send4ButtonClass = "btn-warning";

        }, true);

        function getGameData(){
            $http.get('/api/game/' + $scope.game._id).success(function(data){
                console.log("data fetched, from getdata", data);

                processGameData(data);
                updateGameField();

                if ($scope.game.status == 90) {
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
                    $scope.imagesForView = applyImagesForView(newImages, 3, indices);
                }

                if (game.status == 90){
                    console.log("trying calculate results");

                    $scope.restartString = "";

                    if (typeof(game.results) == "string"){
                        game.results = calculateResults();
                        if (game.results.haveResults){
                            calculateOverallPrediction($scope.overallPrediction, game);
                        }
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
                $scope.loadingDots += ".";
                if ($scope.loadingDots.length > 3) $scope.loadingDots = "";
            }

            setTimeout(autoUpdater, 1000);
        }
        setTimeout(autoUpdater, 1000);

    }]);

    jPGControllers.controller('TabController', function(){
        this.curTab = 1;

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

    jPGControllers.controller('TODOController', ['$scope', '$http', function($scope, $http){

        init();

        function init(){
            console.log("TODOController initializing");

            $scope.TODOs = [];
            clearTODO();

            $http.get('/api/todos')
                .success(function(data){
                    console.log("TODOs", data);
                    $scope.TODOs = data;
                })
                .error(function(err){
                    console.log("TODOs list was not sent, error:", err);
                });
        }

        function clearTODO(){
            $scope.newTODO = {
                concentration: "back-end",
                glyphicon: "glyphicon-remove",
                glyphiconColor: "",
                text: "",
                author: "",
                createdOn: ""
            };
        }

        this.addTODO = function(){
            console.log('trying to add, TODO:', $scope.newTODO);
            $scope.newTODO.createdOn = Date.now();

            $http.post('/api/todo', $scope.newTODO)
                .success(function(data) {
                    console.log("new todo posted successfully, response:", data);

                    $scope.TODOs.push($scope.newTODO);

                    clearTODO();
                })
                .error(function(err){
                    console.log("todo wasn't added, error:", err);
                });
        };
    }]);

    jPGControllers.directive('resultsView', function(){
        return {
            restrict: 'E',
            templateUrl: 'partials/results-view.html',
            controller: function(){
            },
            controllerAs: 'resultsView'
        };
    });

    jPGControllers.filter('percentage', ['$filter', function ($filter) {
        return function (input, decimals) {
            return $filter('number')(input * 100, decimals) + '%';
        };
    }]);

})(angular);