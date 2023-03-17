/***********************************************************************
* retro-1620/webUI CardPunch.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* Card punch module for the 1622 Card Reader/Punch unit.
*
* Defines a card punch peripheral unit type.
*
************************************************************************
* 2023-01-29  P.Kimpel
*   Original version, from CardReader.js.
***********************************************************************/

export {CardPunch};

import {Envir} from "../emulator/Envir.js";
import {Register} from "../emulator/Register.js";
import {Timer} from "../emulator/Timer.js";
import {PanelButton} from "./PanelButton.js";
import {openPopup} from "./PopupUtil.js";

class CardPunch {

    // Static Properties

    static columns = 80;                // if you don't know what this means, you shouldn't be here
    static cardPunchTop = 458;          // top coordinate of CardPunch window above window bottom
    static idlePeriod = 60000;          // punch motor turnoff delay, ms (5 minutes)
    static idleStartupTime = 500;       // punch motor idle startup time, ms
    static stackerLimit = 10000;        // max card capacity of output stacker

    static numericGlyphs = [    // indexed as BCD code prefixed with flag bit: F8421
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "|", "=", "@", "?", "?", "}",         // 00-0F
        "]", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "!", "$", "-", "?", "?", "\""];       // 10-1F

    static alphaGlyphs = [      // indexed as (even digit BCD)*16 + (odd digit BCD)
        " ", "?", "?", ".",             // 00
        ")", "?", "?", "?",             // 04
        "?", "?", "|", "?",             // 08
        "?", "?", "?", "}",             // 0C
        "+", "?", "?", "$",             // 10
        "*", "?", "?", "?",             // 14
        "?", "?", "?", "?",             // 18
        "?", "?", "?", "?",             // 1C
        "-", "/", "?", ",",             // 20
        "(", "?", "^", "?",             // 24
        "?", "?", "?", "?",             // 28
        "?", "?", "?", "?",             // 2C
        "?", "?", "?", "=",             // 30
        "@", "?", "?", "?",             // 34
        "?", "?", "?", "?",             // 38
        "?", "?", "?", "?",             // 3C
        "?", "A", "B", "C",             // 40
        "D", "E", "F", "G",             // 44
        "H", "I", "?", "?",             // 48
        "?", "?", "?", "?",             // 4C
        "]", "J", "K", "L",             // 50
        "M", "N", "O", "P",             // 54
        "Q", "R", "!", "?",             // 58
        "?", "?", "?", "\"",            // 5C
        "?", "?", "S", "T",             // 60
        "U", "V", "W", "X",             // 64
        "Y", "Z", "?", "?",             // 68
        "?", "?", "?", "?",             // 6C
        "0", "1", "2", "3",             // 70
        "4", "5", "6", "7",             // 74
        "8", "9", "?", "?",             // 78
        "?", "?", "?", "?",             // 7C
        "?", "?", "?", "?",             // 80
        "?", "?", "?", "?",             // 84
        "?", "?", "?", "?",             // 88
        "?", "?", "?", "?",             // 8C
        "?", "?", "?", "?",             // 90
        "?", "?", "?", "?",             // 94
        "?", "?", "?", "?",             // 98
        "?", "?", "?", "?",             // 9C
        "?", "?", "?", "?",             // A0
        "?", "?", "?", "?",             // A4
        "?", "?", "?", "?",             // A8
        "?", "?", "?", "?",             // AC
        "?", "?", "?", "?",             // B0
        "?", "?", "?", "?",             // B4
        "?", "?", "?", "?",             // B8
        "?", "?", "?", "?",             // BC
        "?", "?", "?", "?",             // C0
        "?", "?", "?", "?",             // C4
        "?", "?", "?", "?",             // C8
        "?", "?", "?", "?",             // CC
        "?", "?", "?", "?",             // D0
        "?", "?", "?", "?",             // D4
        "?", "?", "?", "?",             // D8
        "?", "?", "?", "?",             // DC
        "?", "?", "?", "?",             // E0
        "?", "?", "?", "?",             // E4
        "?", "?", "?", "?",             // E8
        "?", "?", "?", "?",             // EC
        "?", "?", "?", "?",             // F0
        "?", "?", "?", "?",             // F4
        "?", "?", "?", "?",             // F8
        "?", "?", "?", "?"];            // FC


    // Public Instance Properties

    doc = null;                         // window document object
    window = null;                      // window object

