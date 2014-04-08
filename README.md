# heartrate [![NPM version][npm-image]][npm-url] [![Dependency Status][depstat-image]][depstat-url]

A Node.js Stream for getting heart rate from Bluetooth Low Energy devices.
This is experimental and tested only with the Wahoo Blue HR device.


## Usage and Installation

```sh
npm install --save heartrate
```

```javascript
var BleHR = require('heartrate');
var stream = new BleHR('foo12345bar1234fo12345bar1234123');
stream.pipe(process.stdout);
```

## API

### `new BleHR(UUID)`
Parameter: `UUID` is string with the UUID.
Returns: `BleHR` instance


### or `new BleHR(options)`
Parameter: `option` is object of options.
Returns: `BleHR` instance


Defaults:
```json
{
  "log": false,
  "uuid": undefined
}
```
*`uuid` is required*

### `new BleHR(UUID).getBodyLocation([callback(error, location)])`
Parameter: `Function` callback with the location in string format
Returns: `BleHR` instance (it self)

Get string representation of body sensor location. E.g. `Chest`, `Ear Lobe`.
Either get data by using the callback or listening to the `bodyLocation` event.

Example:
```javascript
var stream = new BleHR('foo12345bar1234fo12345bar1234123');
stream.getBodyLocation().on('bodyLocation', function (error, location) {
  console.log("Location:", location); // Chest
});
```

### `new BleHR(UUID).getBatteryLevel([callback(error, level)])`
Parameter: `Function` callback with the current battery level in percentage
Returns: `BleHR` instance (it self)

Get battery level of device in percentage. Interval `0` - `100`.
Either get data by using the callback or listening to the `batteryLevel` event.

Example:
```javascript
var stream = new BleHR('foo12345bar1234fo12345bar1234123');
stream.getBatteryLevel(function (err, level) {
  console.log("BatteryLevel:", level); // BatteryLevel: 47
});
```

### `BleHR.list()` (static)
Returns: `EventEmitter` instance

Emits all discovered devices on `data` event.

Example:
```javascript
BleHR.list().on('data', function (device) {
  console.log(device.uuid);
});
```

### `BleHR.list.print()` (static)

Sugar for printing all devices found.

Example:
```javascript
BleHR.list.print();
// UUID: foo12345bar1234fo12345bar1234123
//   Local Name        = Wahoo HRM v2.1
//   Service Data      =
//   Service UUIDs     = 180d
```

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)

[npm-url]: https://npmjs.org/package/heartrate
[npm-image]: https://badge.fury.io/js/heartrate.png

[depstat-url]: https://david-dm.org/mikaelbr/node-heartrate
[depstat-image]: https://david-dm.org/mikaelbr/node-heartrate.png
