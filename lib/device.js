var util = require('util');
var EventEmitter = require('events').EventEmitter;
var extend = require('node.extend');
var noble = require('noble');
var _ = require('./utils');


const ON_STATE = 'poweredOn';

const HEART_RATE_VALUE_FORMAT = 1;

const HR_CHARACTERISTIC_HEARTRATE_UUID = '2a37';
const HR_CHARACTERISTIC_BODYSENSOR_UUID = '2a38';

const BATTERY_CHARACTERISTIC_LEVEL_UUID = '2a19';

const HR_SERVICE_HEARTRATE_UUID = '180d';
const BATTERY_SERVICE_UUID = '180f';

const BODY_LOCATION_STRINGS = [ 'Other', 'Chest', 'Wrist',
  'Finger', 'Hand', 'Ear Lobe', 'Foot' ];

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

  process.on('exit', this.disconnect.bind(this));

  this.log = !!options.log;
  this.uuid = options.uuid;
}
util.inherits(Device, EventEmitter);

extend(Device.prototype, {
  stop: function () {
    this.emit('end');
  },

  initDevice: function () {
    var self = this;
    self.isIniting = true;
    noble.on('stateChange', function(state) {
      if (state === ON_STATE) {
        noble.startScanning([], true);
      } else {
        noble.stopScanning();
      }

      if (self.log) {
        console.log(state);
      }
    });

    // Init scanning to start with.
    noble.startScanning([], true);

    noble.on('discover', function (peripheral) {
      self.initPeripheral(peripheral);
    });

    return self;
  },

  initPeripheral: function (peripheral) {
    if (this.peripheral) return;

    if (peripheral.uuid !== this.uuid) {
      return;
    }
    var self = this;

    this.peripheral = peripheral;

    if (this.log) {
      _.log(this.peripheral);
    }

    this.initListening();

    if (!this.hasListeners) {
      this.hasListeners = true;
      this.peripheral.on('disconnect', function (msg) {
        if (self.heartrate_char && self.log) {
          console.log("Lost connection... Reconnecting");
        }
        self.peripheral = null;
        self.heartrate_char = void 0;
      });
    }
  },

  initListening: function () {
    var self = this;
    this.peripheral.connect(function(error) {
      self.peripheral.discoverServices([
        HR_SERVICE_HEARTRATE_UUID, BATTERY_SERVICE_UUID
      ], function(error, services) {
        if (error) return self.emit('error', new Error(error));

        handleHeartRateService(self, services);
        handleBatteryService(self, services);
      });
    });
    return true;
  },

  start: function () {
    var self = this;

    if (!this.heartrate_char) {
      self.on('heartrateReady', function (heartrate_char) {
        heartrate_char.notify(true);
      });

      if (!self.isIniting) {
        this.initDevice()
      }
      return this;
    }

    this.heartrate_char.notify(true);
    return this;
  },

  getBodyLocation: function (callback) {
    var self = this;
    if (!this.bodysensor_char) {
      self.on('bodysensorReady', function (bodysensor_char) {
        getBodySensorData(self, bodysensor_char, callback);
      });

      if (!self.isIniting) {
        this.initDevice()
      }
      return this;
    }
    getBodySensorData(self, this.bodysensor_char, callback);
  },

  getBatteryLevel: function (callback) {
    var self = this;
    if (!this.battery_char) {
      self.on('batteryReady', function (battery_char) {
        getBatteryData(self, battery_char, callback);
      });

      if (!self.isIniting) {
        this.initDevice()
      }
      return this;
    }
    getBodySensorData(self, this.battery_char, callback);
  },

  pause: function () {
    if (!this.heartrate_char) {
      return false;
    }
    this.heartrate_char.notify(false);
    return true;
  },

  disconnect: function () {
    noble.stopScanning();
    this.pause();

    if(this.peripheral) {
      this.heartrate_char = void 0;
      this.peripheral.disconnect();
    }
    this.stop();
  }
});

function handleHeartRateService(self, services) {
  var serviceInfo;
  var service = getProperValue(services, HR_SERVICE_HEARTRATE_UUID);
  if (!service) {
    self.emit('error', new Error("Heart Rate Service not found"));
    return void 0;
  }

  if (self.log) {
    serviceInfo = service.uuid;
    if (service.name) {
      serviceInfo += ' (' + service.name + ')';
    }
    console.log(serviceInfo);
  }

  service.discoverCharacteristics([
    HR_CHARACTERISTIC_HEARTRATE_UUID, HR_CHARACTERISTIC_BODYSENSOR_UUID
  ], function(error, characteristics) {
    if (error) return self.emit('error', new Error(error));

    self.heartrate_char = getProperValue(characteristics,
        HR_CHARACTERISTIC_HEARTRATE_UUID);

    if (!self.heartrate_char) {
      self.emit('error', new Error("Heart Rate Characteristic not found"));
      return;
    }

    self.heartrate_char.on('read', function (val) {
      var hr = readHR(val);
      self.emit('data', hr);
    });

    self.emit('heartrateReady', self.heartrate_char);

    self.bodysensor_char = getProperValue(characteristics,
        HR_CHARACTERISTIC_BODYSENSOR_UUID);

    self.emit('bodysensorReady', self.bodysensor_char);
  });
}


function handleBatteryService(self, services) {
  var serviceInfo;
  var service = getProperValue(services, BATTERY_SERVICE_UUID);
  if (!service) {
    self.emit('error', new Error("Battery Service not found"));
    return void 0;
  }

  if (self.log) {
    serviceInfo = service.uuid;
    if (service.name) {
      serviceInfo += ' (' + service.name + ')';
    }
    console.log(serviceInfo);
  }

  service.discoverCharacteristics([
    BATTERY_CHARACTERISTIC_LEVEL_UUID
  ], function(error, characteristics) {
    if (error) return self.emit('error', new Error(error));
    self.battery_char = getProperValue(characteristics,
        BATTERY_CHARACTERISTIC_LEVEL_UUID);

    self.emit('batteryReady', self.battery_char);
  });
}

function getBodySensorData (self, characteristic, callback) {
  characteristic.read(function (error, data) {
    if (error) return callback(error);

    var location = bodyLocationToString(data.readUInt8(0));
    self.emit('bodyLocation', location);
    callback(null, location);
  });
}

function getBatteryData (self, characteristic, callback) {
  characteristic.read(function (error, data) {
    if (error) return callback(error);

    var battery = data.readUInt8(0);
    self.emit('batteryLevel', battery);
    callback(null, battery);
  });
}

function getProperValue(items, uuid) {
  if (!Array.isArray(items)) {
    if (items.uuid && items.uuid.toLowerCase() === uuid.toLowerCase()) {
      return items;
    }
    return void 0;
  }

  for (var i = 0, len = items.length; i < len; i++) {
    if (items[i] && items[i].uuid === uuid) {
      return items[i];
    }
  }
  return void 0;
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
