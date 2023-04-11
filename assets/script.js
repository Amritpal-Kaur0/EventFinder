/ Helper function to get the date range for the upcoming weekend
function getUpcomingWeekendDateRange() {
  const today = new Date();
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + (5 - today.getDay()) % 7);
  const nextSunday = new Date(nextFriday);
  nextSunday.setDate(nextFriday.getDate() + 2);
  const startDate = nextFriday.toISOString().split('T')[0];
  const endDate = nextSunday.toISOString().split('T')[0];
  return { startDate, endDate };
}
let isLocationUpdated = false;
// Fetch events from Ticketmaster API for a specific date range
async function getEvents() {
  const apiKey = 'xahcBviTrD5wt7duynUO6G7x2HkhwDKp';
  const { startDate, endDate } = getUpcomingWeekendDateRange();
  const url = `https://app.ticketmaster.com/discovery/v2/events.json?city=Toronto&startDateTime=${startDate}T00:00:00Z&endDateTime=${endDate}T23:59:59Z&apikey=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  return data._embedded.events;
}
// Calculate travel time and distance between two points using Bing Maps API
async function getTimeAndDistance(origin, destination, travelMode) {
  const apiKey = 'AiIMmp6rNENDUYfZjjPyk6DynJOPYEc1cxG6szcKMSUJH889pMIC_XeVnLVyYnSW';
  const mode = travelMode === 'Transit' ? 'transit' : travelMode.toLowerCase();
  const url = `https://dev.virtualearth.net/REST/v1/Routes/${mode}?wp.0=${origin}&wp.1=${destination}&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  const route = data.resourceSets[0].resources[0];
  return {
    distance: route.travelDistance,
    time: route.travelDuration
  };
}
// provides auto suggestion, work in progres just provides a list of the same suggestions currently.
async function getAutosuggestResults(query) {
  const apiKey = 'AiIMmp6rNENDUYfZjjPyk6DynJOPYEc1cxG6szcKMSUJH889pMIC_XeVnLVyYnSW';
  const url = `https://dev.virtualearth.net/REST/v1/Autosuggest?query=${query}&maxResults=6&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.resourceSets[0].resources[0].value.filter(address => address.address.locality === 'Toronto');
}
// // Get the location coordinates and address using Bing Maps API
async function getLocation(address) {
  const apiKey = 'AiIMmp6rNENDUYfZjjPyk6DynJOPYEc1cxG6szcKMSUJH889pMIC_XeVnLVyYnSW';
  const url = `https://dev.virtualearth.net/REST/v1/Locations?query=${address}&key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.resourceSets[0].resources[0];
}
// Handle address input and display address suggestions again work in progress cant seem to get it to display differnt address
async function handleAddressInput(event) {
  const input = event.target;
  const inputValue = input.value.trim();
  const suggestionsContainer = document.getElementById('address-suggestions');
  const invalidAddressWarning = document.getElementById('invalid-address-warning');
  if (inputValue) {
    const suggestions = await getAutosuggestResults(inputValue);
    suggestionsContainer.innerHTML = '';
    if (suggestions.length === 0) {
      invalidAddressWarning.style.display = 'block';
    } else {
      invalidAddressWarning.style.display = 'none';
      suggestions.forEach(suggestion => {
        const suggestionElement = document.createElement('div');
        suggestionElement.textContent = suggestion.address.formattedAddress;
        suggestionElement.classList.add('address-suggestion');
        suggestionElement.addEventListener('click', () => {
          input.value = suggestion.address.formattedAddress;
          suggestionsContainer.innerHTML = '';
        });
        suggestionsContainer.appendChild(suggestionElement);
      });
    }
  } else {
    suggestionsContainer.innerHTML = '';
    invalidAddressWarning.style.display = 'none';
  }
}
// Calculate and display travel information for different travel mode
async function calculateTravelInfo(origin, destination) {
  const travelModes = ['Walking', 'Driving', 'Transit'];
  const travelInfo = {};
  for (const mode of travelModes) {
    const data = await getTimeAndDistance(origin, destination, mode);
    travelInfo[mode] = data;
  }
  return travelInfo;
}
function displayTravelInfo(travelInfo) {
  const travelInfoContainer = document.getElementById('travel-info');
  travelInfoContainer.innerHTML = '';
  for (const mode in travelInfo) {
    const modeInfo = document.createElement('div');
    modeInfo.textContent = `${mode}: ${travelInfo[mode].distance.toFixed(2)} km, ${travelInfo[mode].time.toFixed(0)} minutes`;
    travelInfoContainer.appendChild(modeInfo);
  }
}
// Display event data and attach click event listeners to show travel information
async function displayEvents(userLocation = 'Toronto, ON') {
  const events = await getEvents();
  const eventContainer = document.getElementById('event-container');
  eventContainer.innerHTML = '';
  events.forEach(event => {
    const eventElement = document.createElement('div');
    eventElement.classList.add('event');
    const eventTitle = document.createElement('div');
    eventTitle.classList.add('event-title');
    eventTitle.textContent = event.name;
    const eventTime = document.createElement('div');
    eventTime.classList.add('event-time');
    eventTime.textContent = new Date(event.dates.start.dateTime).toLocaleString();
    eventElement.appendChild(eventTitle);
    eventElement.appendChild(eventTime);
    eventElement.addEventListener("click", async () => {
      if (!isLocationUpdated) {
        alert("Please update your location before checking travel information.");
        return;
      }
      const selectedEventContainer = document.getElementById("selected-event");
      selectedEventContainer.innerHTML = "";
      const clonedEventElement = eventElement.cloneNode(true);
      selectedEventContainer.appendChild(clonedEventElement);
      const destination =
        event._embedded.venues[0].address.line1 +
        ", " +
        event._embedded.venues[0].city.name;
      const travelInfo = await calculateTravelInfo(userLocation, destination);
      displayTravelInfo(travelInfo);
    });
    eventContainer.appendChild(eventElement);
  });
}
// Initialize the app
updateLocationBtn.addEventListener("click", async () => {
  const userLocationInput = document.getElementById("user-location");
  const userLocation = userLocationInput.value.trim();
  if (userLocation) {
    const location = await getLocation(userLocation);
    if (location) {
      const coordinates = location.point.coordinates;
      const formattedAddress = location.address.formattedAddress;
      await displayEvents(`${coordinates[0]},${coordinates[1]}`);
      const savedLocationDiv = document.getElementById("saved-location");
      savedLocationDiv.textContent = `Saved location: ${formattedAddress}`;
      // Set isLocationUpdated to true
      isLocationUpdated = true;
    } else {
      alert("Please enter a valid location.");
    }
  } else {
    alert("Please enter a valid location.");
  }
});