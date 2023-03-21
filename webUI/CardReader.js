/***********************************************************************
* retro-1620/webUI CardReader.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* Card reader module for the 1622 Card Reader/Punch unit.
*
* Defines a card reader peripheral unit type.
*
************************************************************************
* 2022-12-23  P.Kimpel
*   Original version, from retro-220 B220CardatronInput.js.
***********************************************************************/

export {CardReader};

import {Timer} from "../emulator/Timer.js";
import {PanelButton} from "./PanelButton.js";
import {openPopup} from "./PopupUtil.js";

class CardReader {

    // Static Properties

    static columns = 80;                // if you don't know what this means, you shouldn't be here
    static idlePeriod = 60000;          // reader motor turnoff delay, ms (5 minutes)
    static idleStartupTime = 500;       // reader motor idle startup time, ms
    static stackerViewSize = 60;        // number of output stacker cards retained for viewing

    // Public Instance Properties

    doc = null;                         // window document object
    window = null;                      // window object
    hopperBar = null;                   // input hopper meter bar
    stackerFrame = null;                // output stacker iframe object
    stacker = null;                     // output stacker view area
    timer = new Timer();                // delay management timer

    eolRex = /([^\n\r\f]*)((:?\r[\n\f]?)|\n|\f)?/g;
    invalidCharRex = /[^A-Z0-9 .)+$*-/,(=@|}!"\x5D]/;


    constructor(context) {
        /* Initializes and wires up events for the card reader component of the
        1622 Card Reader/Punch device.
        "context" is an object passing other objects and callback functions from
        the global script:
            config is the SystemConfig object
            processor is the Processor object
        */
        const h = 164;
        const w = 575;

        this.context = context;
        this.config = context.config;
        this.processor = context.processor;


        // Calculate timing factors.
        this.cardsPerMinute = this.config.getNode("Card.cpmRead");
        this.readPeriod = 60000/this.cardsPerMinute;
        switch (this.cardsPerMinute) {
        case 500:
            this.bufferReadyPoint = 89 /*cheat*/ - 10;  // time in cycle when buffer is ready (ms)
            this.readLatchPoint = this.readPeriod-17;   // time in cycle when latch point occurs (ms)
            break;
        default:
            this.bufferReadyPoint = 177;
            this.readLatchPoint = this.readPeriod-31;
            break;
        }

        this.bufferReadyDelay = this.readPeriod - (this.readLatchPoint - this.bufferReadyPoint);
                                                        // delay from latch point to card buffer ready

        this.boundFileSelectorChange = this.fileSelectorChange.bind(this);
        this.boundStartBtnClick = this.startBtnClick.bind(this);
        this.boundStopBtnClick = this.stopBtnClick.bind(this);
        this.boundLoadBtnClick = this.loadBtnClick.bind(this);
        this.boundNPROSwitchAction = this.NPROSwitchAction.bind(this);
        this.boundHopperBarClick = this.hopperBarClick.bind(this);
        this.boundStackerDblClick = this.stackerDblClick.bind(this);

        this.clear();

        openPopup(window, "../webUI/CardReader.html", "CardReader",
                `location=no,scrollbars,resizable,width=${w},height=${h},` +
                `left=0,top=${screen.availHeight-h}`,
                this, this.readerOnLoad);
    }


    /**************************************/
    clear() {
        /* Initializes (and if necessary, creates) the reader unit state */

        this.readerReady = false;       // status of READER READY lamp
        this.transportReady = false;    // ready status: cards loaded and START or LOAD pressed
        this.cardReady = false;         // a card has been read and is ready to send to Processor
        this.readerCheck = false;       // true if a reader check has occurred
        this.cardBuffer = "";           // card data to send to Processor
        this.transferRequested = false; // Processor has requested transfer, waiting for card ready
        this.nextLatchPointStamp = 0;   // timestamp when the next physical read can initiate
        this.lastUseStamp = 0;          // last timestamp that a physical read cycle occurred

        this.buffer = "";               // card reader "input hopper"
        this.bufLength = 0;             // current input buffer length (characters)
        this.bufIndex = 0;              // 0-relative offset to next "card" to be read
        this.priorBufIndex = 0;         // 0-relative offset to the prior "card" just read
    }

