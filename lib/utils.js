

module.exports.log = function (peripheral) {
  var advertisement = peripheral.advertisement;

  var uuid = peripheral.uuid;
  var localName = advertisement.localName;
  var txPowerLevel = advertisement.txPowerLevel;
  var manufacturerData = advertisement.manufacturerData;
  var serviceData = advertisement.serviceData;
  var serviceUuids = advertisement.serviceUuids;

  if (uuid) {
    console.log('UUID: ' + uuid);
  }

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
