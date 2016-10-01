/*
 * examples/servo.js
 * https://github.com/101100/pca9685
 *
 * Example to turn a servo motor in a loop.
 * Javascript version.
 *
 * Copyright (c) 2015-2016 Jason Heard
 * Licensed under the MIT license.
 */

"use strict";

var i2cBus = require("i2c-bus");

var Pca9685Driver = require("../").Pca9685Driver;


// PCA9685 options
var options = {
    i2c: i2cBus.openSync(1),
    address: 0x40,
    frequency: 50,
    debug: true
};


// pulse lengths in microseconds (theoretically, 1.5 ms
// is the middle of a typical servo's range)
var pulseLengths = [1300, 1500, 1700];
var steeringChannel = 0;


// variables used in servoLoop
var pwm;
var nextPulse = 0;
var timer;


// loop to cycle through pulse lengths
function servoLoop() {
    timer = setTimeout(servoLoop, 500);

    pwm.setPulseLength(steeringChannel, pulseLengths[nextPulse]);
    nextPulse = (nextPulse + 1) % pulseLengths.length;
}


// set-up CTRL-C with graceful shutdown
process.on("SIGINT", function () {
    console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");

    if (timer) {
        clearTimeout(timer);
        timer = null;
    }

    pwm.allChannelsOff();
});


// initialize PCA9685 and start loop once initialized
pwm = new Pca9685Driver(options, function startLoop(err) {
    if (err) {
        console.error("Error initializing PCA9685");
        process.exit(-1);
    }

    console.log("Starting servo loop...");
    servoLoop();
});
