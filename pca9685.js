/*jslint bitwise: true */

// ============================================================================
// PCA9685 I2C 16-channel PWM/servo driver
// ============================================================================

"use strict";

var constants = {
    modeRegister1: 0x00, // MODE1
    modeRegister2: 0x01, // MODE2
    channel0OnStepLowByte: 0x06, // LED0_ON_L
    channel0OnStepHighByte: 0x07, // LED0_ON_H
    channel0OffStepLowByte: 0x08, // LED0_OFF_L
    channel0OffStepHighByte: 0x09, // LED0_OFF_H
    registersPerChannel: 4,
    allChannelsOnStepLowByte: 0xFA, // ALL_LED_ON_L
    allChannelsOnStepHighByte: 0xFB, // ALL_LED_ON_H
    allChannelsOffStepLowByte: 0xFC, // ALL_LED_OFF_L
    allChannelsOffStepHighByte: 0xFD, // ALL_LED_OFF_H
    preScale: 0xFE, // PRE_SCALE
    stepsPerCycle: 4096
};


function Pca9685Driver(options, cb) {
    this.i2c = options.i2c;
    this.debug = !!options.debug;
    this.frequency = options.frequency;
    var cycleLengthMicroSeconds = 1000000 / options.frequency;
    this.stepLengthMicroSeconds = cycleLengthMicroSeconds / constants.stepsPerCycle;

    this._send = this._send.bind(this);

    if (this.debug) {
        console.log("Reseting PCA9685");
    }

    this._send(constants.modeRegister1, 0x00);

    this.allChannelsOff();
    this._setFrequency(this.frequency, cb);
}


function createSetFrequencyStep2(sendFunc, debug, prescale, cb) {
    cb = typeof cb === "function" ? cb : function () { return; };

    return function setFrequencyStep2(err, res) {
        if (err) {
            if (debug) {
                console.log("error", err);
            }
            cb(err);
        }

        var oldmode = res[0],
            newmode = (oldmode & 0x7F) | 0x10;

        if (debug) {
            console.log("Setting prescale to:", prescale);
        }

        sendFunc(constants.modeRegister1, newmode);
        sendFunc(constants.preScale, Math.floor(prescale));
        sendFunc(constants.modeRegister1, oldmode);

        // documentation says that 500 microseconds are required
        // before restart is sent, so a timeout of 10 milliseconds
        // should be plenty
        setTimeout(function () {
            if (debug) {
                console.log("Restarting controller");
            }

            sendFunc(constants.modeRegister1, oldmode | 0x80);

            cb();
        }, 10);
    };
}


Pca9685Driver.prototype._setFrequency = function setPwmFrequency(freq, cb) {
    // 25MHz base clock, 12 bit (4096 steps per cycle)
    var prescale = Math.round(25000000 / (constants.stepsPerCycle * freq)) - 1;

    if (this.debug) {
        console.log("Setting PWM frequency to", freq, "Hz");
        console.log("Pre-scale value:", prescale);
    }

    this.i2c.readBytes(constants.modeRegister1, 1, createSetFrequencyStep2(this._send, this.debug, prescale, cb));
};


Pca9685Driver.prototype._send = function sendCommand(cmd, values) {
    if (!Array.isArray(values)) {
        values = [values];
    }

    this.i2c.writeBytes(cmd, values, function (err) {
        if (err) {
            console.log("Error writing to I2C", err);
        }
    });
};


Pca9685Driver.prototype.setPulseRange = function setPwmRange(channel, onStep, offStep) {
    if (this.debug) {
        console.log("Setting PWM channel, channel:", channel, "onStep:", onStep, "offStep:", offStep);
    }

    this._send(constants.channel0OnStepLowByte + constants.registersPerChannel * channel, onStep & 0xFF);
    this._send(constants.channel0OnStepHighByte + constants.registersPerChannel * channel, (onStep >> 8) & 0x0F);
    this._send(constants.channel0OffStepLowByte + constants.registersPerChannel * channel, offStep & 0xFF);
    this._send(constants.channel0OffStepHighByte + constants.registersPerChannel * channel, (offStep >> 8) & 0x0F);
};


Pca9685Driver.prototype.setPulseLength = function setPwmPulseLength(channel, pulseLengthMicroSeconds, onStep) {
    onStep = onStep || 0;

    if (this.debug) {
        console.log("Setting PWM channel, channel:", channel, "pulseLength:", pulseLengthMicroSeconds, "onStep:", onStep);
    }

    var offStep = (onStep + Math.round(pulseLengthMicroSeconds / this.stepLengthMicroSeconds) - 1) % constants.stepsPerCycle;

    this.setPulseRange(channel, onStep, offStep);
};


Pca9685Driver.prototype.setDutyCycle = function setPwmPulseLength(channel, dutyCycleDecimalPercentage, onStep) {
    onStep = onStep || 0;

    if (this.debug) {
        console.log("Setting PWM channel, channel:", channel, "dutyCycle:", dutyCycleDecimalPercentage, "onStep:", onStep);
    }

    var offStep = (onStep + Math.round(dutyCycleDecimalPercentage * constants.stepsPerCycle) - 1) % constants.stepsPerCycle;

    this.setPulseRange(channel, onStep, offStep);
};


Pca9685Driver.prototype.allChannelsOff = function stopAllMotors() {
    // Setting the high byte to 1 will turn off the channel
    this._send(constants.allChannelsOffStepHighByte, 0x01);
};


module.exports = Pca9685Driver;
