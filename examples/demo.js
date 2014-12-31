"use strict";

var Pca9685Driver = require("../pca9685"),
    I2C = require("i2c"),
    options = {
        i2c: new I2C(0x40, {device: "/dev/i2c-1"}),
        frequency: 50,
        debug: true
    },
    pwm = new Pca9685Driver(options),
    pulseLengths,
    nextPulse = 0,
    timer,
    cycleLengthMicroSeconds = 1000000 / options.frequency,
    stepLengthMicroSeconds = cycleLengthMicroSeconds / 4096;


function setServoPulse(channel, pulseLengthMicroSeconds) {
    var onStep = 0;
    var offStep = Math.round(pulseLengthMicroSeconds / stepLengthMicroSeconds) - 1;

    pwm.setPulseRange(channel, onStep, offStep);
}


function servoLoop() {
    timer = setTimeout(servoLoop, 500);

    setServoPulse(0, pulseLengths[nextPulse]);
    nextPulse = (nextPulse + 1) % pulseLengths.length;
}


// pulse lengths in microseconds (theoretically, 1.5 ms is the middle)
pulseLengths = [ 1400, 1600, 1800 ];

process.on('SIGINT', function () {
    console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");

    if (timer) {
        clearTimeout(timer);
        timer = null;
    }

    pwm.allChannelsOff();
});

servoLoop();
