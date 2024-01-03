const { spawn } = require('child_process');

// --- Config  ------------------
const levelMaps = {
  30: 'info',
  50: 'error',
  40: 'warn',
  20: 'info',
  10: 'debug',
};

const levelColors = {
  log: 'green',
  error: 'red',
  warn: 'orange',
  info: 'green',
  debug: 'blue',
};

// --- Styling ------------------
const geniusColorRoundRobin = ['blue', 'green', 'purple', 'grey'];
const awesomeColorCache = {};

function styled(fg, bg, fw = 'normal') {
  return [
    'font-size: 11px;',
    `font-weight: ${fw};`,
    'margin: 1px;',
    'padding: 2px;',
    'border-radius: 3px;',
    `color: ${fg};`,
    `background-color: ${bg};`,
  ].join('\n');
}

function formatLogForDebug(entry) {
  const {
    source: sourceProp,
    hostname,
    time,
    level = 10,
    methodName,
    ...data
  } = entry;

  const source = hostname || sourceProp;

  if (!awesomeColorCache[source]) {
    awesomeColorCache[source] = geniusColorRoundRobin.shift();
  }

  const date = new Date(time);
  const dateTime = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`;

  const metaStyles = [
    styled('white', awesomeColorCache[source], 900),
    styled('black', '#ccc'),
    styled('white', levelColors[level]),
    styled('black', 'white'),
  ];

  const meta = `%c${source.toUpperCase()}%c${dateTime}%c${level}%c${methodName}`;

  return [meta, ...metaStyles, data];
}
// --------------------------

// Function to handle log data
function handleLogData(line) {
  // const line = data.toString();

  const cleanedLine = line.replace(/\u001b\[.*?m/g, '');

  // Extract JSON part (assuming JSON starts with '{' and ends with '}')
  const jsonPart = cleanedLine.match(/{.*}/);

  const isMongo = cleanedLine.substr(0, 5) === 'mongo';

  if (isMongo) {
    // console.log(line);
    return;
  }

  // const dataParts = data.split(/^\|[^{]/);
  // const message = dataParts.pop().trim();

  let metaSource = cleanedLine;
  let isPm2 = false;
  if (jsonPart) {
    metaSource = cleanedLine.replace(jsonPart[0], '').trim();
    isPm2 = true;
  }

  const meta = metaSource
    .split('|')
    .map((m) => m.trim())
    .filter((m) => m);

  const source = isPm2 ? meta[0] : meta[meta.length - 1];

  if (jsonPart) {
    try {
      const data = JSON.parse(jsonPart[0].trim());
      data.source = source;

      // console.log(data);
      const formatted = formatLogForDebug(data);

      // Call the native level function to leverage filters in CDT
      const { level } = data;
      console[levelMaps[level]](...formatted);
    } catch (error) {
      console.error(error, jsonPart[0]);
    }
  } else {
    console.log(line);
  }
}

const dks = '../fc/docker/docker-stack';
// Spawn a child process to execute docker-compose log
const options = {
  stdio: ['ignore', 'pipe', 'pipe'],
};
const dockerLogs = spawn(dks, ['logs'], options);

let buffer = '';
// Handle stdout data (new log entries)
dockerLogs.stdout.on('data', (data) => {
  buffer += data.toString();
  const lines = buffer.split('\n');
  buffer = lines.pop(); // Keep the last partial line in the buffer
  // console.log('lines');

  // console.log(lines);
  lines.forEach(handleLogData);
});

// Handle stderr data (error messages)
dockerLogs.stderr.on('data', (data) => {
  console.error(`Error: ${data}`);
});

// Handle process close
dockerLogs.on('close', (code) => {
  console.log(`docker-compose logs process exited with code ${code}`);
});
