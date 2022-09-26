const i2c = require('i2c-bus')
const sleep = require('sleep')

//PCA9685 Address constants
const _MODE1 =          0x00
const _MODE2 =          0x01
const _SUBADR1 =        0x02
const _SUBADR2 =        0x03
const _SUBADR3 =        0x04
const _PRESCALE =       0xFE
const _LED0_ON_L =      0x06
const _LED0_ON_H =      0x07
const _LED0_OFF_L =     0x08
const _LED0_OFF_H =     0x09
const _ALL_LED_ON_L =   0xFA
const _ALL_LED_ON_H =   0xFB
const _ALL_LED_OFF_L =  0xFC
const _ALL_LED_OFF_H =  0xFD
const _RESTART =        0x80
const _SLEEP =          0x10
const _ALLCALL =        0x01
const _INVRT =          0x10
const _OUTDRV =         0x04

class PCA9685 {
    /**
     * PCA9685 class constructor - opens a connection with the device
     * 
     * @param { number } frequency - pwm frequency 
     * @param { number } address  - device address
     * @param { number } bus - i2c bus number
     */
    constructor (frequency=60, address= 0x40, bus=1) {
        this.frequency = frequency
        this.address = address 
        this.bus = bus

        this.i2c = i2c.openSync(bus)
    }

    /**
     * function #writeByteData: write a data byte synchronously
     * 
     * @param { number } cmd - PCA9685 command register address
     * @param { number } val - value to write
     * @returns { Promise } - success or rejection promise
     */
    async #writeByteData (cmd, val) {
        try {
            i2c.writeByteSync(this.address, cmd, val)
            return Promise.resolve()
        } catch (error) {
            const e = new Error(error)
            return Promise.reject(e.message)
        }
    }

    /**
     * function #readByteData: read a data byte synchronously
     * 
     * @param { number } cmd - PCA9685 command register address
     * @returns { Promise } - success or rejection promise
     */
    async #readByteData (cmd) {
        try {
            const byte = i2c.readByteSync(this.address, cmd)
            return Promise.resolve(byte)
        } catch (error) {
            const e = new Error(error)
            return Promise.reject(e.message)
        }
    }

    /**
     * close i2c device connection
     */
    close () {
        this.i2c.closeSync()
    }

    /**
     * getter: frequency property
     */
    get frequency () {
        return this.frequency
    }

     /**
     * setter: frequency property
     */
    set frequency (freq) {
        this.frequency = freq

        const prescaleVal = ((25000000.0 / 4096.0) / freq) -1.0
        const prescale = Math.floor(prescaleVal + 0.5)

        (async () => { 
            try {
                const oldMode = await this.#readByteData(_MODE1)
                const newMode = (oldMode & 0x7F) | 0x10

                await this.#writeByteData(_MODE1, newMode)
                await this.#writeByteData(_PRESCALE, parseInt(Math.floor(prescale)))
                await this.#writeByteData(_MODE1, oldMode)
                sleep(0.005)
                await this.#writeByteData(_MODE1, oldMode | 0x80)
            } catch (error) {
                Throw (new Error(error))
            }
        })()
    }

    /**
     * function write - write on and of values on a given channel
     * 
     * @param { number } channel 
     * @param { number } on - on value 
     * @param { number } off - off value
     * @returns 
     */
    async write (channel, on, off) {
        try {
            await this.#writeByteData(_LED0_ON_L + 4 * channel, on & 0xFF)
            await this.#writeByteData(_LED0_ON_H + 4 * channel, on >> 8)
            await this.#writeByteData(_LED0_OFF_L + 4 * channel, off & 0xFF)
            await this.#writeByteData(_LED0_OFF_H + 4 * channel, off >> 8)
            return Promise.resolve()
        } catch (error) {
            const e = new Error(error)
            return Promise.reject(e.message)
        }
    }
  
    /**
     * function writeAll - write on and off values on All the channels
     * 
     * @param { number } on 
     * @param { number } off 
     * @returns { Promise } - success or rejection promise
     */
    async writeAll (on, off) {
        try {
            await this.#writeByteData(_ALL_LED_ON_L, on & 0xFF)
            await this.#writeByteData(_ALL_LED_ON_H, on >> 8)
            await this.#writeByteData(_ALL_LED_OFF_L, off & 0xFF)
            await this.#writeByteData(_ALL_LED_OFF_H, off >> 8)
            return Promise.resolve()
        } catch (error) {
            const e = new Error(error)
            return Promise.reject(e.message)
        }
    }

    /**
     * function setup - device setup
     * 
     * @returns { Promise } - success or rejection promise
     */
    async setup () {
        try {
            await this.writeAll (0, 0)
            await this.#writeByteData (_MODE2, _OUTDRV)
            await this.#writeByteData (_MODE1, _ALLCALL)
            sleep(0.005)

            let mode = await this.#readByteData (_MODE1)
            mode = mode & ~_SLEEP
            await this.#writeByteData(_MODE1, mode)
            sleep(0.005)

            this.frequency = 60
            return Promise.resolve()
        } catch (error) {
            const e = new Error(error)
            return Promise.reject(e.message)
        }

    }
    
}  

// named export
module.exports = { PCA9685 }
