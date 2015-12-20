/// <reference path="../typings/tsd.d.ts" />

"use strict";

import * as i2cBus from "i2c-bus";

import Pca9685Driver from "../";

const options =
{
    i2c: i2cBus.openSync(1),
    address: 0x40, // default value
    frequency: 50, // default value
    debug: true
};

// pulse lengths in microseconds (theoretically, 1.5 ms
// is the middle of a typical servo's range)
const pulseLengths: number[] = [ 1300, 1500, 1700 ];
const steeringChannel: number = 0;


// variables used in servoLoop
var pwm: Pca9685Driver;
var nextPulse: number = 0;
var timer: NodeJS.Timer;


// loop to cycle through pulse lengths
function servoLoop() {
    timer = setTimeout(servoLoop, 500);

    pwm.setPulseLength(steeringChannel, pulseLengths[nextPulse]);
    nextPulse = (nextPulse + 1) % pulseLengths.length;
}


// set-up CTRL-C with graceful shutdown
process.on('SIGINT', function () {
    console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");

    if (timer) {
        clearTimeout(timer);
        timer = null;
    }

    pwm.allChannelsOff();
});


// initialize PCA9685 and start loop once initialized
pwm = new Pca9685Driver(options, function startLoop(err: any) {
    if (err) {
        console.error("Error initializing PCA9685");
        process.exit(-1);
    }

    console.log("Starting servo loop...");
    servoLoop();
});
