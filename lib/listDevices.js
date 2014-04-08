var _ = require('./utils');
var noble = require('noble');
var EventEmitter = require('events').EventEmitter;

const ON_STATE = 'poweredOn';

var get = module.exports = function () {
  var events = new EventEmitter();
  noble.on('stateChange', function(state) {
    if (state === ON_STATE) {
      noble.startScanning();
    } else {
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