    selectStopSwitch = 0;               // Select Stop switch off (0), on (1)
    stackerBar = null;                  // output stacker meter bar
    stackerCount = 0;                   // cards in output stacker
    stackerFrame = null;                // output stacker iframe
    stacker = null;                     // output stacker card area
    timer = new Timer();                // delay management timer


    constructor(context) {
        /* Initializes and wires up events for the card punch component of the
        1622 Card Reader/Punch device.
        "context" is an object passing other objects and callback functions from
        the global script:
            config is the SystemConfig object
            processor is the Processor object
        */
        const h = 140;
        const w = 579;
        let bufferReadyPoint = 0;
        let punchLatchPoint = 0;

        this.context = context;
        this.config = context.config;
        this.processor = context.processor;

        // Calculate timing factors.
        this.cardsPerMinute = this.config.getNode("Card.cpmPunch");
        this.punchPeriod = 60000/this.cardsPerMinute;
        switch (this.cardsPerMinute) {
        case 250:
            bufferReadyPoint = 206;                     // time in cycle when buffer is ready (ms)
            punchLatchPoint = this.punchPeriod-15;      // time in cycle when latch point occurs (ms)
            break;
        default:
            bufferReadyPoint = 411;
            punchLatchPoint = this.punchPeriod-28;
            break;
        }

        this.punchLatchPeriod = this.punchPeriod/4;     // for 4-tooth punch latch
        this.bufferReadyDelay = this.punchPeriod - (punchLatchPoint - bufferReadyPoint);
                                                        // delay from latch point to card buffer ready

        this.boundStartBtnClick = this.startBtnClick.bind(this);
        this.boundStopBtnClick = this.stopBtnClick.bind(this);
        this.boundCheckResetBtnClick = this.checkResetBtnClick.bind(this);
        this.boundNPROSwitchAction = this.NPROSwitchAction.bind(this);
        this.boundSelectStopSwitchClick = this.selectStopSwitchClick.bind(this);
        this.boundStackerBarClick = this.stackerBarClick.bind(this);

        this.clear();

        openPopup(window, "../webUI/CardPunch.html", "CardPunch",
                `location=no,scrollbars,resizable,width=${w},height=${h},left=0,top=${screen.availHeight-CardPunch.cardPunchTop}`,
                this, this.punchOnLoad);
    }


    /**************************************/
    clear() {
        /* Initializes (and if necessary, creates) the punch unit state */

        this.punchReady = false;        // status of PUNCH READY lamp
        this.transportReady = false;    // ready status: cards loaded and START or LOAD pressed
        this.transportReadySignal = null;// function that resolves the transport-ready Promise
        this.transportRequested = false;// waiting for punch transport ready
        this.bufferReady = false;       // punch card buffer is ready to be punched
        this.bufferEmptySignal = null;  // function that resolves the buffer-ready Promise
        this.bufferRequested = false;   // waiting for cardBuffer (this.bufferReady)
        this.punchCheck = false;        // true if a punch check has occurred
        this.punchCheckPending = false; // true if a punch check has been detected
        this.cardBuffer = "";           // card data to send to Processor
        this.nextLatchPointStamp = 0;   // timestamp when the next physical punch can initiate
        this.lastUseStamp = 0;          // last timestamp that a physical punch cycle occurred
    }

    /**************************************/
    $$(id) {
        /* Returns a DOM element from its id property. Must not be called until
        punchOnLoad is called */

        return this.doc.getElementById(id);
    }

    /**************************************/
    setPunchReadyStatus() {
        /* Determines the punch-ready state of the card punch and the
        PUNCH READY lamp */
        const wasReady = this.punchReady;

        this.punchReady = this.transportReady && !this.punchCheck;
        if (this.punchReady && !wasReady) {
            this.$$("PunchReadyLamp").classList.add("annunciatorLit");
        } else if (wasReady && !this.punchReady) {
            this.$$("PunchReadyLamp").classList.remove("annunciatorLit");
        }
    }

    /**************************************/
    setTransportReady(ready) {
        /* Controls the ready state of the card punch supply hopper/transport */

        if (ready && !this.transportReady) {
            if (this.stackerCount < CardPunch.stackerLimit) {
                this.transportReady = true;
            }
        } else if (this.transportReady && !ready) {
            this.transportReady = false;
        }

        this.setPunchReadyStatus();
    }

