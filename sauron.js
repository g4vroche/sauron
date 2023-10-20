const WebSocket = require('ws');
const http = require('http');
const { parse } = require('@ungap/structured-clone/json');

// --- Config  ------------------
const levelMaps = {
  log: 'info',
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug',
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
  const { source, time, level, message, methodName } = entry;

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

  return [meta, ...metaStyles, ...message];
}
// --------------------------

// Create an HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket aggregator is running');
});

// Create a WebSocket server by passing the HTTP server instance
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');

  // Listen for incoming messages from the client (microservice)
  ws.on('message', (message) => {
    try {
      const data = parse(JSON.parse(Buffer.from(message).toString()));
      const formatted = formatLogForDebug(data);

      // Call the native level function to leverage filters in CDT
      const { level } = data;
      console[levelMaps[level]](...formatted);
    } catch (error) {
      console.error(error);
    }
  });

  // Handle WebSocket closing
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Start the HTTP server on a specific port
const PORT = 6660;
server.listen(PORT, () => {
  console.log(`WebSocket aggregator is listening on port ${PORT}`);
});
