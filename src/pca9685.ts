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
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { Subscriber } from "rxjs/Subscriber";
import "rxjs/add/operator/concatMap";


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


export interface Pca9685Options {
    /** An open I2cBus object to be used to communicate with the PCA9685 driver. */
    i2c: I2cBus;

    /**
     * The I2C address of the PCA9685 driver.
     *
     * If not specified, the default address of 0x40 will be used.
     *
     * @default 0x40
     */
    address?: number;

    /** If truthy, will configure debugging messages to be printed to the console. */
    debug?: boolean;

    /**
     * The frequency that should be used for the PCA9685 driver.
     *
     * If not specified, the default frequency of 50 Hz will be used.
     *
     * @default 50
     */
    frequency: number;
}


interface I2cPacket {

    /** The command code. */
    command: number;

    /** The data byte to write. */
    byte: number;

    /** An optional callback to call once the packet has been sent or if there is an error. */
    callback?: (error: any) => any;

}


export class Pca9685Driver {

    /**
     * Constructs a new PCA9685 driver.
     *
     * @param options
     *     Configuration options for the driver.
     * @param callback
     *     Callback called once the driver has been initialized.
     */
    constructor(options: Pca9685Options, callback: (error: any) => any) {
        if (options.debug) {
            debugFactory.enable("pca9685");
        }

        this.i2c = options.i2c;
        this.address = options.address || constants.defaultAddress;
        this.commandSubject = new Subject<I2cPacket>();
        this.debug = debugFactory("pca9685");
        this.frequency = options.frequency || constants.defaultFrequency;
        const cycleLengthMicroSeconds = 1000000 / this.frequency;
        this.stepLengthMicroSeconds = cycleLengthMicroSeconds / constants.stepsPerCycle;

        this.send = this.send.bind(this);

        // create a stream that will send each command in sequence using the async writeByte command
        this.commandSubject
            .concatMap(packet => {
                return new Observable<void>((subscriber: Subscriber<void>) => {
                    this.i2c.writeByte(this.address, packet.command, packet.byte, (err: any) => {
                        if (packet.callback) {
                            packet.callback(err);
                        }
                        // print error message if no callback to handle error
                        if (err && !packet.callback) {
                            console.log("Error writing to PCA8685 via I2C", err);
                        }

                        // either way, complete the stream so that the next I2C packet can be sent
                        subscriber.complete();
                    });
                });
            })
            .subscribe();

        this.debug("Reseting PCA9685");

        // queue initialization packets
        this.send(constants.modeRegister1, constants.modeRegister1Default);
        this.send(constants.modeRegister2, constants.modeRegister2Default);
        this.allChannelsOff(() => {
            this.setFrequency(this.frequency, callback);
        });
    }


    /**
     * Clean up the PCA9685 driver by turning off all channels and preventing future commands.
     */
    dispose(): void {
        this.allChannelsOff();
        this.commandSubject.complete();
        this.commandSubject.unsubscribe();
    }


    /**
     * Sets the on and off steps for the given channel.
     *
     * @param channel
     *     Output hannel to configure.
     * @param onStep
     *     The step number when the channel should turn on.
     * @param offStep
     *     The step number when the channel should turn off.
     * @param callback
     *     Optional callback called once the  on and off steps has been set for the given channel.
     */
    setPulseRange(channel: number, onStep: number, offStep: number, callback?: (error: any) => any): void {
        this.debug("Setting PWM channel, channel: %d, onStep: %d, offStep: %d", channel, onStep, offStep);

        this.send(constants.channel0OnStepLowByte + constants.registersPerChannel * channel, onStep & 0xFF);
        this.send(constants.channel0OnStepHighByte + constants.registersPerChannel * channel, (onStep >> 8) & 0x0F);
        this.send(constants.channel0OffStepLowByte + constants.registersPerChannel * channel, offStep & 0xFF);
        this.send(constants.channel0OffStepHighByte + constants.registersPerChannel * channel, (offStep >> 8) & 0x0F, callback);
    }


