/***********************************************************************
* retro-1620/webUI LinePrinter.js
************************************************************************
* Copyright (c) 2023, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* Line printer module for the 11433 Line Printer unit.
*
* Defines a line printer peripheral unit type.
*
************************************************************************
* 2023-07-04  P.Kimpel
*   Original version, from retro-1620 CardPunch.js.
***********************************************************************/

export {LinePrinter};

import {Envir} from "../emulator/Envir.js";
import {Register} from "../emulator/Register.js";
import {Timer} from "../emulator/Timer.js";
import {ToggleButton} from "./ToggleButton.js";
import {WaitSignal} from "../emulator/WaitSignal.js";
import {PanelButton} from "./PanelButton.js";
import {openPopup} from "./PopupUtil.js";

class LinePrinter {

    // Static Properties

    static printerTop = 248;            // top coordinate of LinePrinter window
    static windowHeight = 300;          // window innerHeight, pixels
    static windowWidth120 = 810;        // window innerWidth for 120 columns, pixels
    static windowWidth144 = 966;        // window innerWidth for 144 columns, pixels

    static carriageBaseTime = 45;       // minimum immediate carriage control time, ms
    static carriageExtraTime = 10;      // additional carriage control time per line, ms
    static maxBufferSize = 197;         // maximum number of characters loaded to buffer
    static maxPaperLines = 150000;      // maximum printer scrollback (about a box of paper)
    static theColorGreen = "#CFC";      // for greenbar shading

    static dumpGlyphs = [       // indexed as BCD code prefixed with flag bit: F8421
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", Envir.glyphRecMark, " ", "@", " ", " ", "G",  // 00-0F
        "-", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "W",                " ", "*", " ", " ", "X"]; // 10-1F

    static numericGlyphs = [    // indexed as BCD code prefixed with flag bit: F8421
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "|", " ", " ", " ", " ", "}",                 // 00-0F
        "0", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "!", " ", " ", " ", " ", "\""];               // 10-1F

    static alphaGlyphs = [      // indexed as (even digit BCD)*16 + (odd digit BCD)
        " ", " ", " ",                ".", ")", " ", " ", " ", " ", " ", "|", " ", " ", " ", " ", "}",  // 00-0F
        "+", " ", " ",                "$", "*", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",  // 10-1F
        "-", "/", Envir.glyphRecMark, ",", "(", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",  // 20-2F
        " ", " ", " ",                "=", "@", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",  // 30-3F
        " ", "A", "B",                "C", "D", "E", "F", "G", "H", "I", " ", " ", " ", " ", " ", " ",  // 40-4F
        "-", "J", "K",                "L", "M", "N", "O", "P", "Q", "R", " ", " ", " ", " ", " ", " ",  // 50-5F
        " ", " ", "S",                "T", "U", "V", "W", "X", "Y", "Z", " ", " ", " ", " ", " ", " ",  // 60-6F
        "0", "1", "2",                "3", "4", "5", "6", "7", "8", "9", " ", " ", " ", " ", " ", " ",  // 70-7F
        " ", " ", " ",                " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",  // 80-8F
        " ", " ", " ",                " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",  // 90-9F
        "?", "?", "?",                "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?",  // A0-AF
        "?", "?", "?",                "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?",  // B0-BF
        "?", "?", "?",                "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?",  // C0-CF
        "?", "?", "?",                "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?",  // D0-DF
        "?", "?", "?",                "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?",  // E0-EF
        "?", "?", "?",                "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?", "?"]; // F0-FF


    // Public Instance Properties

    doc = null;                         // window document object
    window = null;                      // window object
    innerHeight = 0;                    // window specified innerHeight

    barGroup = null;                    // current greenbar line group
    useGreenBar = 0;                    // != 0 => do greenbar formatting
    linesRemaining = 0;                 // print lines remaining before end-of-paper
    lpi = 6;                            // lines per inch (actually, lines per bar group)
    formFeedCount = 0;                  // counter for triple-formfeed => rip paper
    groupLinesLeft = 0;                 // lines remaining in current greenbar group
    atTopOfForm = false;                // start new page flag

    paperDoc = null;                    // the content document for the paper frame
    paper = null;                       // the "paper" we print on
    paperMeter = null;                  // <meter> element showing amount of paper remaining
    timer = new Timer();                // timing object for printer