    /**************************************/
    setPunchCheck(check) {
        /* Controls the punch-check state of the card punch and the PUNCH
        CHECK lamp */

        if (check && !this.punchCheck) {
            this.punchCheck = true;
            this.$$("PunchCheckLamp").classList.add("annunciatorLit");
            if (this.selectStopSwitch) {
                this.setTransportReady(false);
            }
        } else if (this.punchCheck && !check) {
            this.punchCheck = false;
            this.$$("PunchCheckLamp").classList.remove("annunciatorLit");
        }

        this.punchCheckPending = false;
        this.setPunchReadyStatus();
    }

    /**************************************/
    startBtnClick(ev) {
        /* Handle the click event for the START button */

        if (!this.transportReady) {
            this.setTransportReady(true);
            if (this.punchReady) {
                if (this.transportRequested) {
                    this.transportReadySignal();
                } else if (this.bufferReady) {
                    this.initiateCardPunch();
                }
            }
        }
    }

    /**************************************/
    stopBtnClick(ev) {
        /* Handle the click event for the STOP button */

        if (this.transportReady) {
            this.setTransportReady(false);
        }
    }

    /**************************************/
    checkResetBtnClick(ev) {
        /* Handle the click event for the CHECK RESET button */

        if (!this.transportReady) {
            this.setPunchCheck(false);
        }
    }

    /**************************************/
    NPROSwitchAction(ev) {
        /* Handle the click events for the NPROSwitch. The punch must not be
        ready and the output supply hopper must be empty. The mousedown and
        mouse up events simply animate the button's appearance during a click */

        switch (ev.type) {
        case "mousedown":
            this.$$("NPROSwitch").classList.add("clicked");
            break;
        case "mouseup":
            this.$$("NPROSwitch").classList.remove("clicked");
            break;
        case "click":
            if (!this.transportReady) {
                this.bufferReady = false;
                this.cardBuffer = "";
                this.setPunchCheck(false);
            }
            break;
        case "dblclick":
            this.stackerBarClick(ev);
            break;
        }
    }

    /**************************************/
    selectStopSwitchClick(ev) {
        /* Handle the click event for the SelectStopSwitch */

        this.selectStopSwitch = 1-this.selectStopSwitch;
        this.config.putNode("Card.selectStop", this.selectStopSwitch);
        this.$$("SelectStopSwitch").classList.toggle("nStop");
    }

    /**************************************/
    stackerBarClick(ev) {
        /* Handle the click event for the "output stacker" meter bar and the
        double-click event for the NPROSwitch to export the card data and
        empty the punch's stacker */

        if (!this.transportReady) {
            this.unloadStacker();
            this.$$("StackerLamp").classList.remove("annunciatorLit");
            this.setPunchCheck(false);
        }
    }

    /**************************************/
    unloadStacker() {
        /* Copies the text contents of the output stacker of the device, opens a
        new temporary window, and pastes that text into the window so it can be
        copied, printed, or saved by the user. All characters are ASCII according
        to the convention used by the 1620-Jr project */
        const title = "retro-1620 Card Punch Extract";

        const exportStacker = (ev) => {
            const doc = ev.target;
            const win = doc.defaultView;
            const content = doc.getElementById("Paper");

            doc.title = title;
            win.moveTo((screen.availWidth-win.outerWidth)/2, (screen.availHeight-win.outerHeight)/2);
            content.textContent = this.stacker.textContent;
            this.stacker.textContent = "";
            this.stackerCount = 0;
            this.stackerBar.value = 0;
        };

        openPopup(this.window, "./FramePaper.html", "",
                "scrollbars,resizable,width=660,height=500",
                this, exportStacker);
    }

    /**************************************/
    beforeUnload(ev) {
        const msg = "Closing this window will make the device unusable.\n" +
                    "Suggest you stay on the page and minimize this window instead";

        ev.preventDefault();
        ev.returnValue = msg;
        return msg;
    }

