/***********************************************************************
* retro-1620/emulator Register.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* JavaScript class module for an internal processor register with lamp
* intensity averaging for incandescent bulbs.
************************************************************************
* 2022-07-19  P.Kimpel
*   Original version, from retro-g15 Register.js.
***********************************************************************/

export {Register}

import {BitField} from "./BitField.js";
import {Envir} from "./Envir.js";
import {FlipFlop} from "./FlipFlop.js";

class Register {

    constructor(digits, envir, visible, parity, flagged) {
        /* Constructor for the generic Register class. Defines a binary register
        of "digits" 6-bit digits. The bits in each digit are arranged, from high-
        to low-order, as C F 8 4 2 1 (C= odd parity).

        The maximum number of digits supported is 5 (30 bits). Since this
        fits in a 32-bit 2s-complement value, we can use Javascript bit
        operators to maniuplate the values.

        "envir" is a reference to the object that maintains the emulation clock,
        which must support the property "eTime". That property reports the
        current emulation time in milliseconds. Emulation time is used to compute
        lamp glow decay and a time-weighted exponential average intensity.

        "visible" should be false if the register does not have a visible
        presence in the UI -- this will inhibit computing average lamp glow values
        for the register.

        "parity" should be true if correct parity should be computed when setting
        values in the register. If false, the raw value will be set in the
        register (subject to the "flagged" option below). this.parityError will
        be set on each update of the register regardless of the "parity" setting.

        "flagged" must be true if the register digits have flag bits. If false,
        incoming flag (F) bits will be unconditionally reset and will not
        contribute to the parity sum.

        Note that it is important to increment envir.eTime in the caller AFTER
        setting new values in registers and flip-flops. This allows the average
        intensity to be computed based on the amount of time a bit was actually in
        that state */

        this.digits = digits;           // number of 6-bit digits in register
        this.envir = envir;             // local copy of clock object
        this.visible = (visible ? true : false);
        this.parity = (parity ? true : false);
        this.flagged = (flagged ? true : false);
        this.bits = digits*Register.digitBits;
        this.digitMask = (flagged ? Register.digitMask : Register.notFlagMask);
        this.lastETime = 0;             // emulation time register was last set
        this.intVal = 0;                // binary value of register: read-only externally
        this.parityError = false;       // true if last update had a digit parity error

        if (this.visible) {
            this.glow = new Float64Array(this.bits);    // average lamp glow values
        }

        this.clear();                   // initialize with proper parity
    }

    get value() {
        return this.intVal;
    }

    set value(value) {
        /* Set a binary value of digits into the register. Use this rather than
        setting the value member directly so that parity and average lamp glow
        can be computed. Returns the new value */

        if (this.intVal != value) {
            let val = value;
            let newVal = 0;
            let bits = 0;
            let d = 0;
            this.parityError = false;

            do {
                let digit = val & this.digitMask;
                let corr = Envir.oddParity5[digit];
                if (corr != digit) {
                    this.parityError = true;
                }

                newVal |= (this.parity ? corr : digit) << bits;
                val >>= Register.digitBits;
                bits += Register.digitBits;
            } while (++d < this.digits);

            this.intVal = newVal;
        }

        if (this.visible) {
           this.updateLampGlow(0);
        }
    }

    get binaryValue() {
        /* Returns the value of the register as a binary integer */
        let val = this.intVal & Register.bcdValueMask;
        let binary = Envir.bcdBinary[val & Register.bcdMask];
        let power = 1;

        let d = 1;
        while (val && d < this.digits) {
            val >>= Register.digitBits;
            power *= 10;
            binary += Envir.bcdBinary[val & Register.bcdMask]*power;
            ++d;
        }

        return binary;
    }

    set binaryValue(value) {
        /* Sets the BCD value of the register from a binary integer.
        Preserves flag bits but recomputes parity for each digit.
        Returns the new register value */
        let bin = value;
        let bits = 0;
        let newVal = 0;
        let val = this.intVal;

        do {
            let bcd = bin % 10;
            let digit = Envir.oddParity5[(val & Register.parityFlagMask) | bcd];
            newVal |= (digit << bits);
            val >>= Register.digitBits;
            bin = (bin-bcd)/10;
            bits += Register.digitBits;
        } while (bits < this.bits);

        this.intVal = newVal;
        if (this.visible) {
           this.updateLampGlow(0);
        }
    }

    get isntZero() {
        /* Returns 0 if the register is zero, 1 otherwise */

        return ((this.intVal & Register.bcdValueMask) ? 1 : 0);
    }

    /**************************************/
    clear() {
        /* Clears the register to zero with correct parity. Returns the new value */
        let newVal = 0;
        let d = 0;
        this.parityError = false;

        do {
            newVal = (newVal << Register.digitBits) | Register.parityMask;
        } while (++d < this.digits);

        this.intVal = newVal;
        if (this.visible) {
           this.updateLampGlow(0);
        }

        return this.intVal;
    }

