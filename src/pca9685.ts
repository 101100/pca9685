/*
 * src/pca9685.ts
 * https://github.com/101100/pca9685
 *
 * Library for PCA9685 I2C 16-channel PWM/servo driver.
 *
 * Copyright (c) 2015 Jason Heard
 * Licensed under the MIT license.
 */

import * as debugFactory from "debug";
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
    turnOffChannel: 0x10, // must be sent to the off step high byte
    preScale: 0xFE, // PRE_SCALE
    stepsPerCycle: 4096,
    defaultAddress: 0x40,
    defaultFrequency: 50,
    baseClockHertz: 25000000
};


function createSetFrequencyStep2(sendFunc: (cmd: number, values: number) => void, debug: debugFactory.IDebugger, prescale: number, cb: (error?: any) => void): (err: any, byte: number) => void {
    cb = typeof cb === "function" ? cb : () => { return; };

    return function setFrequencyStep2(err: any, byte: number): void {
        if (err) {
            debug("Error reading mode (to set frequency)", err);
            cb(err);
        }

        const oldmode = byte;
        const newmode = (oldmode & ~constants.restartBit) | constants.sleepBit;

        debug("Setting prescale to: %d", prescale);

        sendFunc(constants.modeRegister1, newmode);
        sendFunc(constants.preScale, Math.floor(prescale));
        sendFunc(constants.modeRegister1, oldmode);

        // documentation says that 500 microseconds are required
        // before restart is sent, so a timeout of 10 milliseconds
        // should be plenty
        setTimeout(() => {
            debug("Restarting controller");

            sendFunc(constants.modeRegister1, oldmode | constants.restartBit);

            cb();
        }, 10);
    };
}


export interface Pca9685Options {
    /**
     * An opne I2cBus object to be used to communicate with the PCA9685
     * driver.
     * @type {I2cBus}
     */
    i2c: I2cBus;

    /**
     * The I2C address of the PCA9685 driver.  If not specified, the
     * default address of 0x40 will be used.
     *
     * @type {number}
     */
    address?: number;

    /**
     * Determines if debugging messages should be printed to the console.
     *
     * @type {boolean}
     */
    debug?: boolean;

    /**
     * The frequency that should be used for the PCA9685 driver.  If not
     * specified, the default frequency of 50 Hz will be used.
     *
     * @type {number}
     */
    frequency: number;
}


export class Pca9685Driver {

    /**
     * Constructs a
     *
     * @param {Pca9685Options}
     * @param {any)        => any}
     */
    constructor(options: Pca9685Options, cb: (error: any) => any) {
        if (options.debug) {
            debugFactory.enable("pca9685");
        }

        this.i2c = options.i2c;
        this.address = options.address || constants.defaultAddress;
        this.debug = debugFactory("pca9685");
        this.frequency = options.frequency || constants.defaultFrequency;
        const cycleLengthMicroSeconds = 1000000 / this.frequency;
        this.stepLengthMicroSeconds = cycleLengthMicroSeconds / constants.stepsPerCycle;

        this.send = this.send.bind(this);

        this.debug("Reseting PCA9685");

        this.send(constants.modeRegister1, constants.modeRegister1Default);
        this.send(constants.modeRegister2, constants.modeRegister2Default);
        this.allChannelsOff();

        this.setFrequency(this.frequency, cb);
    }


    /**
     * Sets the on and off steps for the given channel.
     *
     * @param {number} channel
     *     Output hannel to configure.
     * @param {number} onStep
     *     The step number when the channel should turn on.
     * @param {number} offStep
     *     The step number when the channel should turn off.
     */
    setPulseRange(channel: number, onStep: number, offStep: number): void {
        this.debug("Setting PWM channel, channel: %d, onStep: %d, offStep: %d", channel, onStep, offStep);

        this.send(constants.channel0OnStepLowByte + constants.registersPerChannel * channel, onStep & 0xFF);
        this.send(constants.channel0OnStepHighByte + constants.registersPerChannel * channel, (onStep >> 8) & 0x0F);
        this.send(constants.channel0OffStepLowByte + constants.registersPerChannel * channel, offStep & 0xFF);
        this.send(constants.channel0OffStepHighByte + constants.registersPerChannel * channel, (offStep >> 8) & 0x0F);
    }


    /**
     * Sets the pulse length for the given channel.
     *
     * @param {number} channel
     *     Output hannel to configure.
     * @param {number} pulseLengthMicroSeconds
     *     The length of the pulse for the given channel in microseconds.
     * @param {number} onStep
     *     Optional The step number when the channel should turn on (defaults
     *     to 0).
     */
    setPulseLength(channel: number, pulseLengthMicroSeconds: number, onStep: number = 0): void {
        this.debug("Setting PWM channel, channel: %d, pulseLength: %d, onStep: %d", channel, pulseLengthMicroSeconds, onStep);

        const offStep = (onStep + Math.round(pulseLengthMicroSeconds / this.stepLengthMicroSeconds) - 1) % constants.stepsPerCycle;

        this.setPulseRange(channel, onStep, offStep);
    }


    /**
     * Sets the duty cycle for the given channel.
     *
     * @param {number} channel
     *     Output hannel to configure.
     * @param {number} dutyCycleDecimalPercentage
     *     The duty cycle for the given channel as a decimal percentage.
     * @param {number} onStep
     *     Optional The step number when the channel should turn on (defaults
     *     to 0).
     */
    setDutyCycle(channel: number, dutyCycleDecimalPercentage: number, onStep: number = 0): void {
        this.debug("Setting PWM channel, channel: %d, dutyCycle: %f, onStep: %d", channel, dutyCycleDecimalPercentage, onStep);

        const offStep = (onStep + Math.round(dutyCycleDecimalPercentage * constants.stepsPerCycle) - 1) % constants.stepsPerCycle;

        this.setPulseRange(channel, onStep, offStep);
    }


    /**
     * Turns all channels off.
     */
    allChannelsOff(): void {
        // Setting the high byte to 0x10 will turn off all channels
        this.send(constants.allChannelsOffStepHighByte, constants.turnOffChannel);
    }


    private setFrequency(freq: number, cb: (error?: any) => void): void {
        // 25MHz base clock, 12 bit (4096 steps per cycle)
        let prescale = Math.round(constants.baseClockHertz / (constants.stepsPerCycle * freq)) - 1;

        this.debug("Setting PWM frequency to %d Hz", freq);
        this.debug("Pre-scale value: %d", prescale);

        this.i2c.readByte(this.address, constants.modeRegister1, createSetFrequencyStep2(this.send, this.debug, prescale, cb));
    }


    private send(cmd: number, byte: number): void {
        this.i2c.writeByte(this.address, cmd, byte, (err: any) => {
            if (err) {
                console.log("Error writing to PCA8685 via I2C", err);
            }
        });
    }


    private address: number;
    private debug: debugFactory.IDebugger;
    private frequency: number;
    private i2c: I2cBus;
    private stepLengthMicroSeconds: number;

}
