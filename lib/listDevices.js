var _ = require('./utils');
var noble = require('noble');
var EventEmitter = require('events').EventEmitter;

const ON_STATE = 'poweredOn';

var get = module.exports = function () {
  var events = new EventEmitter();
  noble.on('stateChange', function(state) {
    if (state === ON_STATE) {
      console.log("Starting scan for BLE devices");
      noble.startScanning();
    } else {
      console.log("Stop scanning for devices");
      noble.stopScanning();
    }
  });

  noble.on('discover', function (peripheral) {
    events.emit('data', peripheral);
  });
  return events;
};

module.exports.print = function (callback) {
  return get().on('data', _.log);
};