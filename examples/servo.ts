/*
 * examples/servo.ts
 * https://github.com/101100/pca9685
 *
 * Example to turn a servo motor in a loop.
 * Typescript version.
 *
 * Copyright (c) 2015 Jason Heard
 * Licensed under the MIT license.
 */

import * as i2cBus from "i2c-bus";

import Pca9685Driver from "../";


// PCA9685 options
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
let pwm: Pca9685Driver;
let nextPulse: number = 0;
let timer: NodeJS.Timer | null;


// loop to cycle through pulse lengths
function servoLoop(): void {
    timer = setTimeout(servoLoop, 500);

    pwm.setPulseLength(steeringChannel, pulseLengths[nextPulse]);
    nextPulse = (nextPulse + 1) % pulseLengths.length;
}


// set-up CTRL-C with graceful shutdown
process.on("SIGINT", () => {
    console.log("\nGracefully shutting down from SIGINT (Ctrl-C)");

    if (timer) {
        clearTimeout(timer);
        timer = null;
    }

    pwm.allChannelsOff();
});


// initialize PCA9685 and start loop once initialized
pwm = new Pca9685Driver(options, function startLoop(err: any): void {
    if (err) {
        console.error("Error initializing PCA9685");
        process.exit(-1);
    }

    console.log("Starting servo loop...");
    servoLoop();
});
