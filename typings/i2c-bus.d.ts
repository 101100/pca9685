// Type definitions for i2c-bus v1.0.1
// Project: https://www.npmjs.com/package/i2c-bus
// Definitions by: Jason Heard <https://github.com/101100>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module "i2c-bus" {

	export interface CompletionCallback { (error: any): any }

	export interface BufferCallback { (error: any, bytesReadOrWritten: number, buffer: Buffer): any }

	export interface ResultCallback<T> { (error: any, result: T): any }

	export interface I2cBusFuncs {
        i2c: boolean,
        tenBitAddr: boolean,
        protocolMangling: boolean,
        smbusPec: boolean,
        smbusBlockProcCall: boolean,
        smbusQuick: boolean,
        smbusReceiveByte: boolean,
        smbusSendByte: boolean,
        smbusReadByte: boolean,
        smbusWriteByte: boolean,
        smbusReadWord: boolean,
        smbusWriteWord: boolean,
        smbusProcCall: boolean,
        smbusReadBlock: boolean,
        smbusWriteBlock: boolean,
        smbusReadI2cBlock: boolean,
        smbusWriteI2cBlock: boolean
	}

	export interface I2cBus {

		/**
		 * Asynchronous close.
		 * 
		 * @param {CompletionCallback} callback
		 *     completion callback
		 */
		close(callback: CompletionCallback): void;

		/**
		 * Synchronous close.
		 */
		closeSync(): void;

		/**
		 * Determine functionality of the bus/adapter asynchronously.
		 * 
		 * @param {ResultCallback<I2cBusFuncs>} callback
		 *     callback that will recieve a frozen I2cFuncs object describing the I2C functionality available
		 */
		i2cFuncs(callback: ResultCallback<I2cBusFuncs>): void;

		/**
		 * Determine functionality of the bus/adapter synchronously.
		 * 
		 * @return {I2cBusFuncs}
		 *     a frozen I2cFuncs object describing the I2C functionality available
		 */
		i2cFuncsSync(): I2cBusFuncs;

		/**
		 * Scans the I2C bus asynchronously for devices the same way <code>i2cdetect -y -r</code> would.
		 * 
		 * @param {ResultCallback<number[]>} callback
		 *     callback that will recieve an array of numbers where each number represents the I2C address of a device which was detected
		 */
		scan(callback: ResultCallback<number[]>): void;

		/**
		 * Scans the I2C bus synchronously for devices the same way <code>i2cdetect -y -r</code> would.
		 * 
		 * @return {number[]}
		 *     an array of numbers where each number represents the I2C address of a device which was detected
		 */
		scanSync(): number[];

		i2cRead(address: number, length: number, buffer: Buffer, callback: BufferCallback): void;

		i2cReadSync(address: number, length: number, buffer: Buffer): number;

		i2cWrite(address: number, length: number, buffer: Buffer, callback: BufferCallback): void;

		i2cWriteSync(address: number, length: number, buffer: Buffer): number;

		readByte(address: number, command: number, callback: ResultCallback<number>): void;

		readByteSync(address: number, command: number): number;

		readWord(address: number, command: number, callback: ResultCallback<number>): void;

		readWordSync(address: number, command: number): number;

		readI2cBlock(address: number, command: number, length: number, buffer: Buffer, callback: BufferCallback): void;

		readI2cBlockSync(address: number, command: number, length: number, buffer: Buffer): number;

		receiveByte(address: number, callback: ResultCallback<number>): void;

		receiveByteSync(address: number): number;

		sendByte(address: number, byte: number, callback: CompletionCallback): void;

		sendByteSync(address: number, byte: number): void;

		writeByte(address: number, command: number, byte: number, callback: CompletionCallback): void;

		writeByteSync(address: number, command: number, byte: number): void;

		writeWord(address: number, command: number, word: number, callback: CompletionCallback): void;

		writeWordSync(address: number, command: number, word: number): void;

		writeQuick(address: number, command: number, bit: number, callback: CompletionCallback): void;

		writeQuickSync(address: number, command: number, bit: number): void;

		writeI2cBlock(address: number, command: number, length: number, buffer: Buffer, callback: BufferCallback): void;

		writeI2cBlockSync(address: number, command: number, length: number, buffer: Buffer): number;

	}

	/**
	 * Asynchronous open.
	 * 
	 * @param  {number} busNumber
	 *     the number of the I2C bus/adapter to open, 0 for /dev/i2c-0, 1 for /dev/i2c-1, ...
	 * @param  {CompletionCallback} callback
	 *     completion callback
	 * @return {I2cBus}
	 *     a new I2cBus object
	 */
	export function open(busNumber: number, calback: CompletionCallback): I2cBus;

	/**
	 * Synchronous open.
	 * 
	 * @param  {number} busNumber
	 *     the number of the I2C bus/adapter to open, 0 for /dev/i2c-0, 1 for /dev/i2c-1, ...
	 * @return {I2cBus}
	 *     a new I2cBus object
	 */
	export function openSync(busNumber: number): I2cBus;

}
