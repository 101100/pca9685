## PCA9685 I2C 16-channel PWM/servo driver module

[![NPM version](https://badge.fury.io/js/pca9685.svg)](http://badge.fury.io/js/pca9685)

This is an npm module that can interact with the PCA9685 I2C 16-channel
PWM/servo driver.  Information on the PCA9685 can be found
[here](http://www.nxp.com/products/lighting_driver_and_controller_ics/i2c_led_display_control/series/PCA9685.html)
and it is available for purcahse at
[Adafruit](http://www.adafruit.com/products/815).


## Usage

```js
var I2C = require("i2c");
var Pca9685Driver = require("pca9685");

var options = {
    i2c: new I2C(0x40, { device: "/dev/i2c-1" }),
    frequency: 50,
    debug: false
};
pwm = new Pca9685Driver(options, function() {
    console.log("Initialization done");
});

// Set channel 0 to turn on on step 42 and off on step 255
pwm.setPulseRange(0, 42, 255);

// Set the pulse length to 1500 microseconds
pwm.setPulseLength(0, 1500);

// Set the duty cycle to 25%
pwm.setDutyCycle(0, 0.25);
```

Note that you need to construct the [`i2c`](https://npmjs.org/package/i2c)
object and pass it in to the module.


## Options

- `i2c`: The object used to communicate to the PWM/servo driver.
- `debug`: If truthy, then debug messages will be printed on the console
           during operations.
- `frequency`: The frequency to use for the PWM/servo driver.  50 is
               standard for servos, but higher frequencies might work
               better for driving LEDs without obvious flicker.


## Acknowledgements

This module was based on [Adafruit's Raspberry-Pi Python Code Library](https://github.com/adafruit/Adafruit-Raspberry-Pi-Python-Code.git) and [the `adafruit-i2c-pwm-driver` NPM module](https://www.npmjs.com/package/adafruit-i2c-pwm-driver).

