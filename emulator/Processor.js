/***********************************************************************
* retro-1620/emulator Processor.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* JavaScript class module for the 1620 processor.
*
*
************************************************************************
* 2022-07-19  P.Kimpel
*   Original version, from retro-g15 Processor.js.
***********************************************************************/

export {Processor}

import * as Util from "./Util.js";

import {FlipFlop} from "./FlipFlop.js";
import {Register} from "./Register.js";


class Processor {

    constructor(context) {
        /* Constructor for the 1620 processor object. The "context" object
        supplies UI and I/O objects from the 1620 emulator global environment */

        this.context = context;

        // Flip-flops
        this.CH = new FlipFlop(false);                  // ....

        // Registers (additional registers are part of the Drum object)
        this.C = new Register( 2, this.drum, false);    // characteristic bits in command

        // General emulator state
        this.cmdLine = 0;                               // current actual command line (see CDXlate)
        this.deferredBP = false;                        // breakpoint deferred due to return exit cmd
        this.overflowed = false;                        // true if last addition overflowed (DEBUG)
        this.poweredOn = false;                         // powered up and ready to run
        this.tracing = false;                           // trace command debugging

        // I/O Subsystem
        this.activeIODevice = null;                     // current I/O device object
        this.duplicateIO = false;                       // second I/O of same type initiated while first in progress
        this.ioBitCount = 0;                            // current input/output bit count
        this.ioTimer = new Util.Timer();                // general timer for I/O operations
        this.ioPromise = Promise.resolve();             // general Promise for I/O operations

        // Bound methods
    }


    /*******************************************************************
    *  Utility Methods                                                 *
    *******************************************************************/

    /**************************************/
    updateLampGlow(beta) {
        /* Updates the lamp glow for all registers and flip-flops in the
        system. Beta is a bias in the range (0,1). For normal update use 0;
        to freeze the current state in the lamps use 1 */
        let gamma = (this.CH.value ? 1 : beta || 0);

        // Processor Flip-flops
        this.AS.updateLampGlow(gamma);

        // Processor Registers
        this.C.updateLampGlow(gamma);
    }


    /*******************************************************************
    *  Input/Output Subsystem                                          *
    *******************************************************************/

    /**************************************/
    async receiveInputCode(code) {
        /* Receives the next I/O code from an input device and either stores
        it onto the drum or acts on its control function */
        let eob = false;                // end-of-block flag

        this.drum.ioStartTiming();

        if ((this.OC.value & 0b01111) == 0) {
            eob = true;                         // canceled or invalid call
        } else {
            if (code & IOCodes.ioDataMask) {    // it's a data frame
                await this.drum.ioPrecessCodeTo23(code, 4);
                this.ioBitCount += 4;
            } else {
                switch(code & 0b00111) {
                case IOCodes.ioCodeMinus:       // minus: set sign FF
                    this.OS.value = 1;
                    break;
                case IOCodes.ioCodeCR:          // carriage return: shift sign into word
                case IOCodes.ioCodeTab:         // tab: shift sign into word
                    await this.drum.ioPrecessCodeTo23(this.OS.value, 1);
                    this.OS.value = 0;
                    ++this.ioBitCount;
                    break;
                case IOCodes.ioCodeStop:        // end/stop
                    eob = true;
                    // no break: Stop implies Reload
                case IOCodes.ioCodeReload:      // reload
                    await this.ioPromise;
                    await this.drum.ioCopy23ToMZ();
                    this.ioPromise = this.drum.ioPrecessMZTo19();
                    this.ioBitCount = 0;
                    break;
                case IOCodes.ioCodePeriod:      // period: ignored
                    break;
                case IOCodes.ioCodeWait:        // wait: insert a 0 digit on input
                    await this.drum.ioPrecessCodeTo23(0, 4);
                    this.ioBitCount += 4;
                    break;
                default:                        // treat everything else as space & ignore
                    break;
                }
            }

            // Check if automatic reload is enabled
            if (this.AS.value && this.ioBitCount >= Util.fastLineSize*Util.wordBits) {
                await this.drum.ioCopy23ToMZ();
                await this.drum.ioPrecessMZTo19();
                this.ioBitCount = 0;
            }
        }

        return eob;
    }

