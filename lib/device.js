var util = require('util');
var EventEmitter = require('events').EventEmitter;
var extend = require('node.extend');
var noble = require('noble');
var _ = require('./utils');


const ON_STATE = 'poweredOn';

const HEART_RATE_VALUE_FORMAT = 1;

const HR_CHARACTERISTIC_UUID = '2a37';
const HR_SERVICE_UUID = '180D';

const HR_INDEX = 3;
const CHARACTERISTIC_INDEX = 0;

module.exports = Device;

function Device (options) {
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
}
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
    var self = this;

    this.peripheral = peripheral;

    if (this.log) {
      _.log(this.peripheral);
    }

    this.initListening(callback);
    this.peripheral.on('disconnect', this.stop);

    process.on('exit', function () {
      self.peripheral && self.peripheral.disconnect();
    });
  },

  initListening: function (callback) {
    var self = this;
    this.peripheral.connect(function(error) {
      self.peripheral.discoverServices([], function(error, services) {
        if (error) return self.emit('error', new Error(error));
        var serviceInfo;
        var service = getProperValue(services,
          HR_SERVICE_UUID, services[HR_INDEX]);

        if (!service) {
          self.emit('error', new Error("Heart Rate Service not found"));
          return;
        }

        if (self.log) {
          serviceInfo = service.uuid;
          if (service.name) {
            serviceInfo += ' (' + service.name + ')';
          }
          console.log(serviceInfo);
        }

        service.discoverCharacteristics([], function(error, characteristics) {
          if (error) return self.emit('error', new Error(error));
          self.characteristic = getProperValue(characteristics,
            HR_CHARACTERISTIC_UUID, characteristics[CHARACTERISTIC_INDEX]);

          if (!self.characteristic) {
            self.emit('error', new Error("Heart Rate Characteristic not found"));
            return;
          }

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
    this.peripheral && this.peripheral.disconnect();
  }
});

function getProperValue(items, uuid, def) {
  if (!Array.isArray(items)) {
    if (items.uuid === uuid) {
      return items;
    }
    return def;
  }

  for (var i = 0, len = items.length; i < len; i++) {
    if (items[i] && items[i].uuid === uuid) {
      return items[i];
    }
  }
  return def;
}

function readHR (val) {
  var flags = val.readUInt8(0);
  if (!((flags & HEART_RATE_VALUE_FORMAT) != HEART_RATE_VALUE_FORMAT)) {
    return;
  }
  return val.readUInt8(1);
}
