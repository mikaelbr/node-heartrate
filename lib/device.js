var util = require('util');
var EventEmitter = require('events').EventEmitter;
var extend = require('node.extend');
var noble = require('noble');
var _ = require('./utils');


const ON_STATE = 'poweredOn';

const HEART_RATE_VALUE_FORMAT = 1;

const HR_CHARACTERISTIC_HEARTRATE_UUID = '2a37';
const HR_CHARACTERISTIC_BODYSENSOR_UUID = '2a38';
const HR_SERVICE_UUID = '180d';

const HR_INDEX = 3;
const CHARACTERISTIC_HEARTRATE_INDEX = 0;
const CHARACTERISTIC_BODYSENSOR_INDEX = 1;

const BODY_LOCATION_STRINGS = [ 'Other', 'Chest', 'Wrist',
  'Finger', 'Hand', 'Ear Lobe', 'Foot'];

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

          self.heartrate_char = getProperValue(characteristics,
              HR_CHARACTERISTIC_HEARTRATE_UUID,
              characteristics[CHARACTERISTIC_HEARTRATE_INDEX]);

          if (!self.heartrate_char) {
            self.emit('error', new Error("Heart Rate Characteristic not found"));
            return;
          }

          self.heartrate_char.on('read', function (val) {
            var hr = readHR(val);
            self.emit('data', hr);
          });

          self.bodysensor_char = getProperValue(characteristics,
              HR_CHARACTERISTIC_BODYSENSOR_UUID,
              characteristics[CHARACTERISTIC_BODYSENSOR_INDEX]);

          callback(self.heartrate_char, self.bodysensor_char);
        });
      });
    });

    this.peripheral.on('disconnect', function () {
      self.heartrate_char = void 0;
    });

    return true;
  },

  start: function () {
    var self = this;

    if (!this.heartrate_char) {
      return this.initDevice(function (heartrate_char) {
        heartrate_char.notify(true);
      });
    }

    this.heartrate_char.notify(true);
  },

  pause: function () {
    if (!this.heartrate_char) {
      return false;
    }
    this.heartrate_char.notify(false);
    return true;
  },

  disconnect: function () {
    this.peripheral && this.peripheral.disconnect();
  },

  getBodyLocation: function (callback) {
    var self = this;

    if (!this.bodysensor_char) {
      return this.initDevice(function (heartrate_char, bodysensor_char) {
        getBodySensorData(self, bodysensor_char, callback);
      });
    }
    getBodySensorData(self, bodysensor_char, callback);
  }
});

function getBodySensorData (self, characteristic, callback) {
  characteristic.read(function (error, data) {
    if (error) return callback(error);

    var location = bodyLocationToString(data.readUInt8(0));
    self.emit('bodyLocation', location);
    callback(null, location);
  });
}

function getProperValue(items, uuid, def) {
  if (!Array.isArray(items)) {
    if (items.uuid && items.uuid.toLowerCase() === uuid.toLowerCase()) {
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


function bodyLocationToString (location) {
  if (!BODY_LOCATION_STRINGS[location]) {
    return BODY_LOCATION_STRINGS[0];
  }
  return BODY_LOCATION_STRINGS[location];
}
