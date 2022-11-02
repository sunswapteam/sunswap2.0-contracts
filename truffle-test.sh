#!/bin/bash -

set -o nounset # Treat unset variables as an error

shutdownGanache() {
  port="$1"
  pid=`lsof -i :${port} | grep ${port} | awk '{print $2}'`
  if [ x"${pid}" != x"" ]; then
    # check process name
    pid=`ps -o pid,command -p ${pid} | grep ganache | awk '{print $1}'`
    if [ x"${pid}" != x"" ]; then
      kill ${pid}
    fi
  fi
}

shutdownGanache 8545
npm run ganache 2>&1 > /dev/null &
sleep 10 # wait ganache setup

npm run test
shutdownGanache 8545