    /**************************************/
    incr(increment) {
        /* Increments the register by "count", which must be in the range 1-9.
        If this is a 5-digit register, it is assumed to be an address register,
        and the result will be modulo the system memory size. Otherwise, overflow
        is ignored.
        This routine is designed to minimize the number of digits changed */
        let carry = increment;
        let d = 0;
        let digit = 0;
        let val = this.intVal;

        do {
            digit = Envir.bcdBinary[val & Register.bcdMask] + carry;
            if (digit <= 9) {
                carry = 0;
            } else {
                digit = digit-10;
                carry = 1;
            }

            this.setDigit(d, digit);
            val >>= Register.digitBits;
        } while (carry && ++d < this.digits);

        if (this.digits > 4) {
            val = this.binaryValue;
            if (val >= this.envir.memorySize) {
                this.binaryValue = val - this.envir.memorySize;
            }
        }
    }

    /**************************************/
    decr(decrement) {
        /* Decrements the register by "count", which must be in the range 1-9.
        If this is a 5-digit register, it is assumed to be an address register,
        and the result will be modulo the system memory size. Otherwise,
        underflow is ignored and the result will be in 10s-complement form.
        This routine is designed to minimize the number of digits changed */
        let borrow = decrement;
        let d = 0;
        let digit = 0;
        let val = this.intVal;

        do {
            digit = Envir.bcdBinary[val & Register.bcdMask] - borrow;
            if (digit >= 0) {
                borrow = 0;
            } else {
                digit = digit+10;
                borrow = 1;
            }

            this.setDigit(d, digit);
            val >>= Register.digitBits;
        } while (borrow && ++d < this.digits);

        if (this.digits > 4) {
            val = this.binaryValue;
            if (val >= this.envir.memorySize) {
                this.binaryValue = this.memorySize + val - 100000;
            }
        }
    }

    /**************************************/
    getDigit(d) {
        /* Returns the value of a digit in the register, 0 is low-order */

        return (d >= this.digits ? 0 :
                BitField.fieldIsolate(this.intVal, (d+1)*Register.digitBits-1, Register.digitBits));
    }

    /**************************************/
    getDigitFlag(d) {
        /* Returns the flag of a digit in the register, 0 is low-order */

        return (d >= this.digits ? 0 :
                BitField.fieldIsolate(this.intVal, (d+1)*Register.digitBits-2, 1));
    }

    /**************************************/
    setDigit(d, value) {
        /* Set a digit into the register, 0 is low-order. Returns the new register value */

        if (d < this.digits) {
            let digit = value & this.digitMask;
            let corr = Envir.oddParity5[digit];

            this.value = BitField.fieldInsert(this.intVal, (d+1)*Register.digitBits-1, Register.digitBits,
                     this.parity ? corr : digit);
            this.parityError = (corr != digit);         // do after this.value= since it checks parity, too
            if (this.visible) {
               this.updateLampGlow(0);
            }
       }

        return this.intVal;
    }

    /**************************************/
    setDigitFlag(d, value) {
        /* Set flag of a digit in the register, 0 is low-order. Unconditionally
        recomputes parity for the digit. Returns the new register value */

        if (d < this.digits) {
            let digit = (this.getDigit(d) & Register.notFlagMask) | (value & 1);
            let corr = Envir.oddParity5[digit];

            this.value = BitField.fieldInsert(this.intVal, (d+1)*Register.digitBits-1, Register.digitBits, corr);
            if (this.visible) {
               this.updateLampGlow(0);
            }
       }

        return this.intVal;
    }

    /**************************************/
    complementDigit(d) {
        /* Replaces a digit in the register with its 9s complement. Unconditionally
        recomputes parity for the digit. Returns the new register value */

        if (d < this.digits) {
            let digit = this.getDigit(d);
            let comp = 9 - Envir.bcdBinary[digit];
            digit = Envir.oddParity5[(digit & Register.parityFlagMask) | comp];
            this.value = BitField.fieldInsert(this.intVal, (d+1)*Register.digitBits-1, Register.digitBits, digit);
            if (this.visible) {
               this.updateLampGlow(0);
            }
        }

        return this.intVal;
    }

    /**************************************/
    updateLampGlow(beta=0) {
        /* Updates the lamp glow averages based on this.envir.eTime. Note that the
        glow is always aged by at least one clock tick. Beta is a bias in the
        range (0,1). For normal update, use 0; to freeze the current state, use 1.
        MUST NOT BE CALLED UNLESS this.visible IS TRUE */
        let eTime = this.envir.eTime;

        if (this.visible) {
        let delta = eTime - this.lastETime;
            if (delta < Envir.cycleTime) {
                delta += Envir.tickTime;
                eTime += Envir.tickTime;
            }

            let alpha = Math.min(delta/FlipFlop.lampPersistence + beta, 1.0);
            let alpha1 = 1.0-alpha;
            let b = 0;
            let bit = 0;
            let v = this.intVal;

            while (v) {
                bit = v & 1;
                v >>= 1;
                this.glow[b] = this.glow[b]*alpha1 + bit*alpha;
                ++b;
            }

            while (b < this.bits) {
                this.glow[b] *= alpha1;
                ++b;
            }

            this.lastETime = eTime;
        }
    }

} // class Register


// Static class properties

Register.digitBits = 6;                 // bits/digit
Register.maxDigits = 5;                 // max digits register can hold
Register.flagBitNr = 4;                 // 0-relative bit number for the flag

Register.digitMask =    0b111111;
Register.parityMask =   0b100000;
Register.flagMask =     0b010000;
Register.parityFlagMask=0b110000;
Register.bcdMask =      0b001111;
Register.notFlagMask =  0b101111;
Register.notParityMask =0b011111;
Register.bcdValueMask = 0b001111_001111_001111_001111_001111;