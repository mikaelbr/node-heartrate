var util = require('util');
var EventEmitter = require('events').EventEmitter;
var extend = require('node.extend');
var noble = require('noble');

const ON_STATE = 'poweredOn';

const HEART_RATE_VALUE_FORMAT = 1;
const HR_INDEX = 3;
const CHARACTERISTIC_INDEX = 0;

var Device = function (options) {
  var self = this;
  if (typeof options === 'string') {
    options = {
      uuid: options
    };
  }

  if (!options.uuid) {
    throw new Error('A UUID for the Device is required.');
  }

  this.log = !!options.log;
  this.uuid = options.uuid;
};
util.inherits(Device, EventEmitter);

extend(Device.prototype, {
  stop: function () {
    this.emit('end');
  },

  initDevice: function (callback) {
    var self = this;
    noble.on('stateChange', function(state) {
      if (state === ON_STATE) {
        noble.startScanning();
      } else {
        noble.stopScanning();
      }

      if (self.log) {
        console.log(state);
      }
    });

    noble.on('discover', function (peripheral) {
      self.initPeripheral(peripheral, callback);
    });
  },

  initPeripheral: function (peripheral, callback) {
    if (peripheral.uuid !== this.uuid) {
      return;
    }
    noble.stopScanning();

    this.peripheral = peripheral;
    if (this.log) {
      log(this.peripheral);
    }

    this.initListening(callback);
    this.peripheral.on('disconnect', this.stop);
  },

  initListening: function (callback) {
    var self = this;
    this.peripheral.connect(function(error) {

      self.peripheral.discoverServices([], function(error, services) {
        if (error) return self.emit('error', new Error(error));

        var serviceInfo, service;

        service = services[HR_INDEX];
        if (self.log) {
          serviceInfo = service.uuid;
          if (service.name) {
            serviceInfo += ' (' + service.name + ')';
          }
        }

        service.discoverCharacteristics([], function(error, characteristics) {
          if (error) return self.emit('error', new Error(error));
          self.characteristic = characteristics[CHARACTERISTIC_INDEX];
          callback(self.characteristic);
        });
      });
    });

    this.peripheral.on('disconnect', function () {
      self.characteristic = void 0;
    });

    return true;
  },

  start: function () {
    var self = this;

    if (!this.characteristic) {
      return this.initDevice(function (characteristic) {
        characteristic.on('read', function (val) {
          var hr = readHR(val);
          self.emit('data', hr);
        });

        characteristic.notify(true);
      });
    }

    this.characteristic.notify(true);
  },

  pause: function () {
    if (!this.characteristic) {
      return false;
    }
    this.characteristic.notify(false);
    return true;
  },

  disconnect: function () {
    this.peripheral.disconnect();
  }
});

function readHR (val) {
  var flags = val.readUInt8(0);
  if (!((flags & HEART_RATE_VALUE_FORMAT) != HEART_RATE_VALUE_FORMAT)) {
    return;
  }
  return val.readUInt8(1);
}

function log (peripheral) {
  var advertisement = peripheral.advertisement;

  var localName = advertisement.localName;
  var txPowerLevel = advertisement.txPowerLevel;
  var manufacturerData = advertisement.manufacturerData;
  var serviceData = advertisement.serviceData;
  var serviceUuids = advertisement.serviceUuids;

  if (localName) {
    console.log('  Local Name        = ' + localName);
  }

  if (txPowerLevel) {
    console.log('  TX Power Level    = ' + txPowerLevel);
  }

  if (manufacturerData) {
    console.log('  Manufacturer Data = ' + manufacturerData.toString('hex'));
  }

  if (serviceData) {
    console.log('  Service Data      = ' + serviceData);
  }

  if (localName) {
    console.log('  Service UUIDs     = ' + serviceUuids);
  }
}


module.exports = Device;