    /**************************************/
    punchOnLoad(ev) {
        /* Initializes the punch window and user interface */

        this.doc = ev.target;           // now we can use this.$$()
        this.doc.title = "retro-1620 Card Punch";
        this.window = this.doc.defaultView;
        this.setPunchReadyStatus();

        const panel = this.$$("ControlsDiv");
        this.stopBtn = new PanelButton(panel, null, null, "StopBtn", "STOP", "device yellowButton", "yellowButtonDown");
        this.startBtn = new PanelButton(panel, null, null, "StartBtn", "START", "device greenButton", "greenButtonDown");
        this.checkResetBtn = new PanelButton(panel, null, null, "CheckResetBtn", "CHECK<br>RESET", "device whiteButton", "whiteButtonDown");

        this.stackerBar = this.$$("StackerBar");
        this.stackerBar.value = 0;
        this.stackerBar.max = CardPunch.stackerLimit;
        this.stackerFrame = this.$$("StackerFrame");

        // Override the font size for the #Paper element inside the stackerFrame iframe.
        this.stacker = this.stackerFrame.contentDocument.getElementById("Paper");
        this.stacker.style.fontSize = "11px";
        this.stacker.style.lineHeight = "120%";

        this.selectStopSwitch = (this.config.getNode("Card.selectStop") ? 1 : 0);
        if (this.selectStopSwitch) {
            this.$$("SelectStopSwitch").classList.remove("nStop");
        } else {
            this.$$("SelectStopSwitch").classList.add("nStop");
        }


        this.window.addEventListener("beforeunload", this.beforeUnload);
        this.startBtn.addEventListener("click", this.boundStartBtnClick);
        this.stopBtn.addEventListener("click", this.boundStopBtnClick);
        this.checkResetBtn.addEventListener("click", this.boundCheckResetBtnClick);
        this.$$("NPROSwitch").addEventListener("click", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").addEventListener("mousedown", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").addEventListener("mouseup", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").addEventListener("dblclick", this.boundNPROSwitchAction);
        this.$$("SelectStopSwitch").addEventListener("click", this.boundSelectStopSwitchClick);
        this.stackerBar.addEventListener("click", this.boundStackerBarClick);

        this.setTransportReady(true);

        const de = this.doc.documentElement;
        this.window.resizeBy(de.scrollWidth - this.window.innerWidth + 4, // kludge for right-padding/margin
                             de.scrollHeight - this.window.innerHeight);
        this.window.moveTo(0, screen.availHeight - CardPunch.cardPunchTop);
    }

    /**************************************/
    async waitForTransport() {
        /* Constructs and waits for a Promise that resolves when
        this.transportReadySignal() is called, then invalidates the transport-
        ready signaling mechanism. See:
        https://stackoverflow.com/questions/26150232/resolve-javascript-promise-
        outside-the-promise-constructor-scope */

        this.transportRequested = true;
        await new Promise((resolve) => {
            this.transportReadySignal = resolve;
        });

        this.transportReadySignal = null;
        this.transportRequested = false;
    }

    /**************************************/
    async waitForBuffer() {
        /* Constructs and waits for a Promise that resolves when
        this.bufferEmptySignal() is called, then invalidates the buffer-ready
        signaling mechanism. See:
        https://stackoverflow.com/questions/26150232/resolve-javascript-promise-
        outside-the-promise-constructor-scope */

        this.bufferRequested = true;
        await new Promise((resolve) => {
            this.bufferEmptySignal = resolve;
        });

        this.bufferEmptySignal = null;
        this.bufferRequested = false;
    }

    /**************************************/
    async initiateCardPunch() {
        /* Initiates the punching of the card from the card buffer */

        if (!this.transportReady) {
            await this.waitForTransport()
        } else {
            let now = performance.now();

            // First, if the punch has been idle for more than one minute, the
            // motor will have timed out, so wait 500 ms for it to spin back up.
            if (now - this.lastUseStamp > CardPunch.idlePeriod) {
                await this.timer.delayFor(CardPunch.idleStartupTime);
                now += CardPunch.idleStartupTime;
            }

            // Next, wait until the next clutch latch point occurs.
            if (this.nextLatchPointStamp < now) {
                // The next latch point has already passed, so compute a new one
                // based on where we are in the machine's cycle with respect to
                // the next latch point.
                const cyclePoint = now % this.punchLatchPeriod;
                const latchDelay = this.punchLatchPeriod - cyclePoint;
                if (latchDelay < 0) {   // must delay to latch point in next cycle
                    this.nextLatchPointStamp = now + latchDelay + this.punchLatchPeriod;
                } else {                // we can still catch this bus...
                    this.nextLatchPointStamp = now + latchDelay;
                }
            }

            // Wait until the next cluth latch point, then for buffer ready.
            const delay = this.nextLatchPointStamp - now + this.bufferReadyDelay;
            await this.timer.delayFor(delay);
            this.lastUseStamp = this.nextLatchPointStamp;
            this.nextLatchPointStamp += this.punchLatchPeriod;  // earliest time next punch can occur

            // Punch the card image.
            this.stacker.appendChild(this.doc.createTextNode(this.cardBuffer.trimEnd() + "\n"));
            this.stacker.scrollIntoView(false); // keep last line in view
            this.stackerBar.value = ++this.stackerCount;
            this.cardBuffer = "";               // clear the internal card buffer
            this.bufferReady = false;           // buffer is ready to receive more data
            if (this.punchCheckPending) {
                this.setPunchCheck(true);
            } else if (this.stackerCount >= CardPunch.stackerLimit) {
                this.setTransportReady(false);
                this.$$("StackerLamp").classList.add("annunciatorLit");
            }

            if (this.bufferRequested) {         // if data transfer is waiting for buffer
                this.bufferEmptySignal();       // tell 'em it's ready
            }
        }
    }

    /**************************************/
    async dumpNumeric(code) {
        /* Writes one digit to the card buffer. This should be used directly by
        Dump Numerically (DN, 35) Returns true after the 80th digit is received */
        const digit = code & Register.digitMask;
        let eob = 0;                    // end-of-block signal to Processor

        if (this.bufferReady) {         // buffer not available to receive now
            await this.waitForBuffer;
        }

        if (Envir.oddParity5[digit] != digit) {
            this.punchCheckPending = true;
        }

        const char = CardPunch.numericGlyphs[digit & Register.notParityMask];
        if (char == "?") {
            this.punchCheckPending = true;
        }

        this.cardBuffer += char;
        if (this.cardBuffer.length >= CardPunch.columns) {
            this.bufferReady = true;
            await this.initiateCardPunch();
            eob =  1;
        }

        return eob;
    }

    /**************************************/
    async writeAlpha(digitPair) {
        /* Writes one even/odd digit pair as a characterto the card buffer.
        This should be used directly by Write Alphanumerically (WA, 39). Returns
        true after the 80th digit is received */
        const even = (digitPair >> Register.digitBits) & Register.digitMask;
        const odd = digitPair & Register.digitMask;
        const code = (even & Register.bcdMask)*16 + (odd & Register.bcdMask);
        let eob = 0;                    // end-of-block signal to Processor

        if (this.bufferReady) {         // buffer not available to receive now
            await this.waitForBuffer;
        }

        if (Envir.oddParity5[even] != even || Envir.oddParity5[odd] != odd) {
            this.punchCheckPending = true;
        }

        const char = CardPunch.alphaGlyphs[code];
        if (char == "?") {
            this.punchCheckPending = true;
        }

        this.cardBuffer += char;
        if (this.cardBuffer.length >= CardPunch.columns) {
            this.bufferReady = true;
            await this.initiateCardPunch();
            eob = 1;
        }

        return eob;
    }

    /**************************************/
    writeNumeric(digit) {
        /* Writes one digit to the card buffer. This should be used directly by
        Write Numerically (WN, 38) Simply calls this.dumpNumerically and returns
        its Promise result */

        return this.dumpNumeric(digit);
    }

    /**************************************/
    initiateWrite() {
        /* Called by Processor to initiate a write I/O. Not used with CardPunch */
    }

    /**************************************/
    release () {
        /* Called by Processor to indicate the device has been released.
        Not used with CardPunch */
    }

    /**************************************/
    shutDown() {
        /* Shuts down the device */

        this.startBtn.removeEventListener("click", this.boundStartBtnChange);
        this.stopBtn.removeEventListener("click", this.boundStopBtnChange);
        this.checkResetBtn.removeEventListener("click", this.boundCheckResetBtnClick);
        this.$$("NPROSwitch").removeEventListener("click", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").removeEventListener("mousedown", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").removeEventListener("mouseup", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").removeEventListener("dblclick", this.boundNPROSwitchAction);
        this.$$("SelectStopSwitch").removeEventListener("click", this.boundSelectStopSwitchClick);
        this.stackerBar.removeEventListener("click", this.boundStackerBarClick);
        this.window.removeEventListener("beforeunload", this.beforeUnload, false);
        this.window.close();
    }

} // end class CardPunch
