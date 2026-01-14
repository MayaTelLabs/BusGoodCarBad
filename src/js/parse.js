var Helper = require('helper');
var Save = require('save');
// Handle data parse services
var Parse = {};

Parse.stopList = function(data, region) {
  var list = [];
  if (region === "boston") {
    list = (data && data.data) || [];
  } else if (Helper.arrayContains(["pugetsound","newyork"], region)) {
    if (data && data.data) {
      list = data.data.list || data.data.stops;
      console.log('data.data is available.')
    }
  } else if (region === "portland") {
    list = data.resultSet && data.resultSet.location || [];
  } else if (region === "vancouver") {
    list = data || [];
  }
  return list || [];
}

Parse.stopDetail = function(data, stop, region) {
  var name = "";
  var id = "";
  var direction = "";
  var routes = [];
  var title = "";
  var subtitle = "";

  if (region === "pugetsound") {
    var routeIds = stop.routeIds || [];
    for (var k = 0; k < routeIds.length; k++ ) {
      var busDetail = Parse.busNameInfo(data, routeIds[k]);
      routes.push(busDetail ? busDetail.shortName : '');
    }
    title = stop.name || '';
    if (title.indexOf("&") > -1) {
      subtitle = title.substr(title.indexOf("&"));
      title = title.replace(subtitle, "");
    }
  } else if (region === "newyork") {
    var routeData = stop.routes || [];
    for (var k = 0; k < routeData.length; k++ ) {
      routes.push(routeData[k].shortName || '');
    }
    title = stop.name || '';
  } else if (region === "boston") {
    name = (stop && stop.attributes && stop.attributes.name) || '';
    id = (stop && stop.id) || '';
    title = name;
    subtitle = "";
    if (title && title.indexOf("@") > -1) {
      subtitle = title.substr(title.indexOf("@"));
      title = title.replace(subtitle, "");
    }
  } else if (region === "portland") {
    name = stop.desc || '';
    id = stop.locid || '';
    direction = stop.dir || '';
    title = stop.desc || '';
    if (title.indexOf("&") > -1) {
      subtitle = title.substr(title.indexOf("&"));
      title = title.replace(subtitle, "");
    } else if (title.indexOf("/") > -1) {
      subtitle = title.substr(title.indexOf("/"));
      title = title.replace(subtitle, "");
    }
  } else if (region === "vancouver") {
    name = (stop.Name || '').trim();
    id = stop.StopNo || '';
    title = (stop.Name || '').trim();
    routes = stop.Routes || [];
    if (title.indexOf("STN") > -1) {
      subtitle = title.substr(title.indexOf("STN"));
      title = title.replace(subtitle, "");
    } else if (title.indexOf(" AT ") > -1) {
      subtitle = title.substr(title.indexOf("AT"));
      title = title.replace(subtitle, "");
    } else if (title.indexOf("FS") > -1) {
      subtitle = title.substr(title.indexOf("FS"));
      title = title.replace(subtitle, "");
    } else if (title.indexOf("NS") > -1) {
      subtitle = title.substr(title.indexOf("NS"));
      title = title.replace(subtitle, "");
    }
    if (subtitle === "") {
      subtitle = routes;
    } else if ( routes != "" ) {
      subtitle = subtitle + ", " + routes;
    }
  }
  if (Helper.arrayContains(["pugetsound","newyork"], region)) {
    name = stop.name || '';
    id = stop.id || '';
    direction = stop.direction || '';
    if (subtitle.length > 0) {
      subtitle = subtitle + ', '
    }
    var routesToShow = (routes || []).toString();
    if (routesToShow.length > 0) {
      routesToShow = ', ' + routesToShow;
    }
    subtitle = subtitle + direction + routesToShow;
  }

  var stopDetailJSON = {
    name: name,
    id: id,
    direction: direction,
    title: title,
    subtitle: subtitle,
    routes: (routes || []).toString()
  };
  return stopDetailJSON;
}

Parse.busNameInfo = function(data, busId) {
  var routes = (data && data.data && data.data.references && data.data.references.routes) || [];
  for (var i = 0; i < routes.length; i++) {
    if (routes[i].id === busId) {
      return routes[i];
    }
  }
  return null;
}

