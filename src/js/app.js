/////////////////////////////// MAIN CODE /////////////////////////////

//////////////////////////// DEPENDENCIES  /////////////////////////////
var UI = require('ui');
var ajax = require('ajax');
var Settings = require('settings');
// var timeline = require('./timeline');
var Voice = require('ui/voice');

/////////////////////////// GLOBAL DATA STRUCTS ///////////////////////
// Stores a list of trains headed to a station 
var trainMenuItems = 0;
var trainMenu = new UI.Menu({
      sections: [{
        title: 'Current Trains', backgroundColor: 'green',
     }],
      highlightBackgroundColor: 'indigo', // Named colors
      bodyColor: '#9a0036' // Hex colors
});

// Stores the stations on the silver line 
var stationMenuItems = 0;
var stationMenu = new UI.Menu({
  sections: [{title: 'Favorites', backgroundColor: "red"}, { title: 'Stations', backgroundColor: "red" }],
  highlightBackgroundColor: 'indigo', // Named colors
  bodyColor: '#9a0036' // Hex colors
});

// Stores the station codes to append to a request for a train 
var stationCodes = [];

var api_key = '6b700f7ea9db408e9745c207da7ca827';

/////////////////////////// SPLASH SCREEN CARD //////////////////////////
var mainCard = new UI.Card({
  title: 'Train Times',
  icon: 'images/menu_icon.png',
  subtitle: 'Hello World!',
  body: 'Press any button.',
  subtitleColor: 'indigo', // Named colors
  bodyColor: '#9a0036' // Hex colors
});

// Display the Splash Scren Card
mainCard.show();
console.log('Splash Launched');


/////////////////////////// DOWN PRESS CALLBACK /////////////////////////
// Launch the Station Selector~ 
mainCard.on('click', 'down', function() {
  console.log('Down clicked!');
  
   var localfaves = Settings.data('fav');
  console.log('Local Faves: ' + localfaves);
  
  // Load favorites into menu
  stationMenu.items(0, localfaves);
  
  
  // Make the menu request 
  ajax(
    {
      url: 'https://api.wmata.com/Rail.svc/json/jStations?LineCode=SV',
      type: 'json',
      headers: {
        'api_key': api_key
    }
  },
  function(data, status, request) {
    // You got a response from the metro website! Load it! 
     
    stationMenuItems = parseStations(data, data.Stations.length);
    stationMenu.items(1, stationMenuItems);
    stationMenu.show();
        
   
   
    
  },
  function(error, status, request) {
    console.log('The ajax request failed: ' + error);
  }
 ); // end of ajax call 
  
}); // end of button press 
  


///////////////////////////////// A Sammple Menu /////////////////////////////////

mainCard.on('click', 'up', function(e) {
  var card = new UI.Card();
  card.title('A Card');
  card.subtitle('Is a Window');
  card.body('The simplest window type in Pebble.js.');
  card.show();
  
  // A dummy timeline pin example 
  // Start a diction session and skip confirmation
  Voice.dictate('start', false, function(e) {
    if (e.err) {
      console.log('Error: ' + e.err);
      return;
    }
    
    searchForStationName(e.transcription);
    
    card.subtitle('Success: ' + e.transcription);
    card.show();
  });
  
  /////////////////////////
  Pebble.getTimelineToken(function(token) {
      console.log('My timeline token is ' + token);
    }, function(error) {
      console.log('Error getting timeline token: ' + error);
  });
  /////////////////////////
});



////////////////////////////// STATION SELECTION CALLBACK ////////////////////////
stationMenu.on('select', function(e) {
  
  ajax(
  {
    url: 'https://api.wmata.com/StationPrediction.svc/json/GetPrediction/' + e.item.subtitle,
    type: 'json',
    headers: {
      'api_key': api_key
    }
  },
  function(data, status, request) { 
    if(data.Trains.length > 0 ){
      trainMenuItems = parseTrains(data, data.Trains.length);
      // Construct Menu to show to user
      
      // Add all the items to the menu 
      trainMenu.section(0, {title: e.item.title});
      trainMenu.items(0,trainMenuItems);
  
      trainMenu.show();
  //     card.hide();
    } else {
      trainMenu.items(0, [{title: 'Zero Trains'}]);
      trainMenu.show();
    }
    
    
  },
  function(error, status, request) {
    console.log('The ajax request failed: ' + error);
  }
);
  
//   console.log('Selected item #' + e.itemIndex + ' of section #' + e.sectionIndex);
//   console.log('The item is titled "' + e.item.title + '"');
});

////////////////////////////// SAVE TO FAVORITES ON LONG PRESS ////////////////
stationMenu.on('longSelect', function(e) {
  
  // Clear The Favorite Menu 
//   Settings.data('fav', 'clear');
  var lcopy = Settings.data('fav');
   
  console.log('Local Copy: ' + lcopy);
  var larr = [];
  if (lcopy != []){
    console.log('Concating');
    Array.prototype.push.apply(larr, lcopy);
  } else {
    console.log('Just Reset, dont push');
  }
  
  larr.push({title: e.item.title, subtitle: e.item.subtitle});
  Settings.data('fav', larr );
  console.log('Saved Fav: ' + Settings.data('fav'));
 
});

////////////////////////////// SEARCH THROUGH STATIONS //////////////////////
var searchForStationName = function(station_name){
  console.log('Scanning stations');
  if (station_name !== null && stationMenuItems !== null){
    for(var i = 0; i < stationMenuItems.length; i++){
      console.log('Comparing: ' + station_name.toUpperCase() + ' to ' + stationMenuItems[i].Name.toUpperCase());
      if (station_name.toUpperCase() == stationMenuItems[i].Name.toUpperCase()){
        console.log('wow we matched holy goodness');
      }
    }  
  }
};


 ///////////////////////////// JSON PARSING FUNCTIONS ///////////////////////
var parseStations = function(data, quantity) {
  var items = [];
  for(var i = 0; i < quantity; i++) {
    
    // Make the name of the station the title and the code the subtitle 
    var title = data.Stations[i].Name;
    var time = data.Stations[i].Code;

    // Add to menu items array
    items.push({
      title:title,
      subtitle:time
    });
    
    stationCodes.push(data.Stations[i].Code);
  }

  // Reverse both arrays because I live at the end of the line :) 
  items.reverse();
  stationCodes.reverse();
  
  // Finally return whole array
  return items;
};


var parseTrains = function(data, quantity) {
  var items = [];
  for(var i = 0; i < quantity; i++) {
    // Always upper case the description string
    var title = data.Trains[i].Destination;
//     title = title.charAt(0).toUpperCase() + title.substring(1);

    // Get time substring
    var time = data.Trains[i].Line + '   ' + data.Trains[i].Min + ' Mins';
//     time = time.substring(time.indexOf('-') + 1, time.indexOf(':') + 3);

    // Add to menu items array
    items.push({
      title:title,
      subtitle:time
    });
  }

  // Finally return whole array
  console.log(items);
  return items;
};