    constructor(context) {
        /* Initializes and wires up events for the 1443 Line Printer device.
        "context" is an object passing other objects and callback functions from
        the global script:
            config is the SystemConfig object
            processor is the Processor object
        */
        this.context = context;
        this.config = context.config;
        this.processor = context.processor;

        this.useGreenbar = (this.config.getNode("Printer.greenBar") ? 1 : 0);
        this.linesPerMinute = this.config.getNode("Printer.lpm");
        this.linePeriod = 60000/this.linesPerMinute;
        this.columns = this.config.getNode("Printer.columns");
        this.carriageControl = this.config.getNode("Printer.carriageControl");
        this.formLength = this.carriageControl.formLength;
        this.boundControlClick = this.controlClick.bind(this);

        this.waitForBuffer = new WaitSignal();
        this.waitForCarriage = new WaitSignal();

        this.clear();

        let geometry = this.config.formatWindowGeometry("LinePrinter");
        if (geometry.length) {
            this.innerHeight = this.config.getWindowProperty("LinePrinter", "innerHeight");
        } else {
            let width = (this.columns == 120 ? LinePrinter.windowWidth120 : LinePrinter.windowWidth144);
            this.innerHeight = LinePrinter.windowHeight;
            geometry = `,left=0,top=${LinePrinter.printerTop}` +
                       `,width=${width},height=${LinePrinter.windowHeight}`;
        }

        openPopup(window, "../webUI/LinePrinter.html", "retro-1620.LinePrinter",
                "location=no,scrollbars,resizable" + geometry,
                this, this.printerOnLoad);
    }


    /**************************************/
    clear() {
        /* Initializes (and if necessary, creates) the printer unit state */

        this.printerReady = false;      // status of READY lamp
        this.carriageReady = false;     // true if the print mechanism is ready
        this.printCheck = false;        // true if a printer check has occurred
        this.printCheckPending = false; // true if a printer check has been detected
        this.bufferReady = false;       // printer buffer is ready to be printed
        this.bufferOffset = 0;          // offset into the print buffer
        this.printBuffer = "";          // line data received from Processor
        this.nextPrintStamp = 0;        // timestamp when the next physical print can initiate
        this.carriageCode = 0;          // carriage control code from control() call
        this.suppressSpacing = 0;       // truthy if spacing should be suppressed for current write
    }

    /**************************************/
    $$(id) {
        /* Returns a DOM element from its id property. Must not be called until
        printOnLoad is called */

        return this.doc.getElementById(id);
    }

    /**************************************/
    setPrinterBusy(busy) {
        /* Controls this.bufferReady and the Processor's Printer Busy (35)
        indicator */

        this.bufferReady = busy;
        if (busy) {
            this.processor.setIndicator(35);
        } else {
            this.processor.resetIndicator(35);
        }
    }

    /**************************************/
    setPrinterReadyStatus() {
        /* Determines the printer-ready state of the printer and the
        READY lamp */
        const wasReady = this.printerReady;

        this.printerReady = this.carriageReady && !this.printCheck;
        if (this.printerReady && !wasReady) {
            this.$$("ReadyLamp").classList.add("annunciatorLit");
        } else if (wasReady && !this.printerReady) {
            this.$$("ReadyLamp").classList.remove("annunciatorLit");
        }
    }

    /**************************************/
    setCarriageReady(ready) {
        /* Controls the ready state of the printer mechanism */

        if (ready && !this.carriageReady) {
            if (this.linesRemaining > 0) {
                this.carriageReady = true;
            }
        } else if (this.carriageReady && !ready) {
            this.carriageReady = false;
        }

        this.setPrinterReadyStatus();
    }

    /**************************************/
    setPrintCheck(check) {
        /* Controls the print-check state of the printer, the PRINT CHECK lamp,
        and the Processor Printer Check (25) indicator */

        if (check && !this.printCheck) {
            this.printCheck = true;
            this.processor.setIndicator(25);
            this.$$("PrintCheckLamp").classList.add("annunciatorLit");
        } else if (this.printCheck && !check) {
            this.printCheck = false;
            this.processor.resetIndicator(25);
            this.$$("PrintCheckLamp").classList.remove("annunciatorLit");
        }

        this.printCheckPending = false;
        this.setPrinterReadyStatus();
    }

    /**************************************/
    setChannel9(sensed) {
        /* Controls Processor's Printer Channel 9 (33) indicator */

        if (sensed) {
            this.processor.setIndicator(33);
        } else {
            this.processor.resetIndicator(33);
        }
    }

