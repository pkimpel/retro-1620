/***********************************************************************
* retro-1620/emulator FlipFlop.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* JavaScript class module for an internal processor flip-flop with lamp
* intensity averaging for incandescent bulbs.
************************************************************************
* 2022-07-19  P.Kimpel
*   Original version, from retro-g15 FlipFlop.js.
***********************************************************************/

export {FlipFlop}

import {Envir} from "./Envir.js";


class FlipFlop {

    constructor(envir, visible) {
        /* Constructor for the generic FlipFlop class. "envir" is a reference to
        the object that maintains the emulation clock, which must support the
        property "eTime". That property reports the current emulation time in
        milliseconds. Emulation time is used to compute lamp glow decay and a
        time-weighted exponential average intensity.

        "invisible" should be true if the register does not have a visible
        presence in the UI -- this will inhibit computing average lamp glow
        values for the register.

        Note that it is important to increment envir.eTime in the caller AFTER
        setting new values in registers and flip-flops. This allows the average
        intensity to be computed based on the amount of time a bit was actually in
        that state */

        this.visible = (visible ? true : false);
        this.lastETime = 0;             // time flip-flop was last set
        this.envir = envir;             // processor instance
        this.intVal = 0;                // binary value of flip-flop: read-only externally
        this.glow = 0;                  // average lamp glow value
    }

    get value() {
        return this.intVal;
    }

    set value(value) {
        /* Set the value of the FF. Use this rather than setting the intVal member
        directly so that average lamp glow can be computed. Returns the new value */

        this.intVal = (value ? 1 : 0);
        if (this.visible) {
            this.updateLampGlow(0);
        }
    }

    /**************************************/
    flip() {
        /* Complement the value of the FF. Returns the new value */

        return this.value = 1-this.intVal;
    }

    /**************************************/
    updateLampGlow(beta) {
        /* Updates the average glow for the flip flop. Note that the glow is
        always aged by at least one clock tick. Beta is a bias in the
        range (0,1). For normal update, use 0; to freeze the current state, use 1 */
        let eTime = this.envir.eTime;

        if (this.visible) {
            let delta = eTime - this.lastETime;
            if (delta < Envir.cycleTime) {
                delta += Envir.tickTime;
                eTime += Envir.tickTime;
            }

            let alpha = Math.min(delta/FlipFlop.lampPersistence + beta, 1.0);
            this.glow = this.glow*(1.0-alpha) + this.intVal*alpha;
        }

        this.lastETime = eTime;
    }

} // class FlipFlop


// Static class properties

FlipFlop.lampPersistence = 7;           // persistence of incandescent bulb glow [ms]
