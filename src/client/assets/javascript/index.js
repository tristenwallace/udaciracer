// The store will hold all information needed globally
let store = {
  track_id: undefined,
  track_name: undefined,
  player_id: undefined,
  player_name: undefined,
  race_id: undefined,
};

// We need our javascript to wait until the DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  onPageLoad();
  setupClickHandlers();
});

async function onPageLoad() {
  console.log('Getting form info for dropdowns!');
  try {
    getTracks().then(tracks => {
      const html = renderTrackCards(tracks);
      renderAt('#tracks', html);
    });

    getRacers().then(racers => {
      const html = renderRacerCars(racers);
      renderAt('#racers', html);
    });
  } catch (error) {
    console.log('Problem getting tracks and racers ::', error.message);
    console.error(error);
  }
}

function setupClickHandlers() {
  document.addEventListener(
    'click',
    function (event) {
      const { target } = event;

      // Race track form field
      if (target.matches('.card.track')) {
        handleSelectTrack(target);
        store.track_id = target.id;
        store.track_name = target.innerHTML;
      }

      // Racer form field
      if (target.matches('.card.racer')) {
        handleSelectRacer(target);
        store.player_id = target.id;
        store.player_name = target.innerHTML;
      }

      // Submit create race form
      if (target.matches('#submit-create-race')) {
        event.preventDefault();

        // start race
        handleCreateRace();
      }

      // Handle acceleration click
      if (target.matches('#gas-peddle')) {
        handleAccelerate();
      }

      console.log('Store updated :: ', store);
    },
    false
  );
}

async function delay(ms) {
  try {
    return await new Promise(resolve => setTimeout(resolve, ms));
  } catch (error) {
    console.log("an error shouldn't be possible here");
    console.log(error);
  }
}

// This async function controls the flow of the race, add the logic and error handling
async function handleCreateRace() {
  console.log('in create race');

  // Get player_id and track_id from the store
  const playerId = store.player_id;
  const trackId = store.track_id;

  if (!playerId || !trackId) {
    renderAt('#error', '<h2 class="error">Please select Track and Race</h2>');
    return;
  }
  try {
    // call asynchronous method createRace
    const race = await createRace(playerId, trackId);

    // update the store with the race id in the response
    console.log('RACE: ', race);
    store.race_id = parseInt(race.ID);

    // render starting UI
    renderAt('#race', renderRaceStartView(store.track_name));
  } catch (e) {
    renderAt('#error', `<h2 class="error">${e.message}</h2>`);
    console.log(e);
    return;
  }

  // The race has been created, now start the countdown
  await runCountdown();
  await startRace(store.race_id);
  await runRace(store.race_id);
}

async function runRace(raceID) {
  return new Promise(resolve => {
    // Use Javascript's built in setInterval method to get race info (getRace function) every 500ms
    const raceInterval = setInterval(async () => {
      const data = await getRace(raceID).catch(e =>
        console.log('getRace error ', e)
      );
      if (data.status == 'in-progress') {
        renderAt('#leaderBoard', raceProgress(data.positions));
      } else if (data.status == 'finished') {
        clearInterval(raceInterval); // to stop the interval from repeating
        renderAt('#race', resultsView(data.positions));
        resolve(data);
      }
    }, 500);
  }).catch(e => console.log('runRace error ', e));
}

async function runCountdown() {
  try {
    // wait for the DOM to load
    await delay(500);
    let timer = 5;

    return new Promise(resolve => {
      // use Javascript's built in setInterval method to count down once per second
      const countdownInterval = setInterval(() => {
        if (timer !== 0) {
          document.getElementById('big-numbers').innerHTML = --timer;
        } else {
          clearInterval(countdownInterval);
          resolve();
        }
      }, 1000);
    });
  } catch (error) {
    console.log(error);
  }
}

function handleSelectRacer(target) {
  console.log('selected a racer', target.id);

  // remove class selected from all racer options
  const selected = document.querySelector('#racers .selected');
  if (selected) {
    selected.classList.remove('selected');
  }

  // add class selected to current target
  target.classList.add('selected');
}

function handleSelectTrack(target) {
  console.log('selected track', target.id);

  // remove class selected from all track options
  const selected = document.querySelector('#tracks .selected');
  if (selected) {
    selected.classList.remove('selected');
  }

  // add class selected to current target
  target.classList.add('selected');
}

function handleAccelerate() {
  console.log('accelerate button clicked');
  accelerate(store.race_id);
}

// HTML VIEWS ------------------------------------------------

function renderRacerCars(racers) {
  if (!racers.length) {
    return `
			<h4>Loading Racers...</4>
		`;
  }

  const results = racers.map(renderRacerCard).join('');

  return `
		<ul id="racers">
			${results}
		</ul>
	`;
}