    /**************************************/
    async receiveKeyboardCode(code) {
        /* Processes a keyboard code sent from ControlPanel. If the code is
        negative, it is the ASCII code for a control command used with the ENABLE
        switch. Otherwise it is an I/O data/control code to be processed as
        TYPE IN (D=31, S=12) input . Note that an "S" key can be used for
        both purposes depending on the state of this.enableSwitch */

        if (this.enableSwitch) {                                // Control command
            await this.executeKeyboardCommand(code);
        } else if (this.OC.value == IOCodes.ioCmdTypeIn) {      // Input during TYPE IN
            await this.receiveInputCode(code);
            if (code == IOCodes.ioCodeStop && this.OC.value == IOCodes.ioCmdTypeIn) { // check for cancel
                this.finishIO();
            }
        }
    }

    /**************************************/
    async typeLine19() {
        /* Types the contents of line 19, starting with the four high-order
        bits of word 107, and precessing the line with each character until
        the line is all zeroes. One character is output every four word times */
        let code = 0;                   // output character code
        let fmt = 0;                    // format code
        let line19Empty = false;        // line 19 is now all zeroes
        let printing = true;            // true until STOP or I/O cancel
        let suppressing = false;        // zero suppression in force
        let zeroed = false;             // precessor function reports line 19 all zeroes

        const printPeriod = Util.drumCycleTime*4;

        this.OC.value = IOCodes.ioCmdType19;
        this.activeIODevice = this.devices.typewriter;

        this.drum.ioStartTiming();
        let outTime = this.drum.ioTime + printPeriod;

        // Start a MZ reload cycle.
        do {
            fmt = await this.drum.ioPrecessLongLineToMZ(2, 3);  // get initial format code
            suppressing = (this.punchSwitch != 1);

            // The character cycle.
            do {
                this.OS.value = this.drum.ioDetect19Sign107();
                [code, zeroed] = await this.formatOutputCharacter(fmt, this.boundIOPrecess19ToCode);
                if (zeroed) {
                    line19Empty = true;
                }

                switch (code) {
                case IOCodes.ioDataMask:        // digit zero
                    if (suppressing) {
                        code = IOCodes.ioCodeSpace;
                    }
                    break;
                case IOCodes.ioCodeCR:
                case IOCodes.ioCodeTab:
                    suppressing = (this.punchSwitch != 1);      // establish suppression for next word
                    break;
                case IOCodes.ioCodeSpace:
                case IOCodes.ioCodeMinus:
                case IOCodes.ioCodeReload:
                case IOCodes.ioCodeWait:
                    // does not affect suppression
                    break;
                case IOCodes.ioCodeStop:
                    if (line19Empty) {
                        printing = false;
                    } else {
                        code = IOCodes.ioCodeReload;
                    }
                    break;
                default:                        // all non-zero digit codes and
                    suppressing = false;        // Period turn off suppression
                    break;
                }

                // Pause printing while the ENABLE switch is on
                while (this.enableSwitch && this.OC.value == IOCodes.ioCmdType19) {
                    await this.ioTimer.delayUntil(outTime);
                    outTime += printPeriod;
                }

                if (this.OC.value != IOCodes.ioCmdType19) {
                    printing = false;   // I/O canceled
                } else {
                    this.devices.typewriter.write(code);        // no await
                    if (this.punchSwitch == 1) {
                        this.devices.paperTapePunch.write(code);
                    }

                    await this.ioTimer.delayUntil(outTime);
                    outTime += printPeriod;
                    fmt = await this.drum.ioPrecessMZToCode(3); // get next 3-bit format code
                }
            } while (code != IOCodes.ioCodeReload && printing);
        } while (printing);

        if (this.OC.value == IOCodes.ioCmdType19) {     // check for cancel
            this.finishIO();
        }
    }

    /**************************************/
    releaseIO() {
        /* Cancels any pending I/O operation and returns to manual mode */

        this.stop();
    }

    /**************************************/
    finishIO() {
        /* Terminates an I/O operation, resetting state and setting Ready */

        this.OC.value = IOCodes.ioCmdReady;     // set I/O Ready state
        this.AS.value = 0;
        this.OS.value = 0;
        this.ioBitCount = 0;
        this.activeIODevice = null;
        this.duplicateIO = false;
    }


    /*******************************************************************
    *  Processor Control                                               *
    *******************************************************************/

