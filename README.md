## PCA9685 I2C 16-channel PWM/servo driver module

[![NPM version](https://badge.fury.io/js/pca9685.svg)](http://badge.fury.io/js/pca9685)

This is an npm module that can interact with the PCA9685 I2C 16-channel
PWM/servo driver.  Information on the PCA9685 can be found
[here](http://www.nxp.com/products/lighting_driver_and_controller_ics/i2c_led_display_control/series/PCA9685.html)
and it is available for purchase at
[Adafruit](http://www.adafruit.com/products/815).


## Usage

```js
var i2cBus = require("i2c-bus");
var Pca9685Driver = require("pca9685");

var options = {
    i2c: i2cBus.openSync(1),
    address: 0x40,
    frequency: 50,
    debug: false
};
pwm = new Pca9685Driver(options, function() {
    console.log("Initialization done");
});

// Set channel 0 to turn on on step 42 and off on step 255
pwm.setPulseRange(0, 42, 255);

// Set the pulse length to 1500 microseconds for channel 2
pwm.setPulseLength(2, 1500);

// Set the duty cycle to 25% for channel 8
pwm.setDutyCycle(8, 0.25);
```

Note that you need to construct the [`i2c-bus`](https://npmjs.org/package/i2c-bus)
object and pass it in to the module along with the I2C address of the PCA9685
PWM/servo driver.


## Options

- `i2c`: The I2cBus object used to communicate to the PWM/servo driver.
- `address`: The I2C address of the PCA9685 PWM/servo driver.
- `frequency`: The frequency to use for the PWM/servo driver.  50 is
standard for servos, but higher frequencies might work better for
driving LEDs without obvious flicker.
- `debug`: If truthy, then debug messages will be printed on the console
during operations.


## Note

This module is programmed in Typescript and includes typescript definitions
for the module.


## Acknowledgements

This module was based on
[Adafruit's Raspberry-Pi Python Code Library](https://github.com/adafruit/Adafruit-Raspberry-Pi-Python-Code.git)
and
[the `adafruit-i2c-pwm-driver` NPM module](https://www.npmjs.com/package/adafruit-i2c-pwm-driver).

