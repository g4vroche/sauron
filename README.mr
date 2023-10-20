# Nodejs log multiplexing for Chrome DevTools


## Install

```shell
yarn install
```

1. In chrome, go to `chrome://inspect`
1. Click on "Open dedicated DevTools for Node"
1. In the "Connection" tab, click "Add connection"
1. Add "localhost:6666"
1. Go to "Console" tab


## Start the stack
```shell
docker-compose -p poc stop && docker-compose -p poc up
```

Some logs should pop in console as apps are starting and attaching to aggregator


Generate logs in 2 distincts apps

```shell
curl http://localhost:3001/emit-log

curl http://localhost:3002/emit-log
```

Some logs should pop in console
