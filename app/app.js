// Define module
var financeApp = angular.module('financeApp', ['ngRoute','ngResource', 'ngCookies']);

// Define routes for SPA
financeApp.config(function ($routeProvider) {
   
    $routeProvider
    
    .when('/', {
        templateUrl: 'views/chart_init.html',
        controller: 'initController'
    })
    
    .when('/:asxcode', {
        templateUrl: 'views/chart.html',
        controller: 'chartController'
    })

    .when('/:asxcode/:range', {
        templateUrl: 'views/chart.html',
        controller: 'chartController'
    })
});

// Define filters
financeApp.filter('shortcode', function () {
	return function (input) {
		var output = input.split('.');
		return output[0];
	};
});

// Define custom services
financeApp.service('rangeService', function () {
	this.range = "month3";
});

// Define factories
financeApp.factory('yahooAPI', ['$resource', '$q', function yahooAPIFactory ($resource, $q) {
	var factory = {};

	factory.getQuote = function (asxcodes) {
		var deferred = $q.defer();

		var financeAPI = $resource('https://query.yahooapis.com/v1/public/yql', {callback: "JSON_CALLBACK" }, {get: {method: "JSONP"}});		
		financeAPI.get({q: decodeURIComponent('select%20*%20from%20yahoo.finance.quote%20where%20symbol%20in%20(%22' + asxcodes + '%22)'),
				format: 'json', env: decodeURIComponent('store%3A%2F%2Fdatatables.org%2Falltableswithkeys')})
		.$promise.then(function (response) {
			deferred.resolve(response);

		}, function (error) {
			deferred.reject(error);
		});

		return deferred.promise;
	};

	factory.getHistorical = function (asxcode, startdate, enddate) {
		var deferred = $q.defer();

		var financeAPI = $resource('https://query.yahooapis.com/v1/public/yql', {callback: "JSON_CALLBACK" }, {get: {method: "JSONP"}});		
		financeAPI.get({q: decodeURIComponent('select%20Date%2CAdj_Close%20from%20yahoo.finance.historicaldata%20where%20symbol%20%3D%20%22' + asxcode + '.AX%22%20and%20startDate%20%3D%20%22' + moment(startdate).format('YYYY-MM-DD') + '%22%20and%20endDate%20%3D%20%22' + moment(enddate).format('YYYY-MM-DD') + '%22'),
		format: 'json', env: decodeURIComponent('store%3A%2F%2Fdatatables.org%2Falltableswithkeys')})
		.$promise.then(function (response) {
			deferred.resolve(response);

		}, function (error) {
			deferred.reject(error);
		});

		return deferred.promise;

	};

	return factory;
}]);

financeApp.factory('dataManipulate', function dataManipulateFactory () {
	var factory = {};

	factory.convertForChart = function (quotes) {
		var newdata = [];
		quotes.forEach(function (quote) {
			newdata.push([moment(quote['Date']).valueOf(), parseFloat(quote['Adj_Close'])]);
		});

		return newdata;
	};

	factory.sortDates = function (a,b) {
		function sortFunction(a, b) {
		    if (a[0] === b[0]) {
		        return 0;
		    }
		    else {
		        return (a[0] < b[0]) ? -1 : 1;
		    }
		};
	};

	return factory;
});

// Define controllers
// Navigation page controller
financeApp.controller('navController', ['$scope', '$resource', '$cookies', '$location', '$window', 'yahooAPI', function ($scope, $resource, $cookies, $location, $window, yahooAPI) {
	// Set default values
	$scope.resultList = [];
	$scope.cookieExp = moment().add(3, 'months').toDate();
	$scope.dataLoaded = true;
	$scope.codesList = [];

	// Update watchlist item stock prices
	$scope.updateWatchItem = function (items) {

		asxcodes = items.join("\",\"");

		yahooAPI.getQuote(asxcodes).then(function (response) {
			var quotes = Array.isArray(response.query.results.quote) ? response.query.results.quote : [response.query.results.quote];
			$scope.createWatchItem(quotes);
		}, function (error) {
			$window.alert("ERROR: There was an issue accessing the finance API service.");
		});
	};

	// Add a new watchlist item (triggered on button click)
	$scope.newWatchItem = function (asxcode) {
		var newcode = asxcode + ".AX";

		if (newcode == null) {
			$window.alert('Please enter a valid ASX equities code...');
			return;
		}
		else if ($scope.codesList.indexOf(newcode) > -1) {
			$window.alert('You are already tracking ' + newcode.toUpperCase() + '!');
			return;
		}

		$scope.dataLoaded = false;

		yahooAPI.getQuote(newcode).then(function (response) {
			$scope.dataLoaded = true;
			var quotes = [response.query.results.quote];

			if(quotes[0].StockExchange != null) {
				$scope.createWatchItem(quotes);
				$cookies.putObject('codesCookie', $scope.codesList, {expires: $scope.cookieExp});
				$location.path('/' + (quotes[0].Symbol).split('.')[0].toUpperCase());
			}
			else {
				$window.alert("Woops! Looks like that stock doesn't exist :(");
			}				
		}, function (error) {
			$window.alert("ERROR: There was an issue accessing the finance API service.");
		});

		$scope.asxcodeinput = "";
	};

	// Delete a watchlist item (triggered on delete icon click)
	$scope.deleteWatchlistItem = function (asxcode) {
		$scope.resultList.forEach(function (result, key) {
			if(result.Symbol == asxcode) {
				$scope.resultList.splice(key, 1);
			}
		});
		$scope.codesList.forEach(function (code, key) {
			if(code == asxcode) {
				$scope.codesList.splice(key, 1);
			}
		});
		$cookies.putObject('codesCookie', $scope.codesList, {expires: $scope.cookieExp});

		$location.path('/');
	};

	// Add new watchlist item to lists of watched items
	$scope.createWatchItem = function (quotes) {
		quotes.forEach(function (quote) {
			$scope.resultList.push(quote);
			$scope.codesList.push(quote.Symbol);
		});	
	};

	// Get current page for navigation menu CSS
	$scope.isActive = function (location) {
        return location === $location.path();
    };

    // If the cookie is set and not empty, populate the watchlist items with the cookie contents
	if($cookies.getObject('codesCookie') && $cookies.getObject('codesCookie').length > 0) {
		$scope.updateWatchItem($cookies.getObject('codesCookie'));
	}
}]);