    /**************************************/
    setChannel12(sensed) {
        /* Controls Processor's Printer Channel 12 (34) indicator */

        if (sensed) {
            this.processor.setIndicator(34);
        } else {
            this.processor.resetIndicator(34);
        }
    }

    /**************************************/
    startBtnClick(ev) {
        /* Handle the click event for the START button */

        if (!this.printerReady) {
            this.setCarriageReady(true);
            if (this.printerReady) {
                if (this.waitForCarriage.requested) {
                    this.waitForCarriage.signal(false);
                } else if (this.bufferReady) {
                    this.initiateLinePrinter();
                }
            }
        }
    }

    /**************************************/
    stopBtnClick(ev) {
        /* Handle the click event for the STOP button */

        if (this.carriageReady) {
            this.setCarriageReady(false);
        }
    }

    /**************************************/
    resetBtnClick(ev) {
        /* Handle the click event for the CHECK RESET button */

        if (this.printCheck) {
            this.setPrintCheck(false);
        }
    }

    /**************************************/
    paperMeterClick(ev) {
        /* Handle the click event for the "output stacker" meter bar to export
        the print data and empty the printer's stacker */

        if (!this.carriageReady) {
            this.unloadStacker();
        }
    }

    /**************************************/
    setGreenbar(useGreen) {
        /* Controls the display of "greenbar" shading on the paper */
        var rule = null;
        var rules = null;
        var sheet;
        var ss = this.paperFrame.contentDocument.styleSheets;
        var x;

        // First, find the style sheet for the paper frame.
        for (const sheet of ss) {
            if (sheet.ownerNode.id == "defaultStyleSheet") {
                rules = sheet.cssRules;
                // Next, search through the rules for the one that controls greenbar shading.
                for (const rule of rules) {
                    if (rule.selectorText?.toLowerCase() == "div.greenbar") {
                        // Found it: now flip the background color.
                        rule.style.backgroundColor = (useGreen ? this.theColorGreen : "white");
                        break; // out of for loop
                    }
                }
                break; // out of for loop
            }
        }
        this.$$("GreenbarCheck").checked = useGreen;
        this.useGreenbar = useGreen;
    }

    /**************************************/
    unloadStacker() {
        /* Copies the text contents of the output stacker of the device, opens a
        new temporary window, and pastes that text into the window so it can be
        copied, printed, or saved by the user. All characters are ASCII according
        to the convention used by the 1620-Jr project */
        const title = "retro-1620 Line Printer Extract";

        const exportStacker = (ev) => {
            const doc = ev.target;
            const win = doc.defaultView;
            const content = doc.getElementById("Paper");

            doc.title = title;
            win.moveTo((screen.availWidth-win.outerWidth)/2, (screen.availHeight-win.outerHeight)/2);
            content.textContent = this.paper.textContent;
            this.paper.textContent = "";
            this.linesRemaining = LinePrinter.maxPaperLines;
            this.paperMeter.value = LinePrinter.maxPaperLines;
            this.$$("EndOfFormLamp").classList.remove("annunciatorLit");
            this.setCarriageReady(true);
        };

        openPopup(this.window, "./FramePaper.html", "",
                "scrollbars,resizable,width=660,height=500",
                this, exportStacker);
    }