Parse.stopIdsFromData = function(data, region) {
  var stopIds = [];
  var list = Parse.stopList(data, region) || [];
  var stopDetailInfo = {};
  for (var i = 0; i < list.length; i++) {
    try {
      stopDetailInfo = Parse.stopDetail(data, list[i], region);
      if (stopDetailInfo.title && stopDetailInfo.title.length > 0) {
        stopIds.push(stopDetailInfo.id ? stopDetailInfo.id.toString() : "");
      } else {
        console.log('title is blank for index ' + i);
      }
    } catch (e) {
      console.log('stopIdsFromData exception at index ' + i + ': ' + e);
    }
  }
  return stopIds;
}

Parse.stopListData = function(data, region) {
  var items = [];
  var list = Parse.stopList(data, region) || [];
  var stopDetailInfo = {};
  console.log('list length is ' + (list.length || 0));
  for (var i = 0; i < list.length; i++) {
    try {
      stopDetailInfo = Parse.stopDetail(data, list[i], region);
      if (stopDetailInfo.title && stopDetailInfo.title.length > 0) {
        items.push({
          title: stopDetailInfo.title,
          subtitle: stopDetailInfo.subtitle,
          busStopId: stopDetailInfo.id ? stopDetailInfo.id.toString() : "",
          stopName: stopDetailInfo.name,
          busStopdirection: stopDetailInfo.direction,
          routes: stopDetailInfo.routes
        });
      } else {
        console.log('title is blank for item ' + i);
      }
    } catch (e) {
      console.log('stopListData exception item ' + i + ': ' + e);
    }
  }

  if (items.length === 0) {
    items = [{
      title: "No Bus Stop Around",
      subtitle: "No bus stop in 260 m radius."
    }];
  }

  items.push({
    title: "Settings",
    subtitle: "BusGoodCarBad settings"
  })

  // Finally return whole array
  return items;
}