    /**
     * Sets the pulse length for the given channel.
     *
     * @param channel
     *     Output hannel to configure.
     * @param pulseLengthMicroSeconds
     *     The length of the pulse for the given channel in microseconds.
     * @param onStep
     *     Optional The step number when the channel should turn on (defaults
     *     to 0).
     * @param callback
     *     Optional callback called once the pulse length has been set for the given channel.
     */
    setPulseLength(channel: number, pulseLengthMicroSeconds: number, onStep: number = 0, callback?: (error: any) => any): void {
        this.debug("Setting PWM channel, channel: %d, pulseLength: %d, onStep: %d", channel, pulseLengthMicroSeconds, onStep);

        const offStep = (onStep + Math.round(pulseLengthMicroSeconds / this.stepLengthMicroSeconds) - 1) % constants.stepsPerCycle;

        this.setPulseRange(channel, onStep, offStep, callback);
    }


    /**
     * Sets the duty cycle for the given channel.
     *
     * @param channel
     *     Output hannel to configure.
     * @param dutyCycleDecimalPercentage
     *     The duty cycle for the given channel as a decimal percentage.
     * @param onStep
     *     Optional The step number when the channel should turn on (defaults
     *     to 0).
     * @param callback
     *     Optional callback called once the duty cycle has been set for the given channel.
     */
    setDutyCycle(channel: number, dutyCycleDecimalPercentage: number, onStep: number = 0, callback?: (error: any) => any): void {
        this.debug("Setting PWM channel, channel: %d, dutyCycle: %f, onStep: %d", channel, dutyCycleDecimalPercentage, onStep);

        const offStep = (onStep + Math.round(dutyCycleDecimalPercentage * constants.stepsPerCycle) - 1) % constants.stepsPerCycle;

        this.setPulseRange(channel, onStep, offStep, callback);
    }


    /**
     * Turns all channels off.
     *
     * @param callback
     *     Optional callback called once all of the channels have been turned off.
     */
    allChannelsOff(callback?: (error: any) => any): void {
        // Setting the high byte to 0x10 will turn off all channels
        this.send(constants.allChannelsOffStepHighByte, constants.turnOffChannel, callback);
    }


    private setFrequency(freq: number, callback: (error?: any) => void): void {
        // 25MHz base clock, 12 bit (4096 steps per cycle)
        let prescale = Math.round(constants.baseClockHertz / (constants.stepsPerCycle * freq)) - 1;

        this.debug("Setting PWM frequency to %d Hz", freq);
        this.debug("Pre-scale value: %d", prescale);

        this.i2c.readByte(this.address, constants.modeRegister1, Pca9685Driver.createSetFrequencyStep2(this.send, this.debug, prescale, callback));
    }


    /**
     * Queue the given command and byte to be sent to the PCA9685 over the I2C bus.
     *
     * @param command
     *     The I2C command code.
     * @param byte
     *     The byte to send.
     * @param callback
     *     Optional callback called once the byte has been sent.
     */
    private send(command: number, byte: number, callback?: (error: any) => any): void {
        this.commandSubject.next({ command, byte, callback });
    }


    private static createSetFrequencyStep2(sendFunc: (cmd: number, values: number, callback?: (error: any) => any) => void, debug: debugFactory.IDebugger, prescale: number, callback: (error?: any) => void): (err: any, byte: number) => void {
        callback = typeof callback === "function" ? callback : () => { return; };

        return function setFrequencyStep2(err: any, byte: number): void {
            if (err) {
                debug("Error reading mode (to set frequency)", err);
                callback(err);
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

                sendFunc(constants.modeRegister1, oldmode | constants.restartBit, callback);
            }, 10);
        };
    }


    private address: number;
    private commandSubject: Subject<I2cPacket>;
    private debug: debugFactory.IDebugger;
    private frequency: number;
    private i2c: I2cBus;
    private stepLengthMicroSeconds: number;

}
