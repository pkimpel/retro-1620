/***********************************************************************
* retro-1620/emulator Envir.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* Centrally-referenced properties and methods for the 1620 emulator.
* This object provides throttling for the Processor and properties for
* the Processor and other objects that need to reference a common set
* of properties.
************************************************************************
* 2022-11-05  P.Kimpel
*   Original version, from retro-g15 Util.js.
* 2023-01-19  P.Kimpel
*   Reformat to use newer JavaScript static and public field definitions.
***********************************************************************/

export {Envir};

import {Timer} from "./Timer.js";


class Envir {

    // Static properties

    static maxMemorySize = 60000;       // maximum allowable memory on a 1620 Mod 2, digits
    static tickTime = 0.0005;           // 1620 clock period, ms (0.5µs period, 2Mhz frequency)
    static cycleTime = 0.010;           // 1620 memory cycle time, ms (10µs period)
    static minSliceTime = 20;           // minimum time slice before throttling, ms

    // Table to translate 1620 digits to binary values. Ignores the C and F bits.
    // For "undigits" (BCD values > 9), converts to an 8 or 9 by treating the 2 and 4
    // bits as if they were zero.
    static bcdBinary = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 9, 8, 9, 8, 9,
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 9, 8, 9, 8, 9,
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 9, 8, 9, 8, 9,
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 9, 8, 9, 8, 9];

    // Table of 6-bit codes with parity computed over the low-order 5 bits.
    // Having the table include all 64 possible codes for six bits means that
    // indexing with a 6-bit code having bad parity will return the corresponding
    // code with good parity.
    static oddParity5 = [
        0b100000, 0b000001, 0b000010, 0b100011, 0b000100, 0b100101, 0b100110, 0b000111,     // 0-7
        0b001000, 0b101001, 0b101010, 0b001011, 0b101100, 0b001101, 0b001110, 0b101111,     // 8-15
        0b010000, 0b110001, 0b110010, 0b010011, 0b110100, 0b010101, 0b010110, 0b110111,     // 16-23
        0b111000, 0b011001, 0b011010, 0b111011, 0b011100, 0b111101, 0b111110, 0b011111,     // 24-31
        0b100000, 0b000001, 0b000010, 0b100011, 0b000100, 0b100101, 0b100110, 0b000111,     // 32-30
        0b001000, 0b101001, 0b101010, 0b001011, 0b101100, 0b001101, 0b001110, 0b101111,     // 40-47
        0b010000, 0b110001, 0b110010, 0b010011, 0b110100, 0b010101, 0b010110, 0b110111,     // 48-55
        0b111000, 0b011001, 0b011010, 0b111011, 0b011100, 0b111101, 0b111110, 0b011111];    // 56-63

    // Undigit codes
    static numRecMark =      0xA;
    static numBlank =        0xC;
    static numGroupMark =    0xF;

    // Unicode codepoints for special 1620 characters
    static glyphPillow = "\u25AE";
    static glyphRecMark = "\u2021";
    static glyphGroupMark = "\u2262";


    // Public Instance Properties

    eTime = 0;                          // current emulation time, ms
    eTimeSliceEnd = 0;                  // current emulation time slice end time, ms
    governor = new Timer();             // throttling delay timer
    memorySize = 20000;                 // configured core memory size, digits


    /**************************************/
    startTiming() {
        /* Initializes the emulation timing to real-world time */

        this.eTime = performance.now();
        this.eTimeSliceEnd = this.eTime + Envir.minSliceTime;
    }

    /**************************************/
    tick() {
        /* Increments the emulation clock by one memory cycle time. Returns true
        if the time slice has expired */

        this.eTime += Envir.cycleTime;
        return (this.eTime >= this.eTimeSliceEnd);
    }

    /**************************************/
    throttle() {
        /* Returns a promise that unconditionally resolves after a delay to
        allow browser real time to catch up with the emulation clock, this.eTime.
        Since most browsers will force a nested setTimeout() to wait for a
        minimum of 4ms, Timer.delayUntil() will not delay if the difference
        between real time (as reported by performance.now()) and emulation time
        is less than Timer.minTimeout. Also advances the time slice next ending
        time if the current time slice has ended */

        if (this.eTime >= this.eTimeSliceEnd) {
            this.eTimeSliceEnd += Envir.minSliceTime;
        }

        return this.governor.delayUntil(this.eTime);
    }

} // class Envir
