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

// Define controllers
// Navigation page controller
financeApp.controller('navController', ['$scope', '$resource', '$cookies', '$location', function ($scope, $resource, $cookies, $location) {
	// Set default values
	$scope.resultList = [];
	$scope.cookieExp = moment().add(3, 'months').toDate();
	$scope.dataLoaded = true;
	$scope.codesList = [];

	// Update watchlist item stock prices
	$scope.updateWatchItem = function (items) {

		sqlstring = items.join("\",\"");

		var financeAPI = $resource('https://query.yahooapis.com/v1/public/yql', {callback: "JSON_CALLBACK" }, {get: {method: "JSONP"}});		
		financeAPI.get({q: decodeURIComponent('select%20*%20from%20yahoo.finance.quote%20where%20symbol%20in%20(%22' + sqlstring + '%22)'),
				format: 'json', env: decodeURIComponent('store%3A%2F%2Fdatatables.org%2Falltableswithkeys')})
		.$promise.then(function (response) {
				var quotes = response.query.results.quote;
				quotes = Array.isArray(quotes) ? quotes : [quotes];
				quotes.forEach(function (quote) {
					$scope.createWatchItem(quote);
				});

			}, function (error) {
				alert("ERROR: There was an issue accessing the finance API service.");
			});
	};

	// Add a new watchlist item (triggered on button click)
	$scope.newWatchItem = function () {
		var newcode = $scope.asxcodeinput;

		if (newcode == null) {
			alert('Please enter a valid ASX equities code...');
			return;
		}
		else if ($scope.codesList.indexOf(newcode + '.AX') > -1) {
			alert('You are already tracking ' + newcode.toUpperCase() + '!');
			return;
		}

		$scope.dataLoaded = false;

		var financeAPI = $resource('https://query.yahooapis.com/v1/public/yql', {callback: "JSON_CALLBACK" }, {get: {method: "JSONP"}});		
		financeAPI.get({q: decodeURIComponent('select%20*%20from%20yahoo.finance.quote%20where%20symbol%20in%20(%22' + newcode + '.AX%22)'),
				format: 'json', env: decodeURIComponent('store%3A%2F%2Fdatatables.org%2Falltableswithkeys')})
		.$promise.then(function (response) {
				$scope.dataLoaded = true;
				var quote = response.query.results.quote;

				if(quote.StockExchange != null) {
					$scope.createWatchItem(quote);
					$cookies.putObject('codesCookie', $scope.codesList, {expires: $scope.cookieExp});
					$location.path('/' + (quote.Symbol).split('.')[0].toUpperCase());
				}
				else {
					alert("Woops! Looks like that stock doesn't exist :(");
				}
			}, function (error) {
				alert("ERROR: There was an issue accessing the finance API service.");
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
	$scope.createWatchItem = function (quote) {
		$scope.resultList.push(quote);
		$scope.codesList.push(quote.Symbol);
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
financeApp.controller('chartController', ['$scope', '$resource', '$routeParams', 'rangeService', function ($scope, $resource, $routeParams, rangeService) {
	// Set default values
	$scope.asxcode = $routeParams.asxcode;
	$scope.range = $routeParams.range || rangeService.range;
	$scope.enddate = moment();
	$scope.dataLoaded = false;

	// Update the rangeService range value when the local scope range is changed
	$scope.$watch('range', function () {
		rangeService.range = $scope.range;
	});

	// Convert finance API date data to date format for chart library
	$scope.convertForChart = function (quotes) {
		var newdata = [];
		quotes.forEach(function (quote) {
			newdata.push([moment(quote['Date']).valueOf(), parseFloat(quote['Adj_Close'])]);
		});
		newdata = newdata.sort($scope.sortDates());
		return newdata;
	};

	// Sort dates for charting
	$scope.sortDates = function (a,b) {
		function sortFunction(a, b) {
		    if (a[0] === b[0]) {
		        return 0;
		    }
		    else {
		        return (a[0] < b[0]) ? -1 : 1;
		    }
		}
	};
	
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

	financeAPI = $resource('https://query.yahooapis.com/v1/public/yql', {callback: "JSON_CALLBACK" }, {get: {method: "JSONP"}});		
	financeAPI.get({q: decodeURIComponent('select%20Date%2CAdj_Close%20from%20yahoo.finance.historicaldata%20where%20symbol%20%3D%20%22' + $scope.asxcode + '.AX%22%20and%20startDate%20%3D%20%22' + moment($scope.startdate).format('YYYY-MM-DD') + '%22%20and%20endDate%20%3D%20%22' + moment($scope.enddate).format('YYYY-MM-DD') + '%22'),
		format: 'json', env: decodeURIComponent('store%3A%2F%2Fdatatables.org%2Falltableswithkeys')})
		.$promise.then(function (response) {
			$scope.rawquotes = response.query.results.quote;
			$scope.dataLoaded = true;

			$scope.quotes = $scope.convertForChart($scope.rawquotes);

		}, function (error) {
			console.log(error);
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