    /**************************************/
    $$(id) {
        /* Returns a DOM element from its id property. Must not be called until
        readerOnLoad is called */

        return this.doc.getElementById(id);
    }

    /**************************************/
    setReaderReadyStatus() {
        /* Determines the reader-ready state of the card reader and the
        READER READY lamp */
        const wasReady = this.readerReady;

        this.readerReady = this.cardReady && this.transportReady && !this.readerCheck;
        if (this.readerReady && !wasReady) {
            this.$$("ReaderReadyLamp").classList.add("annunciatorLit");
        } else if (wasReady && !this.readerReady) {
            this.$$("ReaderReadyLamp").classList.remove("annunciatorLit");
        }
    }

    /**************************************/
    setTransportReady(ready) {
        /* Controls the ready state of the card reader hopper/transport */

        if (ready && !this.transportReady) {
            this.transportReady = true;
            this.$$("FileSelector").disabled = true;
        } else if (this.transportReady && !ready) {
            this.transportReady = false;
            this.$$("FileSelector").disabled = false;
        }

        this.setReaderReadyStatus();
    }

    /**************************************/
    setReaderCheck(check) {
        /* Controls the reader-check state of the card reader and the READER
        CHECK lamp */

        if (check && !this.readerCheck) {
            this.readerCheck = true;
            this.$$("ReaderCheckLamp").classList.add("annunciatorLit");
        } else if (this.readerCheck && !check) {
            this.readerCheck = false;
            this.$$("ReaderCheckLamp").classList.remove("annunciatorLit");
        }

        this.setReaderReadyStatus();
    }

