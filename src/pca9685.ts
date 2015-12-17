/*jslint bitwise: true */
/// <reference path = "../typings/tsd.d.ts" />

// ============================================================================
// PCA9685 I2C 16-channel PWM/servo driver
// ============================================================================

"use strict";

import { I2cBus } from "i2c-bus";

const constants = {
    modeRegister1: 0x00, // MODE1
    modeRegister1Default: 0x01,
    sleepBit: 0x10,
    restartBit: 0x80,
    modeRegister2: 0x01, // MODE2
    modeRegister2Default: 0x04,
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
    stepsPerCycle: 4096,
    defaultAddress: 0x40,
    defaultFrequency: 50,
    baseClockHertz: 25000000
};


function createSetFrequencyStep2(sendFunc: (cmd: number, values: number) => void, debug: boolean, prescale: number, cb: (error?: any) => void): (err: any, byte: number) => void {
    cb = typeof cb === "function" ? cb : function () { return; };

    return function setFrequencyStep2(err: any, byte: number) {
        if (err) {
            if (debug) {
                console.log("Error reading mode (to set frequency)", err);
            }
            cb(err);
        }

        var oldmode = byte,
            newmode = (oldmode & ~constants.restartBit) | constants.sleepBit;

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

            sendFunc(constants.modeRegister1, oldmode | constants.restartBit);

            cb();
        }, 10);
    };
}


export interface Pca9685Options {
    i2c: I2cBus,
    address?: number,
    debug?: boolean,
    frequency: number
}


export class Pca9685Driver {

    constructor(options: Pca9685Options, cb: (error: any) => any) {
        this.i2c = options.i2c;
        this.address = options.address || constants.defaultAddress;
        this.debug = !!options.debug;
        this.frequency = options.frequency || constants.defaultFrequency;
        const cycleLengthMicroSeconds = 1000000 / this.frequency;
        this.stepLengthMicroSeconds = cycleLengthMicroSeconds / constants.stepsPerCycle;

        this.send = this.send.bind(this);

        if (this.debug) {
            console.log("Reseting PCA9685");
        }

        this.send(constants.modeRegister1, constants.modeRegister1Default);
        this.send(constants.modeRegister2, constants.modeRegister2Default);
        this.allChannelsOff();

        this.setFrequency(this.frequency, cb);
    }


    setPulseRange(channel: number, onStep: number, offStep: number): void {
        if (this.debug) {
            console.log("Setting PWM channel, channel:", channel, "onStep:", onStep, "offStep:", offStep);
        }

        this.send(constants.channel0OnStepLowByte + constants.registersPerChannel * channel, onStep & 0xFF);
        this.send(constants.channel0OnStepHighByte + constants.registersPerChannel * channel, (onStep >> 8) & 0x0F);
        this.send(constants.channel0OffStepLowByte + constants.registersPerChannel * channel, offStep & 0xFF);
        this.send(constants.channel0OffStepHighByte + constants.registersPerChannel * channel, (offStep >> 8) & 0x0F);
    }


    setPulseLength(channel: number, pulseLengthMicroSeconds: number, onStep?: number): void {
        onStep = onStep || 0;

        if (this.debug) {
            console.log("Setting PWM channel, channel:", channel, "pulseLength:", pulseLengthMicroSeconds, "onStep:", onStep);
        }

        var offStep = (onStep + Math.round(pulseLengthMicroSeconds / this.stepLengthMicroSeconds) - 1) % constants.stepsPerCycle;

        this.setPulseRange(channel, onStep, offStep);
    }


    setDutyCycle(channel: number, dutyCycleDecimalPercentage: number, onStep?: number): void {
        onStep = onStep || 0;

        if (this.debug) {
            console.log("Setting PWM channel, channel:", channel, "dutyCycle:", dutyCycleDecimalPercentage, "onStep:", onStep);
        }

        var offStep = (onStep + Math.round(dutyCycleDecimalPercentage * constants.stepsPerCycle) - 1) % constants.stepsPerCycle;

        this.setPulseRange(channel, onStep, offStep);
    }


    allChannelsOff(): void {
        // Setting the high byte to 1 will turn off the channel
        this.send(constants.allChannelsOffStepHighByte, 0x01);
    }


    private setFrequency(freq: number, cb: (error?: any) => void) {
        // 25MHz base clock, 12 bit (4096 steps per cycle)
        let prescale = Math.round(constants.baseClockHertz / (constants.stepsPerCycle * freq)) - 1;

        if (this.debug) {
            console.log("Setting PWM frequency to", freq, "Hz");
            console.log("Pre-scale value:", prescale);
        }

        this.i2c.readByte(this.address, constants.modeRegister1, createSetFrequencyStep2(this.send, this.debug, prescale, cb));
    }


    private send(cmd: number, byte: number) {
        this.i2c.writeByte(this.address, cmd, byte, function (err?: any) {
            if (err) {
                console.log("Error writing to PCA8685 via I2C", err);
            }
        });
    }


    private i2c: I2cBus;
    private address: number;
    private debug: boolean;
    private frequency: number;
    private stepLengthMicroSeconds: number;

}
