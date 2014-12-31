/*jslint bitwise: true */

// ============================================================================
// PCA9685 I2C 16-channel PWM/servo driver
// ============================================================================

"use strict";

var constants = {
    modeRegister1: 0x00, // MODE1
    LED0_ON_L: 0x06, // LED0 on time low byte
    LED0_ON_H: 0x07, // LED0 on time high byte
    LED0_OFF_L: 0x08, // LED0 off time low byte
    LED0_OFF_H: 0x09, // LED0 off time low byte
    ALLLED_ON_L: 0xFA,
    ALLLED_ON_H: 0xFB,
    ALLLED_OFF_L: 0xFC,
    ALLLED_OFF_H: 0xFD,
    PRESCALE: 0xFE
};


function Pca9685Driver(options) {
    this.i2c = options.i2c;
    this.debug = !!options.debug;
    this.frequency = options.frequency;

    this._send = this._send.bind(this);
    this._step2 = this._step2.bind(this);

    if (this.debug) {
        console.log("Reseting PCA9685");
    }

    this._send(constants.modeRegister1, 0x00);

    this._setFrequency(this.frequency);
}


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


Pca9685Driver.prototype._setFrequency = function setPwmFrequency(freq) {
    // 25MHz, 12 bit (/ 4096)
    var prescale = Math.round(25000000 / (4096 * freq)) - 1;

    if (this.debug) {
        console.log("Setting PWM frequency to", freq, "Hz");
        console.log("Pre-scale value:", prescale);
    }

    this.prescale = prescale;
    this.i2c.readBytes(constants.modeRegister1, 1, this._step2);
};


Pca9685Driver.prototype._step2 = function readStep2(err, res) {
    if (err) {
        console.log("error", err);
        throw new Error(err);
    }

    var oldmode = res[0],
        newmode = (oldmode & 0x7F) | 0x10,
        prescale = this.prescale;

    if (this.debug) {
        console.log("Setting prescale to:", prescale);
    }

    this._send(constants.modeRegister1, newmode);
    this._send(constants.PRESCALE, Math.floor(prescale));
    this._send(constants.modeRegister1, oldmode);

    // documentation says that 500 microseconds are required
    // before restart is sent
    setTimeout(function () {
        if (this.debug) {
            console.log("Restarting controller");
        }

        this._send(constants.modeRegister1, oldmode | 0x80);
    }.bind(this), 10);
};


Pca9685Driver.prototype.setPulseRange = function setPwmRange(channel, onStep, offStep) {
    if (this.debug) {
        console.log("Setting PWM channel, channel:", channel, "onStep:", onStep, "offStep:", offStep);
    }

    this._send(constants.LED0_ON_L + 4 * channel, onStep & 0xFF);
    this._send(constants.LED0_ON_H + 4 * channel, onStep >> 8);
    this._send(constants.LED0_OFF_L + 4 * channel, offStep & 0xFF);
    this._send(constants.LED0_OFF_H + 4 * channel, offStep >> 8);
};


Pca9685Driver.prototype.allChannelsOff = function stopAllMotors() {
    this._send(constants.ALLLED_OFF_H, 0x01);
};


module.exports = Pca9685Driver;