// Initial chart controller
financeApp.controller('initController', ['$scope', function ($scope) {

}]);

// Chart window controller
financeApp.controller('chartController', ['$scope', '$log', '$resource', '$routeParams', 'rangeService', 'yahooAPI', 'dataManipulate', function ($scope, $log, $resource, $routeParams, rangeService, yahooAPI, dataManipulate) {
	// Set default values
	$scope.asxcode = $routeParams.asxcode;
	$scope.range = $routeParams.range || rangeService.range;
	$scope.enddate = moment();
	$scope.dataLoaded = false;

	// Update the rangeService range value when the local scope range is changed
	$scope.$watch('range', function () {
		rangeService.range = $scope.range;
	});

	// Set chart start dates based on range value selected
	switch($scope.range) {
		case 'week':
			$scope.startdate = moment($scope.enddate).subtract(1, 'weeks');
			break;

		case 'month':
			$scope.startdate = moment($scope.enddate).subtract(1, 'months');
			break;

		case 'month3':
			$scope.startdate = moment($scope.enddate).subtract(3, 'months');
			break;

		case 'month6':
			$scope.startdate = moment($scope.enddate).subtract(6, 'months');
			break;

		case 'year':
			$scope.startdate = moment($scope.enddate).subtract(1, 'years');	
			break;
	};

	yahooAPI.getHistorical($scope.asxcode, $scope.startdate, $scope.enddate).then(function (response) {
		$scope.quotes = dataManipulate.convertForChart(response.query.results.quote).sort(dataManipulate.sortDates());
		$scope.dataLoaded = true;
	}, function (error) {
		$log.error(error);
	});	


}]);

// Define directives
financeApp.directive('watchlistItem', function () {
	return {
		restrict: 'E',
		templateUrl: 'app/directives/watchlistItem.html',
		replace: true,
		scope: {
			resultObj: "=",
			deleteWatchlistItem: "&",
			hoverDelete: "&",
			isActive: "&"
		}
	}
});

financeApp.directive('stockChart', function () {
	return {
		restrict: 'C',
		replace: 'true',
		scope: {
			data: '='
		},
		template: '<div id="chartContainer" style="margin: 0 auto">not working</div>',
		link: function (scope, element, attrs) {
			var chart = new Highcharts.Chart({
				chart: {
					renderTo: 'chartContainer'
				},
				rangeSelector : {
	                selected : 1
	            },

	            title : {
	                text : scope.$parent.asxcode + ' Price History'
	            },

	            xAxis: {
		            type: 'datetime',
		            dateTimeLabelFormats: {
		                second: '%Y-%m-%d<br/>%H:%M:%S',
		                minute: '%Y-%m-%d<br/>%H:%M',
		                hour: '%Y-%m-%d<br/>%H:%M',
		                day: '%Y<br/>%m-%d',
		                week: '%Y<br/>%m-%d',
		                month: '%Y-%m',
		                year: '%Y'
		            }
		        },
		        exporting: {
		        	enabled: false
		        },
		        credits: {
		        	enabled: false
		        },

		     	yAxis: {
		     		title: {
		     			text: "Price ($AUD)"
		     		}
		     	},

	            series : [{
	                name : scope.$parent.asxcode + ' Stock Price',
	                id : 'primary',
	                data : scope.data,
	                marker : {
	                    enabled : true,
	                    radius : 3
	                },
	                shadow : true,
	                tooltip : {
	                    valueDecimals : 2
	                }
	            }, {
	            	name: '12-day EMA',
	                linkedTo: 'primary',
	                showInLegend: true,
	                type: 'trendline',
	                algorithm: 'EMA',
	                periods: 12
	            }, 
	            	{
	            	name: '26-day EMA',
	                linkedTo: 'primary',
	                showInLegend: true,
	                type: 'trendline',
	                algorithm: 'EMA',
	                periods: 26
	            }]
			});
		}
	}
});