function runTrendDetection(algorithmIds){
    var clusterIndex = TrendsPage.map.getSelectedClusterIndex();

    if (clusterIndex < 0) {
        modalMessage('No cluster selected');
        return;
    }

    var algoCount = algorithmIds.length;

    TrendsPage.results = '';
    TrendsPage.completedAlgoCount = 0;

    $('#processingModal').modal();
    GETIOM.trendDetectionTime = Date.now();

    for (var i=0; i<algoCount; ++i){

        var algorithmId = algorithmIds[i];
        var algorithm = GETIOM.trendAlgorithms[algorithmId];

        var params = '';
        var count = 0;

        for (var param in algorithm.params) {
            if (count > 0) {
                params += '&';
            }
            params += param + '=' + $('input[name="'+algorithmId+'_' + param +'"]').val();
        }

        $.getJSON('trends/'+algorithmId+'/'+clusterIndex+'?'+params, getCallback(algorithmId, algorithm, algoCount))
            .error(function() {
                $('#processingModal').modal('hide');
                modalMessage('Error!<br> Failed to run trend algorithm.<br>Check that the server is up and running');
            });

    }
}


function getCallback(algorithmId, algorithm, algoCount) {
    return function (data) {
        TrendsPage.completedAlgoCount++;

        var plotDataArray = $.extend(true, [], algorithm.plotData); // Cloning needed because we're changing it.
        var plotOptions = algorithm.plotOptions;

        if (!data || data.trendsNum === 0) {
            TrendsPage.results += 'No trends found for '+ algorithm.name +'!' + '<br><br>';
        }
        else {
            TrendsPage.results +=
                algorithm.name + '<br>' +
                'Messages: ' + data.messagesNum + '<br>' +
                'Days: ' + data.daysNum + '<br>' +
                'Trends: ' + data.trendsNum + '<br><br>';

            if (TrendsPage.completedAlgoCount === 1) {
                ResultsPage.init();
            }

            $('#results').show(); // Essential for flot graphs

            plotDataArray.forEach(function (plotData) {
                plotData.data = data[plotData.data];
            });

            $('#' + algorithmId + '_results').show();
            $.plot('#' + algorithmId + '_results_graph', plotDataArray, plotOptions);

            $('#results').hide()
        }
        if (TrendsPage.completedAlgoCount >= algoCount) {
            GETIOM.trendDetectionTime = (Date.now()-GETIOM.trendDetectionTime) / 1000;
            $('#processingModal').modal('hide');
            modalMessage(TrendsPage.results);
            moveTo('results');
        }
    }
}

var TrendsPage = {
    map: null,
    trendForm: null,
    results: '',
    completedAlgoCount: 0,
    init: function() {
        this.completedAlgoCount = 0;
        if (!TrendsPage.trendForm) {
            var trendAlgorithms = GETIOM.trendAlgorithms;
            TrendsPage.trendForm = AlgorithmsForm(trendAlgorithms, 'trend_algo_select', 'trend_param_panel', runTrendDetection, true); //TODO new?
            TrendsPage.trendForm.init();
        }
        var map = new Map($('#resultsMap')[0]);
        this.map = map;
        map.init(40.821715, -74.122381);               //TODO optimize zoom and location to display results
        TrendsPage.loadPolygons(map);   //TODO use self instead of TrendsPage
    },
    loadPolygons: function (map) {
        for (var i=0; i < GETIOM.convexHulls.length; ++i) {
            var hull = GETIOM.convexHulls[i];
            var hullPoints = hull.map(function (point) {
                return new google.maps.LatLng(point[0], point[1]);
            });
            map.addClusterPolygon(hullPoints, GETIOM.clusterSizeArray[i]);
        }
    }
}

$(document).ready(function() {
    $('#submitTrend').click(function() {
        TrendsPage.trendForm.submit();
    });
});