    /**************************************/
    controlClick(ev) {
        /* Handles click events for the panel controls */

        switch (ev.target.id) {
        case "StartBtn":
            this.startBtnClick(ev);
            break;
        case "StopBtn":
            this.stopBtnClick(ev);
            break;
        case "ResetBtn":
            this.resetBtnClick(ev);
            break;
        case "CarriageRestoreBtn":
            if (!this.carriageReady) {
                this.printLine("", 0, 1);
            }
            break;
        case "CarriageSpaceBtn":
            if (!this.carriageReady) {
                this.printLine("", 1, 0);
            }
            break;
        case "GreenbarCheck":
            this.setGreenbar(ev.target.checked);
            this.config.putNode("Printer.greenBar", (this.useGreenbar ? 1 : 0));
            break;
        case "PaperMeter":
            this.paperMeterClick(ev);
            break;
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
    printerOnLoad(ev) {
        /* Initializes the printer window and user interface */

        this.doc = ev.target;           // now we can use this.$$()
        this.doc.title = "retro-1620 Line Printer";
        this.window = this.doc.defaultView;
        this.paperFrame = this.$$("PaperFrame");
        this.paper = this.paperFrame.contentDocument.getElementById("Paper");
        this.setPrinterReadyStatus();

        const panel = this.$$("ControlsDiv");
        this.startBtn = new PanelButton(panel, null, null, "StartBtn", "START", "device greenButton", "greenButtonDown");
        this.stopBtn = new PanelButton(panel, null, null, "StopBtn", "STOP", "device yellowButton", "yellowButtonDown");
        this.carriageRestoreBtn = new PanelButton(panel, null, null, "CarriageRestoreBtn", "CARRIAGE<br>RESTORE", "device whiteButton", "whiteButtonDown");
        this.carriageSpaceBtn = new PanelButton(panel, null, null, "CarriageSpaceBtn", "CARRIAGE<br>SPACE", "device whiteButton", "whiteButtonDown");
        this.resetBtn = new PanelButton(panel, null, null, "ResetBtn", "RESET", "device whiteButton", "whiteButtonDown");
        this.setGreenbar(this.useGreenbar);

        this.paperMeter = this.$$("PaperMeter");
        this.paperMeter.value = LinePrinter.maxPaperLines;
        this.paperMeter.max = LinePrinter.maxPaperLines;
        this.paperMeter.low = LinePrinter.maxPaperLines*0.02;
        this.linesRemaining = LinePrinter.maxPaperLines;

        this.window.addEventListener("beforeunload", this.beforeUnload);
        this.startBtn.addEventListener("click", this.boundControlClick);
        this.stopBtn.addEventListener("click", this.boundControlClick);
        this.resetBtn.addEventListener("click", this.boundControlClick);
        this.carriageRestoreBtn.addEventListener("click", this.boundControlClick);
        this.carriageSpaceBtn.addEventListener("click", this.boundControlClick);
        this.$$("GreenbarCheck").addEventListener("click", this.boundControlClick);
        this.paperMeter.addEventListener("click", this.boundControlClick);

        this.setCarriageReady(true);

        // Resize the window to take into account the difference between
        // inner and outer heights (WebKit quirk).
        if (this.window.innerHeight < this.innerHeight) {        // Safari bug
            this.window.resizeBy(0, this.innerHeight - this.window.innerHeight);
        }

        //setTimeout(() => {
        //    this.window.resizeBy(0, this.doc.body.scrollHeight - this.window.innerHeight);
        //}, 250);
    }

    /**************************************/
    determineCarriageControl() {
        /* Determines the type of carriage control that should be applied to the
        current print line. Returns a triplet with line space, channel skip, and
        before (immediate) action */
        const digit1 = this.carriageCode >> 6;
        const digit2 = this.carriageCode & 0x0F;
        let space = 1;                  // single-spacing by default
        let skip = 0;                   // no channel skip (overrides spacing) by default
        let before = digit1 & 1;        // carriage control before/after print

        switch (digit1) {
        case 2:
            space = this.carriageCode & 1;
            break;
        case 0:
        case 3:
            switch (digit2) {
            case 3:
                skip = 11;
                break;
            case 4:
                skip = 12;
                break;
            }
            break;
        case 4:
        case 7:
            if (digit2) {
                skip = digit2;
            } else {
                skip = 10;
            }
        case 5:
        case 6:
            space = digit2 & 3;
            break;
        }

        return [space, skip, before];
    }

    /**************************************/
    appendLine(text) {
        /* Appends one line to the current greenbar group, this.barGroup.
        This handles top-of-form and greenbar highlighting */
        var skip = "";

        if (this.groupLinesLeft <= 0) {
            // Start the green half of a greenbar group
            this.barGroup = this.doc.createElement("div");
            this.paper.appendChild(this.barGroup);
            this.groupLinesLeft = this.lpi;
            if (!this.atTopOfForm) {
                this.barGroup.className = "printerPaper greenBar";
            } else {
                skip = "\f";               // prepend a form-feed to the line
                this.atTopOfForm = false;
                this.barGroup.className = "printerPaper greenBar topOfForm";
            }
        } else if (this.groupLinesLeft*2 == this.lpi) {
            // Start the white half of a greenbar group
            this.barGroup = this.doc.createElement("div");
            this.paper.appendChild(this.barGroup);
            this.barGroup.className = "printerPaper whiteBar";
        }

        const lineDiv = this.doc.createElement("div");
        lineDiv.appendChild(this.doc.createTextNode(((skip + text) || "\xA0") + "\n"));
        this.barGroup.appendChild(lineDiv);
        --this.groupLinesLeft;
        --this.linesRemaining;
    }

    /**************************************/
    printLine(text, space, skip) {
        /* Prints one line to the "paper", handling carriage control and greenbar
        group completion. "space" is the number of lines to space, "skip" is the
        channel to skip to (which overrides spacing), "before" indicates space
        or skip before print. For now, all skips are to top-of-form and space 0
        (overprinting) is treated as single-spacing */

        // Output the line to the paper.
        this.appendLine(text);

        // Do any carriage control after printing.
        if (!this.suppressSpacing) {
            if (skip) {
                while (this.groupLinesLeft > 0) {
                    this.appendLine("");
                }

                this.atTopOfForm = true;
                this.linesRemaining -= 20;      // estimated
                this.nextPrintTime += LinePrinter.carriageExtraTime*20; // estimated
            } else {
                if (space > 2) {
                    this.nextPrintTime += LinePrinter.carriageExtraTime*(space-2);
                }

                while (space > 1) {
                    this.appendLine("");
                    --space;
                }
            }

            this.carriageCode = 0;
        }
    }

    /**************************************/
    async initiateLinePrinter() {
        /* Initiates the printing of the line from the buffer */
        let now = performance.now();

        if (!this.carriageReady) {
            if (await this.waitForCarriage.request()) {
                return;                         // wait canceled
            }
        }

        // Wait until the next print cycle occurs.
        let [space, skip, before] = this.determineCarriageControl();
        if (this.nextPrintStamp > now) {
            await this.timer.delayFor(this.nextPrintStamp - now);
        }

        // Print the line image.
        this.nextPrintStamp = now + this.linePeriod;  // earliest time next print can occur
        this.printLine(this.printBuffer.substring(0, this.columns).trimEnd(), space, skip);
        this.paper.scrollIntoView(false);       // keep last line in view
        this.paperMeter.value = this.linesRemaining;
        if (this.printCheckPending) {
            this.setPrintCheck(true);           // leave buffer in ready state
        } else if (this.linesRemaining <= 0) {
            this.setCarriageReady(false);
            this.$$("EndOfFormLamp").classList.add("annunciatorLit");
        }

        this.printBuffer = "";                  // clear the internal print buffer
        this.setPrinterBusy(false);             // buffer is ready to receive more data
        this.waitForBuffer.signal(false);       // tell 'em it's ready
    }

    /**************************************/
    async dumpNumeric(code) {
        /* Writes one digit to the print buffer. This should be used directly by
        Dump Numerically (DN, 35). Returns 1 after the print buffer is full */
        const digit = code & Register.digitMask;
        let eob = 0;                    // end-of-block signal to Processor

        if (this.bufferReady) {         // buffer not available to receive now
            if (await this.waitForBuffer.request()) {
                return 1;                       // wait canceled
            }
        }

        ++this.bufferOffset;
        if (this.bufferOffset <= this.columns && code >= 0) {
            this.printBuffer += LinePrinter.dumpGlyphs[digit & Register.notParityMask];
            if (Envir.oddParity5[digit] != digit) {
                this.printCheckPending = true;
            }
        }

        if (this.bufferOffset >= LinePrinter.maxBufferSize) {
            this.setPrinterBusy(true);
            await this.initiateLinePrinter();
            eob =  1;
        }

        return eob;
    }

    /**************************************/
    async writeNumeric(code) {
        /* Writes one digit to the print buffer. This should be used directly by
        Write Numerically (WN, 38). A "code" less than zero implies a record mark
        has been detected by the processor and this call is just to fill out the
        buffer. Returns 1 after the 80th digit is received */
        const digit = code & Register.digitMask;
        let eob = 0;                    // end-of-block signal to Processor

        if (this.bufferReady) {         // buffer not available to receive now
            if (await this.waitForBuffer.request()) {
                return 1;                       // wait canceled
            }
        }

        ++this.bufferOffset;
        if (this.bufferOffset <= this.columns && code >= 0) {
            this.printBuffer += LinePrinter.numericGlyphs[digit & Register.notParityMask];
            if (Envir.oddParity5[digit] != digit) {
                this.printCheckPending = true;
            }
        }

        if (this.bufferOffset >= LinePrinter.maxBufferSize) {
            this.setPrinterBusy(true);
            eob = 1;
            await this.initiateLinePrinter();
        }

        return eob;
    }

    /**************************************/
    async writeAlpha(digitPair) {
        /* Writes one even/odd digit pair as a characterto the print buffer.
        This should be used directly by Write Alphanumerically (WA, 39). A
        "code" less than zero implies a record mark has been detected by the
        processor and this call is just to fill out the buffer. Returns 1
        after the 80th digit pair is received */
        const even = (digitPair >> Register.digitBits) & Register.digitMask;
        const odd = digitPair & Register.digitMask;
        const code = (even & Register.bcdMask)*16 + (odd & Register.bcdMask);
        let eob = 0;                    // end-of-block signal to Processor

        if (this.bufferReady) {         // buffer not available to receive now
            if (await this.waitForBuffer.request()) {
                return 1;                       // wait canceled
            }
        }

        ++this.bufferOffset;
        if (this.bufferOffset <= this.columns && digitPair >= 0) {
            this.printBuffer += LinePrinter.alphaGlyphs[code];
            if (Envir.oddParity5[even] != even || Envir.oddParity5[odd] != odd) {
                this.printCheckPending = true;
            }
        }

        if (this.bufferOffset >= LinePrinter.maxBufferSize) {
            this.setPrinterBusy(true);
            eob = 1;
            await this.initiateLinePrinter();
        }

        return eob;
    }

    /**************************************/
    initiateWrite(ioVariant) {
        /* Called by Processor to initiate a write I/O. The low-order bit of
        ioVariant will determine if standard single spacing (0) or the
        previously-stored carriage control (1) will be performed */

        this.suppressSpacing = ioVariant & 1;
        this.bufferOffset = 0;
    }

    /**************************************/
    async control(code) {
        /* Performs control functions for the printer. "code" is the 2-digit
        contents of MBR in I-6 (the Q10/Q11 digits of the instruction. for
        immediate carriage control, executes it here asynchronously. For deferred
        carriage control, simply stores the code until the next time a write
        occurs with its Q11 1-bit set */

        if (this.bufferReady) {         // buffer busy being printed
            if (await this.waitForBuffer.request()) {
                return;                 // wait canceled
            }
        }

        this.carriageCode =  code & Register.bcdValueMask;
        let [space, skip, before] = this.determineCarriageControl();
        if (before) {                   // do immediate carriage control
            this.carriageCode = 0;      // reset the carriage control code
            if (!this.carriageReady) {
                if (await this.waitForCarriage.request()) {
                    return;             // wait canceled
                }
            }

            this.setPrinterBusy(true);
            let now = performance.now();
            let ccTime = LinePrinter.carriageBaseTime + LinePrinter.carriageExtraTime;
            if (skip > 0) {
                ccTime += LinePrinter.carriageExtraTime*20; // estimated
            } else if (space > 1) {
                ccTime += LinePrinter.carriageExtraTime*(space-1);
            }

            if (this.nextPrintStamp > now) {
                await this.timer.delayFor(this.nextPrintStamp - now);
            }

            if (skip) {
                while (this.groupLinesLeft > 0) {
                    this.appendLine("");
                }

                this.atTopOfForm = true;
                this.linesRemaining -= 20;      // estimated
            } else {
                while (space > 0) {
                    this.appendLine("");
                    --space;
                }
            }

            this.paper.scrollIntoView(false);   // keep last line in view
            this.paperMeter.value = this.linesRemaining;
            if (this.linesRemaining <= 0) {
                this.setCarriageReady(false);
                this.$$("EndOfFormLamp").classList.add("annunciatorLit");
            }

            this.nextPrintStamp = now + ccTime;
            this.setPrinterBusy(false);         // buffer is ready to receive more data
            this.waitForBuffer.signal(false);   // tell 'em it's ready
        }
    }

    /**************************************/
    release () {
        /* Called by Processor to indicate the device has been released */

        if (this.waitForBuffer.requested) {     // in case we've been manually released
            this.waitForBuffer.signal(true);
        }

        if (this.waitForCarriage.requested) {    // ditto
            this.waitForCarriage.signal(true);
        }
    }

    /**************************************/
    shutDown() {
        /* Shuts down the device */

        this.startBtn.removeEventListener("click", this.boundControlClick);
        this.stopBtn.removeEventListener("click", this.boundControlClick);
        this.resetBtn.removeEventListener("click", this.boundControlClick);
        this.carriageRestoreBtn.removeEventListener("click", this.boundControlClick);
        this.carriageSpaceBtn.removeEventListener("click", this.boundControlClick);
        this.$$("GreenbarCheck").removeEventListener("click", this.boundControlClick);
        this.paperMeter.removeEventListener("click", this.boundControlClick);

        this.config.putWindowGeometry(this.window, "LinePrinter");
        this.window.removeEventListener("beforeunload", this.beforeUnload);
        this.window.close();
    }

} // end class LinePrinter
