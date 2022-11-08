/***********************************************************************
* retro-1620/emulator Timer.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* Timer class that wraps the native JavaScript setTimeout() method with
* a Promise interface.
************************************************************************
* 2022-11-05  P.Kimpel
*   Original version, from retro-g15 Util.js.
***********************************************************************/

export {Timer};

class Timer {

    constructor() {
        /* Constructor for a Timer object that wraps setTimeout() */

        this.rejector = null;
        this.timerHandle = 0;
        this.value = null;
    }

    clear() {
        /* Clears the timer if it is set */

        if (this.timerHandle !== 0) {
            clearTimeout(this.timerHandle);
            this.rejector = null;
            this.value = null;
            this.timerHandle = 0;
        }
    }

    delayFor(delay, value) {
        /* Initiates the timer for "delay" milliseconds and returns a Promise that
        will resolve when the timer expires. The "value" parameter is optional and
        will become the value returned by the Promise */

        if (delay <= minTimeout) {
            return Promise.resolve(value);
        } else {
            return new Promise((resolve, reject) => {
                this.value = value;
                this.rejector = reject;
                this.timerHandle = setTimeout(() => {
                    resolve(this.value);
                    this.rejector = null;
                    this.value = null;
                    this.timerHandle = 0;
                }, delay);
            });
        }
    }

    delayUntil(then, value) {
        /* Initiates the timer for a delay until performance.now() reaches "then".
        "value" is the same as for set(). Returns a Promise that resolves when
        the time is reached */

        return this.set(then - performance.now(), value);
    }

    reject() {
        /* Clears the timer if it is set and rejects the Promise */

        if (this.timerHandle !== 0) {
            this.rejector();
            this.clear();
        }
    }
}

// Static properties

Timer.minTimeout = 4;                   // browsers will do setTimeout for at least 4ms
