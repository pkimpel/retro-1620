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
    static windowHeight = 290;          // window innerHeight, pixels
    static windowWidth120 = 820;        // window innerWidth for 120 columns, pixels
    static windowWidth144 = 984;        // window innerWidth for 144 columns, pixels

    static carriageBaseTime = 45;       // minimum immediate carriage control time, ms
    static carriageExtraTime = 10;      // additional carriage control time per line, ms
    static defaultGroupSize = 6;        // default greenbar group size (green+white) for 6 lpi
    static maxBufferSize = 197;         // maximum number of characters loaded to buffer
    static maxCCLines = 132;            // maximum lines supported on a carriage tape
    static maxPaperLines = 150000;      // maximum printer scrollback (about a box of paper)
    static greenbarGreen = "#CFC";      // for toggling greenbar shading

    static channel1Mask = 0b000000000001;
    static channel9Mask = 0b000100000000;
    static channel12Mask= 0b100000000000;

    static dumpGlyphs = [       // indexed as BCD code prefixed with flag bit: F8421
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", Envir.glyphRecMark, "~", "@", "~", "~", "G",  // 00-0F
        "-", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "W",                "~", "*", "~", "~", "X"]; // 10-1F

    static numericGlyphs = [    // indexed as BCD code prefixed with flag bit: F8421
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "|", "~", " ", "~", "~", "}",                 // 00-0F
        "-", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "!", "~", " ", "~", "~", "\""];               // 10-1F

    static alphaGlyphs = [      // indexed as (even digit BCD)*16 + (odd digit BCD)
        " ", "~", "?",                ".", ")", "~", "~", "~", "~", "~", "|", "~", "~", "~", "~", "}",  // 00-0F
        "+", "~", "!",                "$", "*", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~",  // 10-1F
        "-", "/", Envir.glyphRecMark, ",", "(", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~",  // 20-2F
        "~", "~", "~",                "=", "@", ":", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~",  // 30-3F
        "~", "A", "B",                "C", "D", "E", "F", "G", "H", "I", "~", "~", "~", "~", "~", "~",  // 40-4F
        "-", "J", "K",                "L", "M", "N", "O", "P", "Q", "R", "~", "~", "~", "~", "~", "~",  // 50-5F
        "~", "~", "S",                "T", "U", "V", "W", "X", "Y", "Z", "~", "~", "~", "~", "~", "~",  // 60-6F
        "0", "1", "2",                "3", "4", "5", "6", "7", "8", "9", "~", "~", "~", "~", "~", "~",  // 70-7F
        "~", "~", "~",                "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~",  // 80-8F
        "~", "~", "~",                "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~",  // 90-9F
        "~", "~", "~",                "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~",  // A0-AF
        "~", "~", "~",                "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~",  // B0-BF
        "~", "~", "~",                "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~",  // C0-CF
        "~", "~", "~",                "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~",  // D0-DF
        "~", "~", "~",                "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~",  // E0-EF
        "~", "~", "~",                "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~", "~"]; // F0-FF


    // Public Instance Properties

    doc = null;                         // window document object
    window = null;                      // window object
    innerHeight = 0;                    // window specified innerHeight

    atTopOfForm = true;                 // start new page flag
    barGroup = null;                    // current greenbar line group
    carriageTape = [];                  // per-line skip-to-channel marker masks
    formLength = 0;                     // form length for carriage control (0=>simple CC)
    groupLinesLeft = 0;                 // lines remaining in current greenbar group
    lastLineDiv = null;                 // <div> of last non-overstruck line
    lineNr = 0;                         // current print line number (0-relative)
    lpi = LinePrinter.defaultGroupSize; // lines per inch (actually, lines per bar group)
    overstrike = false;                 // true if next line is to be overstruck with last
    supplyRemaining = 0;                // print lines remaining before end-of-paper
    useGreenBar = 0;                    // != 0 => do greenbar formatting

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
        this.createCarriageControl(this.config.getNode("Printer.carriageControl"));

        this.boundControlClick = this.controlClick.bind(this);
        this.boundEndOfFormClick = this.endOfFormClick.bind(this);
        this.boundLoadCarriageControl = this.loadCarriageControl.bind(this);

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
        this.bufferBusy = false;        // printer buffer not available for input, being printed
        this.bufferOffset = 0;          // offset into the print buffer
        this.carriageCode = 0;          // carriage control code from control() call
        this.printBuffer = "";          // line data received from Processor
        this.printReadyDelay = 0;       // time until printer becomes ready again, ms
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
        /* Controls this.bufferBusy and the Processor's Printer Busy (35)
        indicator */

        this.bufferBusy = busy;
        if (busy) {
            this.processor.setIndicator(35);
        } else {
            this.processor.resetIndicator(35);
            this.waitForBuffer.signal(false);   // tell 'em it's ready
        }
    }

    /**************************************/
    setPrinterReadyStatus() {
        /* Determines the printer-ready state of the printer and the
        READY lamp */
        const wasReady = this.printerReady;

        this.printerReady = this.carriageReady; // formerly included: && !this.printCheck;
        this.$$("CCLoadBtn").disabled = this.printerReady;
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
            if (this.supplyRemaining > 0) {
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
            // Print check does not affect printerReady, was: this.setCarriageReady(false);
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
                } else if (this.bufferBusy) {
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
        const ss = this.paperFrame.contentDocument.styleSheets;

        // First, find the style sheet for the paper frame.
        for (const sheet of ss) {
            if (sheet.ownerNode.id == "defaultStyleSheet") {
                const rules = sheet.cssRules;
                // Next, search through the rules for the one that controls greenbar shading.
                for (const rule of rules) {
                    if (rule.selectorText?.toLowerCase() == "div.greenbar") {
                        // Found it: now flip the background color.
                        rule.style.backgroundColor = (useGreen ? LinePrinter.greenbarGreen : "white");
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
    endOfFormClick(ev) {
        /* Handler for double-clicking the END OF FORM lamp and printing the paper area */

        this.paperFrame.contentWindow.print();
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
            let text = this.paper.textContent.replace(/[\u2021]/g, "|");        // record mark
            if (text[0] == "\f") {
                text = text.substring(1);       // drop leading form-feed
            }

            doc.title = title;
            win.moveTo((screen.availWidth-win.outerWidth)/2, (screen.availHeight-win.outerHeight)/2);
            content.textContent = text;
            this.paper.textContent = "";
            this.supplyRemaining = LinePrinter.maxPaperLines;
            this.paperMeter.value = LinePrinter.maxPaperLines;
            this.$$("EndOfFormLamp").classList.remove("annunciatorLit");
            this.setCarriageReady(true);
        };

        this.overstrike = false;
        this.lastLineDiv = null;

        // Fill out the page before extracting the text.
        if (this.formLength == 0) {             // use simple carriage control
            this.skipToChannel(1, 0);
        } else {
            while (this.lineNr && this.lineNr < this.formLength) {
                this.appendLine("");
            }
        }

        openPopup(this.window, "./FramePaper.html", "",
                "scrollbars,resizable,width=660,height=500",
                this, exportStacker);
    }

    /**************************************/
    createCarriageControl(cc) {
        /* Creates the carriage control properties from the config structure */

        this.formLength = Math.min(cc.formLength, LinePrinter.maxCCLines);
        if (this.formLength == 0) {
            this.carriageTape = [0b111111111111];       // all channels at top of page
        } else {
            this.carriageTape = new Array(this.formLength);
            this.carriageTape.fill(0);
            for (let lineKey in cc.channelSpecs) {
                const lineNr = parseInt(lineKey, 10);
                if (!isNaN(lineNr) && lineNr > 0 && lineNr <= this.formLength) {
                    const mask = parseInt(cc.channelSpecs[lineKey], 10);
                    if (!isNaN(mask)) {
                        this.carriageTape[lineNr-1] = mask;
                    }
                }
            }
        }
    }

    /**************************************/
    loadCarriageControl(ev) {
        /* Enables the CarriageControl Div overlay to view or select a CC tape file */

        const closeLoad = (ev) => {
            /* Unwires the local events and closes the load panel */

            this.$$("CCUseDefaultBtn").removeEventListener("click", useDefaultCC);
            this.$$("CCCloseBtn").removeEventListener("click", closeLoad);
            this.$$("CCTapeSelector").removeEventListener("change", initiateCCTapeLoad);
            this.$$("CCTapeSelector").value = null;     // reset the file-picker control
            this.$$("CarriageControlDiv").style.display = "none";
        };

        const formatCCTape = () => {
            /* Formats the current this.formLength and this.carriageTape data */
            const body = this.$$("CCTapeBody");

            this.$$("CCFormLengthSpan").textContent = this.formLength;
            body.innerHTML = "";
            const maxLines = Math.max(Math.min(this.formLength, this.carriageTape.length), 1);
            for (let x=0; x<maxLines; ++x) {
                const row = this.doc.createElement("tr");
                let cell = this.doc.createElement("td");
                cell.textContent = x+1;
                row.appendChild(cell);
                let mask = this.carriageTape[x];
                for (let ch=1; ch<=12; ++ch) {
                    cell = this.doc.createElement("td");
                    cell.textContent = (mask & 1) ? ch : "\xA0";        // &nbsp;
                    row.appendChild(cell);
                    mask >>= 1;
                }

                body.appendChild(row);
            }
        };

        const exportCarriageTape = () => {
            /* Reformats the this.carriageTape line array as a carriageSpecs
            object for SystemConfig storage */
            const carriageSpecs = {};

            for (let x=0; x<this.carriageTape.length; ++x) {
                if (this.carriageTape[x]) {
                    carriageSpecs[(x+1).toString()] = this.carriageTape[x];
                }
            }

            return carriageSpecs;
        };

        const useDefaultCC = () => {
            /* Applies a default carriage-control tape: top-of-form only */
            const cc = {formLength: 0};

            this.$$("CCTapeSelector").value = null;
            this.createCarriageControl(cc);
            cc.channelSpecs = exportCarriageTape();
            this.config.putNode("Printer.carriageControl", cc);
            this.atTopOfForm = true;
            this.setChannel9(false);
            this.setChannel12(false);
            formatCCTape();
        };

        const initiateCCTapeLoad = (ev) => {
            /* Handle the <input type=file> onchange event when a file is selected
            to initiate a carriage-control tape load */

            const fileLoader_onLoad = (ev) => {
                /* Handle the onLoad event for a Text FileReader and pass the text
                of the file to the processsor for loading into memory */
                let cc = null;

                try {
                    cc = JSON.parse(ev.target.result);
                    if ("formLength" in cc) {
                        this.formLength = parseInt(cc.formLength, 10);
                        if (!isNaN(this.formLength) && this.formLength >= 0) {
                            this.createCarriageControl(cc);
                            formatCCTape();
                            this.config.putNode("Printer.carriageControl", {
                                formLength: this.formLength,
                                channelSpecs: exportCarriageTape()
                            });
                        }
                    }
                } catch (e) {
                    this.window.alert(`Invalid JSON file: ${e}`);
                }
            };

            const reader = new FileReader();
            reader.onload = fileLoader_onLoad;
            reader.readAsText(ev.target.files[0]);
        };

        if (!this.printerReady) {
            this.$$("CarriageControlDiv").style.display = "block";
            this.$$("CCTapeSelector").addEventListener("change", initiateCCTapeLoad);
            this.$$("CCCloseBtn").addEventListener("click", closeLoad);
            this.$$("CCUseDefaultBtn").addEventListener("click", useDefaultCC);
            formatCCTape();
        }
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
        this.supplyRemaining = LinePrinter.maxPaperLines;

        this.window.addEventListener("beforeunload", this.beforeUnload);
        this.startBtn.addEventListener("click", this.boundControlClick);
        this.stopBtn.addEventListener("click", this.boundControlClick);
        this.resetBtn.addEventListener("click", this.boundControlClick);
        this.carriageRestoreBtn.addEventListener("click", this.boundControlClick);
        this.carriageSpaceBtn.addEventListener("click", this.boundControlClick);
        this.$$("GreenbarCheck").addEventListener("click", this.boundControlClick);
        this.paperMeter.addEventListener("click", this.boundControlClick);
        this.$$("EndOfFormLamp").addEventListener("dblclick", this.boundEndOfFormClick);
        this.$$("CCLoadBtn").addEventListener("click", this.boundLoadCarriageControl);

        this.setCarriageReady(true);

        // Resize the window to take into account the difference between
        // inner and outer heights (WebKit quirk).
        if (this.window.innerHeight < this.innerHeight) {        // Safari bug
            this.window.resizeBy(0, this.innerHeight - this.window.innerHeight);
        }

        // Adjust the top margin and padding on the paper area.
        const paperBody = this.paperFrame.contentDocument.getElementById("PaperBody");
        paperBody.style.marginTop = 0;
        paperBody.style.paddingTop = 0;
    }

    /**************************************/
    determineCarriageControl(carriageCode) {
        /* Determines the type of carriage control that should be applied to the
        current print line. Returns a triplet with line space, channel skip, and
        a before (immediate) action flag */
        const digit1 = (carriageCode >> Register.digitBits) & Register.bcdMask;
        const digit2 = carriageCode & Register.bcdMask;
        let space = 1;                  // single-spacing by default
        let skip = 0;                   // no channel skip (overrides spacing) by default
        let before = digit1 & 1;        // carriage control before/after print

        switch (digit1) {
        case 2:
            if (digit2 == 1) {
                space = 1;
            }
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
            if (digit2 == 0) {
                skip = 10;
            } else if (digit2 <= 9) {
                skip = digit2;
            }
        case 5:
        case 6:
            switch (digit2) {
            case 2:
            case 3:
                space = digit2;
                break;
            }
            break;
        }

        return [space, skip, before];
    }

    /**************************************/
    updateEOPChannels() {
        /* Checks the end-of-page channels 9 and 12. If the current line of the
        channel tape has a 1 punch, resets indicators 33 (channel 9) and 34
        (channel 12). Otherwise, sets indicators 33 and/or 34 if the current
        line has a corresonding 9 or 12 punch. Channel 1 action takes precedence */

        const chan = this.carriageTape[this.lineNr];
        if (chan & LinePrinter.channel1Mask) {  // channel 1: reset ch. 9 & 12
            this.setChannel9(false);
            this.setChannel12(false);
        } else {
            if (chan & LinePrinter.channel9Mask) {
                this.setChannel9(true);
            }
            if (chan & LinePrinter.channel12Mask) {
                this.setChannel12(true);
            }
        }
    }

    /**************************************/
    overstrikeBoldly(lineText) {
        /* Formats an overstike print line and appends it to to the <div>
        referenced by this.lastLineDiv. If the contents of this.lastLineDiv
        starts with a text node, replaces it with a <div> containing that
        text node. Then processes all of the line <div>s in the outer <div>
        to determine which characters in them are the same as a corresponding
        character in lineText. Any corresponding characters are formatted as
        bold text */

        // If the first node in the overstrike group is text, convert it to a <div>.
        if (this.lastLineDiv.firstChild) {
            const node = this.lastLineDiv.firstChild;
            if (node.nodeType == Node.TEXT_NODE) {
                const firstDiv = this.doc.createElement("div");
                firstDiv.appendChild(this.lastLineDiv.removeChild(node));
                this.lastLineDiv.appendChild(firstDiv);
            }
        }

        // Step through all of the nodes in the overstrike group, building the bold map.
        const boldMap = [];
        for (const node of this.lastLineDiv.childNodes) {
            const divText = node.textContent;
            const limit = Math.min(divText.length, lineText.length);
            for (let x=0; x<limit; ++x) {
                if (divText[x] == lineText[x]) {
                    boldMap[x] = true;
                } else if (x >= boldMap.length) {
                    boldMap[x] = false;
                }
            }
        }

        // Now process the boldMap and format runs of matching characters as bold.
        const lineDiv = this.doc.createElement("div");
        const limit = Math.min(lineText.length, boldMap.length);
        let runStart = 0;
        let x = 0;
        while (x < limit) {
            // Process a non-bold run of text.
            runStart = x;
            while (x < limit && !boldMap[x]) {
                ++x;
            }

            if (x > runStart) {
                lineDiv.appendChild(this.doc.createTextNode(lineText.substring(runStart, x)));
            }

            // Process a bold run of text.
            runStart = x;
            while (x < limit && boldMap[x]) {
                ++x;
            }

            if (x > runStart) {
                const boldSpan = this.doc.createElement("b");
                boldSpan.appendChild(this.doc.createTextNode(lineText.substring(runStart, x)));
                lineDiv.appendChild(boldSpan);
            }
        }

        if (x < lineText.length) {
            lineDiv.appendChild(this.doc.createTextNode(lineText.substring(x)));
        }

        lineDiv.className = "overstrikeLine";
        this.lastLineDiv.appendChild(lineDiv);
    }

    /**************************************/
    appendLine(text) {
        /* Appends one line to the current greenbar group, this.barGroup.
        Also handles top-of-form and greenbar highlighting */

        let lineText = text + "\n";
        if (this.overstrike && this.lastLineDiv) {
            this.overstrikeBoldly(lineText);
            this.overstrike = false;
        } else {
            if (this.groupLinesLeft <= 0) {
                // Start the green half of a greenbar group
                this.barGroup = this.doc.createElement("div");
                this.paper.appendChild(this.barGroup);
                this.groupLinesLeft = this.lpi;
                this.barGroup.className = "printerPaper greenBar";
                if (this.atTopOfForm) {
                    this.atTopOfForm = false;
                    this.barGroup.classList.add("topOfForm");
                    if (this.formLength == 0) {
                        lineText = "\f" + lineText;
                    }
                }
            } else if (this.groupLinesLeft*2 == this.lpi) {
                // Start the white half of a greenbar group
                this.barGroup = this.doc.createElement("div");
                this.paper.appendChild(this.barGroup);
                this.barGroup.className = "printerPaper whiteBar";
            }

            const lineDiv = this.doc.createElement("div");
            if (this.atTopOfForm) {
                this.atTopOfForm = false;
                lineDiv.className = "topOfForm";
                if (this.formLength == 0) {
                    lineText = "\f" + lineText;
                }
            }

            lineDiv.appendChild(this.doc.createTextNode(lineText));
            this.barGroup.appendChild(lineDiv);
            this.lastLineDiv = lineDiv;
            --this.groupLinesLeft;
            --this.supplyRemaining;
            if (this.formLength) {
                this.updateEOPChannels();
                ++this.lineNr;
                if (this.lineNr >= this.formLength) {
                    this.atTopOfForm = true;
                    this.lineNr = 0;
                }
            }
        }
    }

    /**************************************/
    skipToChannel(skip, linesIncluded) {
        /* Handles the details of a skip-to-channel operation. If no form length
        is defined, we ignore the skip channel number and just space to the end
        of the current greenbar group. The first "linesIncluded" lines do not
        increase the carriage motion time */

        if (this.formLength == 0) {             // use simple carriage control
            const skipLines = this.groupLinesLeft;
            while (this.groupLinesLeft > 0) {
                this.appendLine("");
            }

            this.atTopOfForm = true;
            this.supplyRemaining -= skipLines;
            if (skipLines > linesIncluded) {
                this.printReadyDelay += LinePrinter.carriageExtraTime*(skipLines-linesIncluded);
            }
        } else {
            const channelMask = 1 << (skip-1);  // create channel bit mask
            let slewCount = this.formLength*2;  // runaway slew line counter
            do {
                this.appendLine("");
                if (linesIncluded > 0) {
                    --linesIncluded;
                } else {
                    this.printReadyDelay += LinePrinter.carriageExtraTime;
                }

                --slewCount;
                if (slewCount <= 0) {
                    this.setCarriageReady(false);       // runaway skip-to-channel slew
                    break;
                }
            } while (!(this.carriageTape[this.lineNr] & channelMask));

            this.updateEOPChannels();
        }
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
        if (this.suppressSpacing && this.carriageCode == 0) {
            this.overstrike = true;             // next line will be overstruck with this one
        } else {
            this.overstrike = false;            // next line will print after carriage control
            if (skip) {
                this.skipToChannel(skip, 2);
            } else {
                if (space > 2) {
                    this.printReadyDelay += LinePrinter.carriageExtraTime*(space-2);
                }

                while (space > 1) {
                    this.appendLine("");
                    --space;
                }
            }

            this.carriageCode = 0;
        }

        this.paper.scrollIntoView(false);       // keep last line in view
        if (this.supplyRemaining <= 0) {
            this.setCarriageReady(false);
            this.$$("EndOfFormLamp").classList.add("annunciatorLit");
        }
    }

    /**************************************/
    async initiateLinePrinter() {
        /* Initiates the printing of the line from the buffer */

        if (!this.carriageReady) {
            if (await this.waitForCarriage.request()) {
                return;                         // wait canceled
            }
        }

        this.setPrinterBusy(true);
        this.printReadyDelay = this.linePeriod; // minimum print time
        let [space, skip, before] = this.determineCarriageControl(this.carriageCode);

        // DEBUG ?? console.log("%i %i %2i %i  %s", this.suppressSpacing, space, skip, before, this.printBuffer);

        // Print the line image.
        this.printLine(this.printBuffer.substring(0, this.columns).trimEnd(), space, skip);
        this.printBuffer = "";                  // clear the internal print buffer
        this.paperMeter.value = this.supplyRemaining;
        if (this.printCheckPending) {
            this.setPrintCheck(true);           // leave buffer in ready state
        }

        // Wait for printing and carriage motion before resetting Printer Busy.
        setTimeout(() => {
            this.setPrinterBusy(false);         // buffer is now ready to receive more data
        }, this.printReadyDelay);
    }

    /**************************************/
    async dumpNumeric(code) {
        /* Writes one digit to the print buffer. This should be used directly by
        Dump Numerically (DN, 35). Returns 1 after the print buffer is full */
        const digit = code & Register.digitMask;
        let eob = 0;                    // end-of-block signal to Processor

        if (this.bufferBusy) {          // buffer not available to receive now
            if (await this.waitForBuffer.request()) {
                return 1;                       // wait canceled
            }
        }

        ++this.bufferOffset;
        if (this.bufferOffset <= this.columns && code >= 0) {
            const char = LinePrinter.dumpGlyphs[digit & Register.notParityMask];
            this.printBuffer += char;
            if (char == "~" || Envir.oddParity5[digit] != digit) {
                this.printCheckPending = true;
            }
        }

        if (this.bufferOffset >= LinePrinter.maxBufferSize) {
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

        if (this.bufferBusy) {          // buffer not available to receive now
            if (await this.waitForBuffer.request()) {
                return 1;                       // wait canceled
            }
        }

        ++this.bufferOffset;
        if (this.bufferOffset <= this.columns && code >= 0) {
            const char = LinePrinter.numericGlyphs[digit & Register.notParityMask];
            this.printBuffer += char;
            if (char == "~" || Envir.oddParity5[digit] != digit) {
                this.printCheckPending = true;
            }
        }

        if (this.bufferOffset >= LinePrinter.maxBufferSize) {
            await this.initiateLinePrinter();
            eob = 1;
        }

        return eob;
    }

    /**************************************/
    async writeAlpha(digitPair) {
        /* Writes one even/odd digit pair as a character to the print buffer.
        This should be used directly by Write Alphanumerically (WA, 39). A
        "code" less than zero implies a record mark has been detected by the
        processor and this call is just to fill out the buffer. Returns 1
        after the 80th digit pair is received */
        const even = (digitPair >> Register.digitBits) & Register.digitMask;
        const odd = digitPair & Register.digitMask;
        const code = (even & Register.bcdMask)*16 + (odd & Register.bcdMask);
        let eob = 0;                    // end-of-block signal to Processor

        if (this.bufferBusy) {          // buffer not available to receive now
            if (await this.waitForBuffer.request()) {
                return 1;                       // wait canceled
            }
        }

        ++this.bufferOffset;
        if (this.bufferOffset <= this.columns && digitPair >= 0) {
            const char = LinePrinter.alphaGlyphs[code];
            this.printBuffer += char;
            if (char == "~" || Envir.oddParity5[even] != even || Envir.oddParity5[odd] != odd) {
                this.printCheckPending = true;
            }
        }

        if (this.bufferOffset >= LinePrinter.maxBufferSize) {
            await this.initiateLinePrinter();
            eob = 1;
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

        /********** DEBUG ***********
        const p = this.processor;
        let addr = p.regOR2.binaryValue;
        let line = "";
        for (let x=0; x<240; x+=2) {
            const pair = p.MM[(addr+x) >> 1];           // div 2
            const even = (pair >> Register.digitBits) & Register.digitMask;
            const odd = pair & Register.digitMask;
            if (odd == Envir.numRecMark) {
                break;
            } else {
                const code = (even & Register.bcdMask)*16 + (odd & Register.bcdMask);
                line += LinePrinter.alphaGlyphs[code];
            }
        }
        console.log("%s %s  %s", ioVariant.toString(8).padStart(4, "0"),
                addr.toString().padStart(5, "0"), line);
        ***************************/
    }

    /**************************************/
    async control(ioVariant) {
        /* Performs control functions for the printer. "ioVariant" is the 2-digit
        contents of MBR in I-6 (the Q10/Q11 digits of the instruction. For
        immediate carriage control, executes it here asynchronously. For deferred
        carriage control, simply stores the code until the next time a write
        occurs with its Q11 1-bit set */

        if (this.bufferBusy) {          // buffer busy being printed
            if (await this.waitForBuffer.request()) {
                return;                 // wait canceled
            }
        }

        this.carriageCode =  ioVariant & Register.bcdValueMask;
        let [space, skip, before] = this.determineCarriageControl(this.carriageCode);

        // DEBUG ?? console.log("%i %i %2i %i  [Control %i]", this.suppressSpacing, space, skip, before, ioVariant);

        if (before) {                   // do immediate carriage control
            this.carriageCode = 0;      // reset the carriage control code
            this.setPrinterBusy(true);
            this.printReadyDelay = LinePrinter.carriageBaseTime;

            if (!this.carriageReady) {
                if (await this.waitForCarriage.request()) {
                    return;             // wait canceled
                }
            }

            if (skip) {
                this.skipToChannel(skip, 1);
            } else {
                if (space > 1) {
                    this.printReadyDelay += LinePrinter.carriageExtraTime*(space-1);
                }

                while (space > 0) {
                    this.appendLine("");
                    --space;
                }
            }

            this.overstrike = false;            // next line will always print normally
            this.paper.scrollIntoView(false);   // keep last line in view
            this.paperMeter.value = this.supplyRemaining;
            if (this.supplyRemaining <= 0) {
                this.setCarriageReady(false);
                this.$$("EndOfFormLamp").classList.add("annunciatorLit");
            }

            setTimeout(() => {
                this.setPrinterBusy(false);             // buffer is ready to receive more data
            }, this.printReadyDelay);
        }
    }

    /**************************************/
    manualRelease () {
        /* Called by Processor to indicate the device has been released manually */

        this.waitForBuffer.signal(true);
        this.waitForCarriage.signal(true);
        this.setPrinterBusy(false);
    }

    /**************************************/
    release () {
        /* Called by Processor to indicate the device has been released.
        Not used by LinePrinter */
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
        this.$$("EndOfFormLamp").removeEventListener("dblclick", this.boundEndOfFormClick);
        this.$$("CCLoadBtn").removeEventListener("click", this.boundLoadCarriageControl);

        this.config.putWindowGeometry(this.window, "LinePrinter");
        this.window.removeEventListener("beforeunload", this.beforeUnload);
        this.window.close();
    }

} // end class LinePrinter
