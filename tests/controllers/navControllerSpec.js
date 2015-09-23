describe('Unit: navController', function () {
	// Load the module containing the navcontroller
	beforeEach(module('financeApp'));

	var controller, scope;
	// Inject the controller and root scope
	beforeEach(inject(function ($controller, $rootScope) {
		// Create a new child scope of rootScope
		scope = $rootScope.$new();

		// Create the controller
		controller = $controller('navController', {
			$scope : scope
		});

	}));

	it('Expecting navcontroller variables to be initialised', function () {
		expect(scope.resultList).toEqual([]);
		expect(scope.dataLoaded).toBe(true);
		expect(scope.codesList).toEqual([]);
		expect(scope.cookieExp).toEqual(jasmine.any(Date));
	});

	it('Expecting updateWatchItem() to retrieve an array', function () {
		var testCookieData = ['s32', 'bhp', 'afi'];
	});

})