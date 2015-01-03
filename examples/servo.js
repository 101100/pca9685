"use strict";

var Pca9685Driver = require("../pca9685"),
    I2C = require("i2c"),
    options = {
        i2c: new I2C(0x40, {device: "/dev/i2c-1"}),
        frequency: 100,
        debug: true
    },
    pwm,
    // pulse lengths in microseconds (theoretically, 1.5 ms is the middle of the servo's range)
    pulseLengths = [ 1200, 1500, 1700 ],
    nextPulse = 0,
    timer,
    steeringChannel = 0;


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
pwm = new Pca9685Driver(options, function (err) {
    if (err) {
        console.error("Error initializing PCA9685");
        process.exit(-1);
    }

    console.log("Starting servo loop...");
    servoLoop();
});