    /**************************************/
    async run() {
        /* Main execution control loop for the processor. Attempts to throttle
        performance to approximate that of a real 1620. The drum manages the
        system timing, updating its L and eTime properties as calls on its
        waitFor() and waitUntil() methods are made. We await drum.throttle()
        after every instruction completes to determine if drum.eTime exceeds the
        current slice time limit, in which case it delays until real time catches
        up to emulation time. We continue to run until the a halt condition is
        detected */

        do {                            // run until halted
            if (this.RC.value) {        // enter READ COMMAND state
                this.readCommand();
                if (this.tracing) {
                    this.traceState();  // DEBUG ONLY
                }

                if (this.computeSwitch == 2) {  // Compute switch set to BP
                    // Do not stop on a Mark Return command; stop on the next command
                    // instead. See Tech Memo 41.
                    if  (this.deferredBP) {     // if breakpoint has been deferred, take it now
                        this.deferredBP = false;
                        this.stop();
                    } else if (this.BP.value) { // if this is a Mark Return, defer the BP
                        if (this.D.value == 31 && this.S.value == 20) {
                            this.deferredBP = true;
                        } else {
                            this.stop();
                        }
                    }
                }
            } else if (this.TR.value) { // enter TRANSFER (execute) state
                this.transfer();
                await this.drum.throttle();
                this.CZ.value = 1;      // disable stepping
            } else {
                this.violation("State neither RC nor TR");
                debugger;
                this.stop();
            }
        } while (!this.CH.value || !this.CZ.value);

        this.updateLampGlow(1);
    }

    /**************************************/
    start() {
        /* Initiates the processor on the Javascript thread */

        if (this.poweredOn && this.CH.value) {
            this.CZ.value = 1;          // disable stepping
            this.CH.value = 0;          // reset HALT FF
            this.drum.startTiming();
            this.run();                 // async -- returns immediately
        }
    }

    /**************************************/
    stop() {
        /* Stops running the processor on the Javascript thread */

        /**********
        if (this.poweredOn && !this.CH.value) {
            this.CH.value = 1;          // set HALT FF
            this.CZ.value = 1;          // disable stepping
            this.CG.value = 0;          // reset Next from AR FF
            this.CQ.value = 0;          // reset TEST FF
        }
        **********/
    }

    /**************************************/
    step() {
        /* Single-steps the processor. This will execute the next command
        only, then stop the processor. Note that this.CH remains set during
        the step execution */

        if (this.poweredOn && this.CH.value) {
            this.CZ.value = 0;          // enable stepping
            this.drum.startTiming();
            this.run();                 // async -- returns immediately
        }
    }

    /**************************************/
    async systemReset() {
        /* Resets the system and initiates loading paper tape. Activated from
        the ControlPanel RESET button */

        if (this.tracing) {
            console.log("<System Reset>");
        }

        this.poweredOn = true;
        if (this.CH.value) {
            this.CZ.value = 1;          // enable read-command state (i.e., disable stepping)
            this.RC.value = 1;          // set read-command state
            this.TR.value = 0;          // reset transfer state
            this.CG.value = 0;          // reset Next-From-AR FF
            this.CQ.value = 0;          // reset TEST FF
            this.OC.value = IOCodes.ioCmdReady;

            // Load the Number Track, CN
            this.drum.startTiming();
            if (!await this.readPaperTape()) {
                this.drum.waitUntil(0);         // number track data to line 19
                for (let x=0; x<Util.longLineSize; ++x) {
                    this.drum.writeCN(this.drum.read(19));
                    this.drum.waitFor(1);
                }
            }

            // Load the next block from paper tape
            this.setCommandLine(7);             // execute code from line 23
            this.N.value = 0;
            await this.readPaperTape();         // read a bootstrap loader, ignore any hang
        }
    }

    /**************************************/
    powerUp() {
        /* Powers up and initializes the processor */

        if (!this.poweredOn) {
            this.CH.value = 1;                          // set HALT FF
            this.devices = this.context.devices;        // I/O device objects
            //this.loadMemory();                        // >>> DEBUG ONLY <<<
        }
    }

    /**************************************/
    powerDown() {
        /* Powers down the processor */

        this.stop();
        this.releaseIO();
        this.poweredOn = false;
    }

    /**************************************/
    loadMemory() {
        /* Loads debugging code into the initial memory image. The routine
        should be enabled in this.powerUp() only temporarily for demo and
        debugging purposes */
    }

} // class Processor


// Static class properties

