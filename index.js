var util = require('util');
var Readable = require('stream').Readable;
var Device = require('./lib/device');
var list = require('./lib/listDevices');

util.inherits(Ble, Readable);

function Ble (options) {
  Readable.call(this, options || {});

  var self = this;
  this._source = new Device(options);

  // Every time there's data, we push it into the internal buffer.
  this._source.on('data', function (chunk) {
    if (!self.push(new Buffer(chunk + ""))) {
      self._source.pause();
    }
  });

  this._source.on('end', function () {
    self.push(null);
  });
};

Ble.prototype._read = function(size) {
  this._source.start();
};

Ble.prototype.end = function(size) {
  if (!this._source) {
    return;
  }
  this._source.disconnect();
};

Ble.prototype.getBodyLocation = function (callback) {
  var self = this;
  this._source.getBodyLocation(function (error, location) {
    if (error) {
      self.emit('error', error);
      callback(error);
      return;
    }
    self.emit('bodyLocation', location);
    callback(null, location);
  });
  return this;
};

Ble.prototype.getBatteryLevel = function (callback) {
  var self = this;
  this._source.getBatteryLevel(function (error, level) {
    if (error) {
      self.emit('error', error);
      callback(error);
      return;
    }
    self.emit('batteryLevel', level);
    callback(null, level);
  });
  return this;
};

module.exports = Ble;
module.exports.list = list;