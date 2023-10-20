const http = require('http');
const WebSocket = require('ws');
const url = require('url');
const pino = require('pino');
const { stringify } = require('@ungap/structured-clone/json');

// -- Configuration ---------------------
const AGGREGATOR_HOST = 'sauron';
const AGGREGATOR_PORT = 6660;
const PINO_LEVELS_MAP = {
  log: 'info',
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug',
};

// Easily launch many instances as this as the whole point is aggregation...
// > start:hobbit Frodon 3001
// > start:hobbit Sam 3002

const [, , NAME, PORT] = process.argv;
//-- Logger -----------------------------

const logWrapper =
  (logWs, logPino) =>
  (level) =>
  (...args) => {
    const { stack } = new Error();
    const methodName = stack.split('at ')[2].split(' ')[0]; // Here goes log standardisation ...

    const entry = {
      source: NAME,
      time: new Date().getTime(),
      level,
      methodName,
      message: args,
    };

    // Send to pino ==> standard behavior
    logPino[PINO_LEVELS_MAP[level]](entry);

    // Send to aggregator ==> Dev only
    logWs.send(JSON.stringify(stringify(entry)));
  };

function initLogger() {
  return new Promise((res, rej) => {
    // Return a promise to await ws opening
    const loggerPino = pino({ stream: process.stdout });

    const aggregatorUrl = `ws://${AGGREGATOR_HOST}:${AGGREGATOR_PORT}`;
    const loggerWs = new WebSocket(aggregatorUrl);

    Object.keys(PINO_LEVELS_MAP).forEach((level) => {
      console[level] = logWrapper(loggerWs, loggerPino)(level);
    });

    loggerWs.on('open', () => res());
  });
}
//---------------------------------------

//-- Web Server: Controllers ------------
function emitLogController(req, res) {
  // Log a sample message
  console.log('Received a log request');

  console.error('This is an error log');

  console.warn('And a warning with an objet', {
    foo: [{ bar: 'bar value', bazz: false }],
  });

  console.log('Complexe message', 'with', 'an object', req);

  console.log({ onlyAnObject: { fizz: [true, false] } });

  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Log emitted.\n');
}

function NotFoundController(_req, res) {
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}
//---------------//

//-- Web Server: Init -------------------
const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url, true);

  switch (pathname) {
    case '/emit-log':
      emitLogController(req, res);
      break;
    default:
      NotFoundController(req, res);
      break;
  }
});
//---------------------------------------

// ----- Start the app ------------------

// Wait for logger WS connection to start the server otherwise console.log wil fail...
// We probably need to be more tolerent to ws fault in logger
async function initApp() {
  await initLogger();
  console.log('WebSocket connection established');
  server.listen(PORT, () => {
    console.log(`Microservice listening on port ${PORT}`);
  });
}

initApp();