Parse.busRoutesData = function(busData, region, busStopId) {
  var busTimeItems = [];
  var nowTime = parseInt(Date.now());
  if (Helper.arrayContains(["pugetsound"], region)) {
    var arrivalsAndDepartures = (busData && busData.data && busData.data.entry && busData.data.entry.arrivalsAndDepartures) || [];
    for (var i = 0; i < arrivalsAndDepartures.length; i++)  {
      // Add to busTimeItems array
      var routeShortName = arrivalsAndDepartures[i].routeShortName;
      var predictedArrivalTime = parseInt(arrivalsAndDepartures[i].predictedArrivalTime);
      var scheduledArrivalTime = parseInt(arrivalsAndDepartures[i].scheduledArrivalTime);
      if(predictedArrivalTime === 0 || !predictedArrivalTime ) {
        predictedArrivalTime = scheduledArrivalTime;
      }
      var predictedArrivalMinutes = Parse.timeDisplay((predictedArrivalTime - nowTime)/1000);
      var predictedArrivalInfo = '';
      if (predictedArrivalMinutes > - 2) {
        if (predictedArrivalMinutes > 0) {
          predictedArrivalInfo = 'in ' + predictedArrivalMinutes + ' min';
        } else if (predictedArrivalMinutes === 0) {
          predictedArrivalInfo = 'Now';
        } else {
          predictedArrivalMinutes  = -predictedArrivalMinutes;
          predictedArrivalInfo = predictedArrivalMinutes + ' min ago';
        }
        var delayOrEarly = Math.round((predictedArrivalTime - scheduledArrivalTime)/(1000*60));

        var delayOrEarlyInfo = '';
        if (delayOrEarly > 0) {
          delayOrEarlyInfo = delayOrEarly + ' min delay';
        } else if (delayOrEarly === 0) {
          delayOrEarlyInfo = 'on time';
        } else {
          delayOrEarly  = -delayOrEarly;
          delayOrEarlyInfo = delayOrEarly + ' min early';
        }
        var tripHeadsign = arrivalsAndDepartures[i].tripHeadsign;

        busTimeItems.push({
          title: routeShortName + ', ' + predictedArrivalInfo,
          subtitle: delayOrEarlyInfo + ', ' + tripHeadsign
        });
      }
    }
  } else if (region === "newyork") {
    var arrivalsAndDepartures = (busData && busData.Siri && busData.Siri.ServiceDelivery && busData.Siri.ServiceDelivery.StopMonitoringDelivery && busData.Siri.ServiceDelivery.StopMonitoringDelivery[0] && busData.Siri.ServiceDelivery.StopMonitoringDelivery[0].MonitoredStopVisit) || [];
    for (var i = 0; i < arrivalsAndDepartures.length; i++)  {
      var monitoredInfo = arrivalsAndDepartures[i].MonitoredVehicleJourney;
      var routeShortName = monitoredInfo.PublishedLineName;
      var predictedArrivalTime = new Date();
      var predictedArrivalInfo = "";
      var tripHeadsign = monitoredInfo.DestinationName;
      if (monitoredInfo.MonitoredCall.hasOwnProperty("ExpectedArrivalTime")) {
        predictedArrivalTime = new Date(monitoredInfo.MonitoredCall.ExpectedArrivalTime);
        predictedArrivalInfo = ', in ' + Parse.timeDisplay((predictedArrivalTime.getTime() - nowTime)/1000) + ' min';
      } else {
        predictedArrivalInfo = ', ' + monitoredInfo.MonitoredCall.Extensions.Distances.PresentableDistance;
      }
      busTimeItems.push({
        title: routeShortName + predictedArrivalInfo,
        subtitle: tripHeadsign
      });
    }
  } else if (region === "boston") {
    var arrivals = (busData && busData.data) || [];
    for (var i = 0; i < arrivals.length; i++) {
      try {
        var pred = arrivals[i];
        var attrs = pred.attributes || {};
        var routeRel = pred.relationships && pred.relationships.route && pred.relationships.route.data;
        var routeShortName = routeRel && routeRel.id ? routeRel.id : (attrs.route || '');
        var predictedArrivalTime = attrs.arrival_time ? new Date(attrs.arrival_time).getTime() : (attrs.departure_time ? new Date(attrs.departure_time).getTime() : null);
        // scheduled arrival may not be present in v3 prediction attributes
        var scheduledArrivalTime = attrs.scheduled ? Date.parse(attrs.scheduled) : (attrs.schedule_relationship ? null : null);

        if (!predictedArrivalTime) {
          continue;
        }

        var predictedArrivalMinutes = Parse.timeDisplay((predictedArrivalTime - nowTime)/1000);
        var predictedArrivalInfo = '';
        if (predictedArrivalMinutes > -2) {
          if (predictedArrivalMinutes > 0) {
            predictedArrivalInfo = 'in ' + predictedArrivalMinutes + ' min';
          } else if (predictedArrivalMinutes === 0) {
            predictedArrivalInfo = 'Now';
          } else {
            predictedArrivalMinutes = -predictedArrivalMinutes;
            predictedArrivalInfo = predictedArrivalMinutes + ' min ago';
          }

          var delayOrEarlyInfo = '';
          if (scheduledArrivalTime) {
            var delayOrEarly = Math.round((predictedArrivalTime - scheduledArrivalTime)/(1000*60));
            if (delayOrEarly > 0) {
              delayOrEarlyInfo = delayOrEarly + ' min delay';
            } else if (delayOrEarly === 0) {
              delayOrEarlyInfo = 'on time';
            } else {
              delayOrEarly = -delayOrEarly;
              delayOrEarlyInfo = delayOrEarly + ' min early';
            }
          } else {
            delayOrEarlyInfo = attrs.status || '';
          }

          var tripHeadsign = attrs.headsign || attrs.trip_headsign || '';

          busTimeItems.push({
            title: routeShortName + ', ' + predictedArrivalInfo,
            subtitle: (delayOrEarlyInfo ? (delayOrEarlyInfo + ', ') : '') + tripHeadsign
          });
        }
      } catch (e) {
        console.log('boston prediction parse error at index ' + i + ': ' + e);
      }
    }
  } else if (region === "portland") {
    var arrivalsAndDepartures = busData.resultSet && busData.resultSet.arrival || [];
    for (var i = 0; i < arrivalsAndDepartures.length; i++)  {
      var shortSign = arrivalsAndDepartures[i].shortSign || '';
      var routeShortName = arrivalsAndDepartures[i].route || '';
      if (Helper.arrayContains(["Red", "Blue", "Green", "Orange", "Yellow"], shortSign.split(" ")[0])) {
        routeShortName = shortSign.split(" ")[0];
      } else if (Helper.arrayContains(shortSign.split(" "), "Streetcar")) {
        routeShortName = shortSign.split(" ")[2];
      }

      var predictedArrivalTime = parseInt(arrivalsAndDepartures[i].estimated);
      var scheduledArrivalTime = parseInt(arrivalsAndDepartures[i].scheduled);
      if(predictedArrivalTime === 0 || !predictedArrivalTime ) {
        predictedArrivalTime = scheduledArrivalTime;
      }
      var predictedArrivalMinutes = Parse.timeDisplay((predictedArrivalTime - nowTime)/1000);
      var predictedArrivalInfo = '';
      if (predictedArrivalMinutes > - 2) {
        if (predictedArrivalMinutes > 0) {
          predictedArrivalInfo = 'in ' + predictedArrivalMinutes + ' min';
        } else if (predictedArrivalMinutes === 0) {
          predictedArrivalInfo = 'Now';
        } else {
          predictedArrivalMinutes  = -predictedArrivalMinutes;
          predictedArrivalInfo = predictedArrivalMinutes + ' min ago';
        }
        var delayOrEarly = Math.round((predictedArrivalTime - scheduledArrivalTime)/(1000*60));

        var delayOrEarlyInfo = '';
        if (delayOrEarly > 0) {
          delayOrEarlyInfo = delayOrEarly + ' min delay';
        } else if (delayOrEarly === 0) {
          delayOrEarlyInfo = 'on time';
        } else {
          delayOrEarly  = -delayOrEarly;
          delayOrEarlyInfo = delayOrEarly + ' min early';
        }

        var tripHeadsign = (arrivalsAndDepartures[i].fullSign || '').split(" to ").slice(1).join();

        busTimeItems.push({
          title: routeShortName + ', ' + predictedArrivalInfo,
          subtitle: delayOrEarlyInfo + ', ' + tripHeadsign
        });
      }
    }
  } else if (region === "vancouver") {
    for (var i = 0; i < (busData || []).length; i++) {
      var busNumber = busData[i].RouteNo;
      for (var j = 0; j < (busData[i].Schedules || []).length; j++) {
        var predictedArrivalMinutes = busData[i].Schedules[j].ExpectedCountdown;
        var delayOrEarlyInfoMap = {
          "*": "scheduled",
          "-": "delay",
          "+": "early",
          " ": "on time"
        };
        var delayOrEarlyInfo = delayOrEarlyInfoMap[busData[i].Schedules[j].ScheduleStatus];
        var destination = busData[i].Schedules[j].Destination;
        busTimeItems.push({
          busId: busNumber,
          predictedArrivalMinutes: predictedArrivalMinutes,
          delayOrEarlyInfo: delayOrEarlyInfo,
          destination: destination,
          title: busNumber + ", in " + predictedArrivalMinutes + ' min',
          subtitle: delayOrEarlyInfo + ", to " + destination
        });
      }
    }
    busTimeItems = Parse.sortByKeyTime(busTimeItems, "title");
  }

  if(busTimeItems.length === 0) {
    busTimeItems = [{
      title: "No buses",
      subtitle: "For the next 30 min"
    }];
    console.log('empty busTimeItems');
  }

  if (Save.favoriteStopListContains(busStopId)) {
    busTimeItems.push({
      title: "Remove from favorite",
      subtitle: "Remove from favorite."
    })
  } else {
    busTimeItems.push({
      title: "Add to favorite",
      subtitle: "Show this bus stop info in the starting page when around."
    })
  }

  busTimeItems.push({
    title: "Nearby stop list",
    subtitle: "Go to the full stop list."
  })

  busTimeItems.push({
    title: "Settings",
    subtitle: "App settings"
  })

  return busTimeItems;
}

Parse.timeDisplay = function(timeInSec) {
  var timeToDisplay = parseInt(timeInSec)/60.0;
  if (timeToDisplay > 5) {
    return timeToDisplay.toFixed(0);
  } else {
    timeToDisplay = timeToDisplay.toFixed(1);
    if (timeToDisplay.split('.')[1] === "0") {
      return timeToDisplay.split('.')[0];
    } else {
      return timeToDisplay;
    }
  }
}

Parse.sortByKeyTime = function(array, key) {
    return array.sort(function(a, b) {
        var x = a[key].split(" in ")[1].split(" ")[0]; var y = b[key].split(" in ")[1].split(" ")[0];
        x = parseInt(x);
        y = parseInt(y);
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

module.exports = Parse;