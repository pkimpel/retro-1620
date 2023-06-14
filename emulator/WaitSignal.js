/***********************************************************************
* retro-1620/emulator WaitSignal.js
************************************************************************
* Copyright (c) 2023, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* Class that creates a Promise that resolves once an event takes place
* and the instance is signaled. Typically used in the I/O subsystem to
* wait for something to complete or become ready.
************************************************************************
* 2023-06-14  P.Kimpel
*   Original version, from CardPunch.js waitForBuffer().
***********************************************************************/

export {WaitSignal};

class WaitSignal {

    // Public Instance Properties

    requested = false;                  // wait has been requested
    resolver = null;                    // function reference to signal completion


    /**************************************/
    async request() {
        /* Constructs and waits for a Promise that resolves when this.signal()
        is called, then invalidates the signaling mechanism. The parameter to
        that function is a Boolean that is returned to the caller -- false
        indicates the wait resolved normally, true indicates the wait was canceled.
        See: https://stackoverflow.com/questions/26150232/resolve-javascript-
        promise-outside-the-promise-constructor-scope */
        let result = true;

        this.requested = true;
        result = await new Promise((resolve, reject) => {
            this.resolver = resolve;
        });

        this.resolver = null;
        this.requested = false;
        return result ?? false;
    }

    /**************************************/
    signal(result) {
        /* Method to call signaling the wait has been completed */

        if (this.requested) {
            this.resolver(result);
        }
    }

} // class WaitSignal
