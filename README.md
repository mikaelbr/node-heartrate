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

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)

[npm-url]: https://npmjs.org/package/heartrate
[npm-image]: https://badge.fury.io/js/heartrate.png

[depstat-url]: https://david-dm.org/mikaelbr/heartrate
[depstat-image]: https://david-dm.org/mikaelbr/heartrate.png