function renderRacerCard(racer) {
  const { id, driver_name, top_speed, acceleration, handling } = racer;
  // OPTIONAL: There is more data given about the race cars than we use in the game, if you want to factor in top speed, acceleration,
  // and handling to the various vehicles, it is already provided by the API!
  return `<h4 class="card racer" id="${id}">${driver_name}</h3>`;
}

function renderTrackCards(tracks) {
  if (!tracks.length) {
    return `
			<h4>Loading Tracks...</4>
		`;
  }

  const results = tracks.map(renderTrackCard).join('');

  return `
		<ul id="tracks">
			${results}
		</ul>
	`;
}

function renderTrackCard(track) {
  const { id, name } = track;

  return `<h4 id="${id}" class="card track">${name}</h4>`;
}

function renderCountdown(count) {
  return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`;
}

function renderRaceStartView(track) {
  return `
		<header>
			<h1>Race: ${track}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(5)}
			</section>

			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer class="footer">
        <div class="footer-text">
            &copy; UdaciRacer Simulation Game - Tristen Wallace
        </div>
    </footer>
	`;
}

function resultsView(positions) {
  positions.sort((a, b) => (a.final_position > b.final_position ? 1 : -1));

  return `
		<header>
			<h1>Race Results</h1>
		</header>
		<main class="card">
			<h3>Race Results</h3>
			<p>The race is done! Here are the final results:</p>
			${raceProgress(positions)}
			<a href="/race">Start a new race</a>
		</main>
	`;
}

function raceProgress(positions) {
  let userPlayer = positions.find(e => e.id === parseInt(store.player_id));
  userPlayer.driver_name += ' (you)';

  positions = positions.sort((a, b) => (a.segment > b.segment ? -1 : 1));
  let count = 1;

  const results = positions.map(p => {
    return `
			<tr>
				<td>
					<h3>${count++} - ${p.driver_name}</h3>
				</td>
			</tr>
		`;
  });

  return `
		<table>
      <h2>Leaderboard</h2>
			${results.join('')}
		</table>
	`;
}

function renderAt(element, html) {
  const node = document.querySelector(element);

  node.innerHTML = html;
}

// API CALLS ------------------------------------------------

const SERVER = 'http://localhost:3001';

function defaultFetchOpts() {
  return {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': SERVER,
    },
  };
}

async function getTracks() {
  console.log(`calling server :: ${SERVER}/api/tracks`);
  // GET request to `${SERVER}/api/tracks`
  try {
    const data = await fetch(`${SERVER}/api/tracks`, {
      method: 'GET',
      dataType: 'jsonp',
      ...defaultFetchOpts(),
    });
    console.log('getTracks:', data);
    return data.json();
  } catch (e) {
    console.log('Error occurred in getTracks: ', e);
  }
}

async function getRacers() {
  console.log(`calling server :: ${SERVER}/api/cars`);
  // GET request to `${SERVER}/api/cars`
  try {
    const data = await fetch(`${SERVER}/api/cars`, {
      method: 'GET',
      dataType: 'jsonp',
      ...defaultFetchOpts(),
    });
    console.log('getRacers:', data);
    return data.json();
  } catch (e) {
    console.log('Error occurred in getRacers: ', e);
  }
}

function createRace(player_id, track_id) {
  player_id = parseInt(player_id);
  track_id = parseInt(track_id);
  const body = { player_id, track_id };

  return fetch(`${SERVER}/api/races`, {
    method: 'POST',
    ...defaultFetchOpts(),
    dataType: 'jsonp',
    body: JSON.stringify(body),
  })
    .then(res => res.json())
    .catch(err => console.log('Problem with createRace request::', err));
}

async function getRace(id) {
  // GET request to `${SERVER}/api/races/${id}`
  try {
    const data = await fetch(`${SERVER}/api/races/${id}`, {
      method: 'GET',
      dataType: 'jsonp',
      ...defaultFetchOpts(),
    });
    return data.json();
  } catch (e) {
    console.log('Error occurred in getRace: ', e);
  }
}

async function startRace(id) {
  return await fetch(`${SERVER}/api/races/${id}/start`, {
    method: 'POST',
    dataType: 'jsonp',
    ...defaultFetchOpts(),
  }).catch(err => console.log('Problem with getRace request::', err));
}

async function accelerate(id) {
  // POST request to `${SERVER}/api/races/${id}/accelerate`
  await fetch(`${SERVER}/api/races/${id}/accelerate`, {
    method: 'POST',
    ...defaultFetchOpts(),
  }).catch(e => console.log('Error occurred in getRace: ', e));
}