    /**************************************/
    startBtnClick(ev) {
        /* Handle the click event for the START button */

        if (!this.transportReady) {
            if (this.bufIndex < this.bufLength) {       // hopper is not empty
                this.processor.resetIndicator(9);       // LAST_CARD gate
                this.setTransportReady(true);
                if (this.readerReady) {
                    this.initiateTransfer();
                } else {
                    this.initiateCardRead();
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
    loadBtnClick(ev) {
        /* Handle the click event for the LOAD button. If the Processor is not
        in MANUAL mode, this does the same thing as the START button. Otherwise,
        the routine sets up a physical card read and initiates it, which runs
        async. While that is happening, this routine calls the Processor's
        "insert" function, which initializes the Processor so that it calls the
        CardReader's initiateRead function. If the physical card read has
        finished by that time, the data will be transferred to the Processor.
        If not, the transferRequsted flag will be set and the transfer will take
        place once the read completes. The Processor's receiver function will
        then start execution of the code just loaded */
        const p = this.processor;

        if (p.gateAUTOMATIC.value || !p.gateMANUAL.value) {
            this.startBtnClick(ev);
        } else if (!(this.transportReady || this.cardReady || this.readerCheck ||
                p.ioReadCheck.value)) {
            if (this.bufIndex < this.bufLength) {       // input hopper is not empty
                this.setTransportReady(true);
                this.transferRequested = false;
                p.resetIndicator(9);                    // LAST_CARD gate
                this.initiateCardRead().then(() => {p.insert(true)});
            }
        }
    }

    /**************************************/
    NPROSwitchAction(ev) {
        /* Handle the click event for the NPROSwitch. The reader must not be
        ready and the input hopper must be empty. The mousedown and mouse up
        events simply animate the button's appearance during a click */

        switch (ev.type) {
        case "mousedown":
            this.$$("NPROSwitch").classList.add("clicked");
            break;
        case "mouseup":
            this.$$("NPROSwitch").classList.remove("clicked");
            break;
        case "click":
            if (!this.transportReady && this.bufIndex >= this.bufLength) {
                this.cardReady = false;         // invalidate the card buffer
                this.setReaderCheck(false);
            }
            break;
        case "dblclick":
            this.hopperBarClick(ev);
            break;
        }
    }

    /**************************************/
    hopperBarClick(ev) {
        /* Handle the click event for the "input hopper" meter bar and the
        double-click event for the NPROSwitch to completely empty the reader's
        input hopper */

        if (!this.transportReady && this.bufIndex < this.bufLength) {
            if (this.window.confirm((this.bufLength-this.bufIndex).toString() + " of " + this.bufLength.toString() +
                         " characters remaining to read.\nDo you want to clear the input hopper?")) {
                this.$$("FileSelector").value = null;   // reset the control
                this.$$("FileSelector").disabled = false;
                this.cardReady = false;
                this.setReaderCheck(false);
                this.hopperBar.value = 0;
                this.clear();
                while (this.stacker.firstChild) {
                    this.stacker.removeChild(this.stacker.firstChild);
                }
            }
        }
    }

    /**************************************/
    fileSelectorChange(ev) {
        /* Handle the <input type=file> onchange event when files are selected. For each
        file, load it and add it to the "input hopper" of the reader */
        const fileList = ev.target.files;

        const fileLoader_onLoad = (ev) => {
            /* Handle the onLoad event for a Text FileReader and load the text
            of the files into the buffer (i.e., the read hopper) */

            if (this.bufIndex >= this.bufLength) {
                this.buffer = ev.target.result;
            } else {
                switch (this.buffer.at(-1)) {
                case "\r":
                case "\n":
                case "\f":
                    break;                      // do nothing -- the last card has a delimiter
                default:
                    this.buffer += "\n";        // so the next deck starts on a new line
                    break;
                }

                this.buffer = this.buffer.substring(this.bufIndex) + ev.target.result;
            }

            this.bufIndex = 0;
            this.bufLength = this.buffer.length;
            this.$$("HopperBar").value = this.bufLength;
            this.$$("HopperBar").max = this.bufLength;
        };

        for (let file of fileList) {
            const deck = new FileReader();
            deck.onload = fileLoader_onLoad;
            deck.readAsText(file);
        }
    }

    /**************************************/
    extractCardImage() {
        /* Extracts one card image from the buffer. Does not pad or trim the
        image to 80 characters, as that will be handled in initiateTransmit().
        Updates the progress bar and output hopper view frame. Returns the raw
        card image as a string */
        let card = "";                  // card image
        let match = null;               // result of eolRex.exec()

        this.eolRex.lastIndex = this.bufIndex;
        match = this.eolRex.exec(this.buffer);
        if (!match) {
            card = "";
        } else {
            this.priorBufIndex = this.bufIndex;
            this.bufIndex += match[0].length;
            card = match[1].toUpperCase();
        }

        if (this.bufIndex < this.bufLength) {
            this.hopperBar.value = this.bufLength-this.bufIndex;
        } else {
            this.hopperBar.value = 0;
            //this.buffer = "";           // discard the input buffer
            //this.bufLength = 0;
            //this.bufIndex = this.priorBufIndex = 0;
            // Reset the control so the same file can be reloaded immediately.
            this.$$("FileSelector").value = null;
        }

        while (this.stacker.childNodes.length > CardReader.stackerViewSize) {
            this.stacker.removeChild(this.stacker.firstChild);
        }

        this.stacker.appendChild(this.doc.createTextNode("\n" + card));
        this.stacker.scrollIntoView(false);     // keep last line in view
        return card;
    }

    /**************************************/
    stackerDblClick(ev) {
        /* Handle the double-click event for the "output stacker" panel by
        opening a temporary sub-window and displaying the hopper buffer
        contents */

        if (this.bufLength > 0 && !this.transportReady) {
            openPopup(this.window, "./FramePaper.html", "",
                    "scrollbars,resizable,width=660,height=500",
                    this, this.viewStacker);
        }
    }

    /**************************************/
    viewStacker(ev) {
        /* Displays the text contents of the input hopper and output stacker of
        the device so it can be viewed by the user. All characters are ASCII
        according to the convention used by the CHM 1620-Jr project */
        const doc = ev.target;
        const content = doc.getElementById("Paper");
        const win = doc.defaultView;
        const title = "retro-1620 Card Reader Stacker View";

        let cardBox = null;

        doc.title = title;
        content.style.margin = `${content.offsetLeft + 4}px`;   // make room for cardBox transform
        win.moveTo((screen.availWidth-win.outerWidth)/2, (screen.availHeight-win.outerHeight)/2);

        if (this.bufIndex > this.priorBufIndex) {
            // Display the contents of the output stacker up to but not including
            // the last card read.
            content.appendChild(doc.createTextNode(this.buffer.substring(0, this.priorBufIndex)));

            // Create a text box for the last card read and fill it in.
            cardBox = doc.createElement("input");
            cardBox.type = "text";
            cardBox.size = CardReader.columns;
            cardBox.maxLength = CardReader.columns;
            cardBox.readOnly = true;            // for now...
            cardBox.style.transform = "translate(-4px,0)";      // adjust for box's border & padding
            cardBox.style.font = "inherit";
            cardBox.value = this.buffer.substring(this.priorBufIndex,
                    Math.min(this.priorBufIndex+CardReader.columns, this.bufIndex)).trimEnd();
            cardBox.title = "Last card that was read";
            content.appendChild(cardBox);
            content.appendChild(doc.createTextNode("\n"));
        }

        if (this.bufIndex < this.bufLength) {
            // Display the remainder of the buffer, which represents the input hopper.
            content.appendChild(doc.createTextNode(
                    this.buffer.substring(this.bufIndex).trimEnd()));
        }

        if (cardBox) {
            cardBox.focus();
            cardBox.scrollIntoView({block: "center"});
        }
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
    readerOnLoad(ev) {
        /* Initializes the reader window and user interface */

        this.doc = ev.target;           // now we can use this.$$()
        this.doc.title = "retro-1620 Card Reader";
        this.window = this.doc.defaultView;
        this.setReaderReadyStatus();

        const panel = this.$$("ControlsDiv");
        this.loadBtn = new PanelButton(panel, null, null, "LoadBtn", "LOAD", "device redButton", "redButtonDown");
        this.stopBtn = new PanelButton(panel, null, null, "StopBtn", "STOP", "device yellowButton", "yellowButtonDown");
        this.startBtn = new PanelButton(panel, null, null, "StartBtn", "START", "device greenButton", "greenButtonDown");

        this.hopperBar = this.$$("HopperBar");
        this.stackerFrame = this.$$("StackerFrame");

        // Override the font size for the #Paper element inside the stackerFrame iframe.
        this.stacker = this.stackerFrame.contentDocument.getElementById("Paper");
        this.stacker.style.fontSize = "11px";
        this.stacker.style.lineHeight = "120%";

        this.window.addEventListener("beforeunload", this.beforeUnload);
        this.startBtn.addEventListener("click", this.boundStartBtnClick);
        this.stopBtn.addEventListener("click", this.boundStopBtnClick);
        this.loadBtn.addEventListener("click", this.boundLoadBtnClick);
        this.$$("NPROSwitch").addEventListener("click", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").addEventListener("mousedown", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").addEventListener("mouseup", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").addEventListener("dblclick", this.boundNPROSwitchAction);
        this.$$("FileSelector").addEventListener("change", this.boundFileSelectorChange);
        this.hopperBar.addEventListener("click", this.boundHopperBarClick);
        this.stackerFrame.contentDocument.body.addEventListener("dblclick", this.boundStackerDblClick);

        // Resize the window to take into account the difference between inner and outer heights (WebKit).
        this.window.resizeBy(0, this.doc.body.scrollHeight-this.window.innerHeight);
    }

    /**************************************/
    async initiateCardRead() {
        /* Initiates the read of the next card into the card buffer */

        if (!this.transportReady) {
            return;
        } else if (this.readerCheck) {
            return;
        } else if (this.processor.ioReadCheck.value) {
            return;
        } else {
            let now = performance.now();
            // First, if the reader has been idle for more than one minute, the
            // motor will have timed out, so wait 500 ms for it to spin back up.
            if (now - this.lastUseStamp > CardReader.idlePeriod) {
                await this.timer.delayFor(CardReader.idleStartupTime);
                now += CardReader.idleStartupTime;
            }

            //const pic9 = (val, digits=8) => val.toFixed(1).padStart(digits+2, " ");
            //
            //console.debug("ICP-1: %s=NOW %s=LPS %s=DEL",
            //    pic9(now), pic9(this.nextLatchPointStamp), pic9(this.nextLatchPointStamp-now));

            // Next, wait until the next clutch latch point occurs.
            if (this.nextLatchPointStamp < now) {
                // The next latch point has already passed, so compute a new one
                // based on where we are in the machine's cycle with respect to
                // the next latch point.
                const cyclePoint = now % this.readPeriod;
                const latchDelay = this.readLatchPoint - cyclePoint;
                if (latchDelay < 0) {   // must delay to latch point in next cycle
                    this.nextLatchPointStamp = now + latchDelay + this.readPeriod;
                } else {                // we can still catch this bus...
                    this.nextLatchPointStamp = now + latchDelay;
                }

                //console.debug("ICP-2: %s=NOW %s=LPS %s=DEL           %s=CP  %s=LD",
                //    pic9(now), pic9(this.nextLatchPointStamp), pic9(this.nextLatchPointStamp-now),
                //    pic9(cyclePoint), pic9(latchDelay));
            }

            // Wait until the latch point occurs followed by card buffer ready.
            const delay = this.nextLatchPointStamp + this.bufferReadyDelay - now;
            await this.timer.delayFor(delay);
            this.lastUseStamp = this.nextLatchPointStamp;
            this.nextLatchPointStamp += this.readPeriod;        // earliest time next read can occur

            //const now2 = performance.now();
            //console.debug("ICP-3: %s=NOW %s=LPS %s=DEL %s=DLY %s=CYC, transferRequested=%i",
            //                    pic9(now2), pic9(this.nextLatchPointStamp), pic9(now2-now-delay),
            //                    pic9(delay), pic9(now2-this.lastUseStamp), this.transferRequested);

            // Read the card image and check it for invalid characters.
            this.cardBuffer = this.extractCardImage();
            if (this.invalidCharRex.test(this.cardBuffer)) {
                this.setReaderCheck(true);
            } else {
                this.cardReady = true;
                this.setReaderReadyStatus();
                if (this.transferRequested && !this.processor.ioReadCheck.value) {
                    this.transferRequested = false;
                    this.initiateTransfer();
                }
            }
        }
    }

    /**************************************/
    initiateTransfer() {
        /* Initiates transfer of the card buffer to the Processor. Note that
        this.cardBuffer always has exactly 80 characters when its ready */
        const limit = CardReader.columns-1;
        const p = this.processor;
        let lastChar = " ";             // last char defaults to padded space
        let length = this.cardBuffer.length;

        if (limit < length) {           // buffer is at least 80 characters
            lastChar = this.cardBuffer.at(limit);
            length = limit;
        }

        let x=0;
        while (x<length) {              // send up to 79 columns
            p.receiveCardColumn(this.cardBuffer[x], false);
            ++x;
        }

        while (x<limit) {               // pad to 79 columns with spaces
            p.receiveCardColumn(" ", false);
            ++x;
        }

        // Delay sending last column to the Processor until we can turn off
        // cardReady and initiate the next physical read.
        this.cardReady = false;
        if (this.bufIndex < this.bufLength) {
            this.initiateCardRead();
        } else {                        // reader hopper empty
            p.setIndicator(9);          // LAST_CARD gate
            this.setTransportReady(false);
        }

        p.receiveCardColumn(lastChar, true);
    }

    /**************************************/
    async initiateRead() {
        /* Called by the Processor to request transfer of the buffered card.
        If the buffered card is ready, transfer the buffer. If the buffered
        card is not ready, simply sets the transferRequested flag. Exits
        unconditionally. The next card will be sent once it has been read
        and no error conditions exist */

        if (this.cardReady && !this.processor.ioReadCheck.value) {
            this.initiateTransfer();            // queue to event loop
        } else {
            this.transferRequested = true;      // wait for reader
            if (!this.transportReady || this.readerCheck) {
                this.processor.updateLampGlow(1);       // freeze the lamp states
            }
        }
    }

    /**************************************/
    release () {
        /* Called by Processor to indicate the device has been released
        Not used with CardReader */
    }

    /**************************************/
    shutDown() {
        /* Shuts down the device */

        this.startBtn.removeEventListener("click", this.boundStartBtnChange);
        this.stopBtn.removeEventListener("click", this.boundStopBtnChange);
        this.loadBtn.removeEventListener("click", this.boundLoadBtnClick);
        this.$$("NPROSwitch").removeEventListener("click", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").removeEventListener("mousedown", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").removeEventListener("mouseup", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").removeEventListener("dblclick", this.boundNPROSwitchAction);
        this.$$("FileSelector").removeEventListener("change", this.boundFileSelectorChange);
        this.hopperBar.removeEventListener("click", this.boundHopperBarClick);
        this.stackerFrame.contentDocument.body.removeEventListener("dblclick", this.boundStackerDblClick);
        this.window.removeEventListener("beforeunload", this.beforeUnload, false);
        this.window.close();
    }

} // end class CardReader
