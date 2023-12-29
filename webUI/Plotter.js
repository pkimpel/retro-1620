/***********************************************************************
* retro-1620/webUI Plotter.js
************************************************************************
* Copyright (c) 2023, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* IBM 1620 Model 2 Emulator Plotter device.
*
* Defines the plotter device.
*
************************************************************************
* 2022-12-22  P.Kimpel
*   Original version, from retro-1620 Typewriter.js.
***********************************************************************/

export {Plotter};

import {Envir} from "../emulator/Envir.js";
import {Register} from "../emulator/Register.js";
import {Timer} from "../emulator/Timer.js";
import {openPopup} from "./PopupUtil.js";

class Plotter {

    // Static properties

    static stepPeriod = 1000/300;       // ms per step
    static penPeriod = 100;             // ms for pen up/down
    static minWait = 10;                // ms for minimum throttling dealy
    static windowHeight = 480;          // window innerHeight, pixels
    static windowWidth = 646;           // window innerWidth, pixels

    static canvasStepSize = 0.01;       // step size in inches
    static canvasWidth = 11;            // carriage width in inches
    static canvasHScale = -0.5;         // horizontal scale factor
    static canvasVScale = 0.5;          // vertical scale factor
    static canvasMaxHeight = 32764;     // max canvas unit height, Firefox, 2023
    static canvasHeight = Plotter.canvasMaxHeight*Plotter.canvasStepSize;  // inches, about 27 feet

    static numericGlyphs = [            // translate numeric codes to paper tape glyphs
        "0", "1", "2",  "3", "4", "5", "6", "7", "8", "9", "|", "<", "@",  "<", "<", "\\"];

    static alphaGlyphs = [      // indexed as (even digit BCD)*16 + (odd digit BCD)
            " ", "<", "<", ".", ")", "<", "<", "<",     // 00
            "<", "<", "|", "<", "<", "<", "<", "\\",    // 08
            "+", "<", "<", "$", "*", "<", "<", "<",     // 10
            "<", "<", "<", "<", "<", "<", "<", "<",     // 18
            "-", "/", "<", ",", "(", "<", "^", "<",     // 20
            "<", "<", "<", "<", "<", "<", "<", "<",     // 28
            "<", "<", "<", "=", "@", "<", "<", "<",     // 30
            "<", "<", "<", "<", "<", "<", "<", "<",     // 38
            "<", "A", "B", "C", "D", "E", "F", "G",     // 40
            "H", "I", "<", "<", "<", "<", "<", "<",     // 48
            "-", "J", "K", "L", "M", "N", "O", "P",     // 50
            "Q", "R", "<", "<", "<", "<", "<", "<",     // 58
            "<", "<", "S", "T", "U", "V", "W", "X",     // 60
            "Y", "Z", "<", "<", "<", "<", "<", "<",     // 68
            "0", "1", "2", "3", "4", "5", "6", "7",     // 70
            "8", "9", "<", "<", "<", "<", "<", "<",     // 78
            "<", "<", "<", "<", "<", "<", "<", "<",     // 80
            "<", "<", "<", "<", "<", "<", "<", "<",     // 88
            "<", "<", "<", "<", "<", "<", "<", "<",     // 90
            "<", "<", "<", "<", "<", "<", "<", "<",     // 98
            "<", "<", "<", "<", "<", "<", "<", "<",     // A0
            "<", "<", "<", "<", "<", "<", "<", "<",     // A8
            "<", "<", "<", "<", "<", "<", "<", "<",     // B0
            "<", "<", "<", "<", "<", "<", "<", "<",     // B8
            "<", "<", "<", "<", "<", "<", "<", "<",     // C0
            "<", "<", "<", "<", "<", "<", "<", "<",     // C8
            "<", "<", "<", "<", "<", "<", "<", "<",     // D0
            "<", "<", "<", "<", "<", "<", "<", "<",     // D8
            "<", "<", "<", "<", "<", "<", "<", "<",     // E0
            "<", "<", "<", "<", "<", "<", "<", "<",     // E8
            "<", "<", "<", "<", "<", "<", "<", "<",     // F0
            "<", "<", "<", "<", "<", "<", "<", "<"];    // F8

    static plotXlate = {        // 1620 paper tape code to plotter commands
        "0": {bits: 0b00100000, dx:  0, dy:  0, penUp: 0, penDown: 1},
        "1": {bits: 0b00000001, dx:  0, dy:  1, penUp: 0, penDown: 0},
        "2": {bits: 0b00000010, dx:  1, dy:  1, penUp: 0, penDown: 0},
        "3": {bits: 0b00010011, dx:  1, dy:  0, penUp: 0, penDown: 0},
        "4": {bits: 0b00000100, dx:  1, dy: -1, penUp: 0, penDown: 0},
        "5": {bits: 0b00010101, dx:  0, dy: -1, penUp: 0, penDown: 0},
        "6": {bits: 0b00010110, dx: -1, dy: -1, penUp: 0, penDown: 0},
        "7": {bits: 0b00000111, dx: -1, dy:  0, penUp: 0, penDown: 0},
        "8": {bits: 0b00001000, dx: -1, dy:  1, penUp: 0, penDown: 0},
        "9": {bits: 0b00011001, dx:  0, dy:  0, penUp: 1, penDown: 0},
        "A": {bits: 0b01100001, dx:  0, dy:  1, penUp: 0, penDown: 0},
        "B": {bits: 0b01100010, dx:  1, dy:  1, penUp: 0, penDown: 0},
        "C": {bits: 0b01110011, dx:  1, dy:  0, penUp: 0, penDown: 0},
        "D": {bits: 0b01100100, dx:  1, dy: -1, penUp: 0, penDown: 0},
        "E": {bits: 0b01110101, dx:  0, dy: -1, penUp: 0, penDown: 0},
        "F": {bits: 0b01110110, dx: -1, dy: -1, penUp: 0, penDown: 0},
        "G": {bits: 0b01100111, dx: -1, dy:  0, penUp: 0, penDown: 0},
        "H": {bits: 0b01101000, dx: -1, dy:  1, penUp: 0, penDown: 0},
        "I": {bits: 0b01111001, dx:  0, dy:  0, penUp: 0, penDown: 0},
        "]": {bits: 0b01000000, dx:  0, dy:  0, penUp: 0, penDown: 0},
        "J": {bits: 0b01010001, dx:  0, dy:  1, penUp: 0, penDown: 0},
        "K": {bits: 0b01010010, dx:  1, dy:  1, penUp: 0, penDown: 0},
        "L": {bits: 0b01000011, dx:  1, dy:  0, penUp: 0, penDown: 0},
        "M": {bits: 0b01010100, dx:  1, dy: -1, penUp: 0, penDown: 0},
        "N": {bits: 0b01000101, dx:  0, dy: -1, penUp: 0, penDown: 0},
        "O": {bits: 0b01000110, dx: -1, dy: -1, penUp: 0, penDown: 0},
        "P": {bits: 0b01010111, dx: -1, dy:  0, penUp: 0, penDown: 0},
        "Q": {bits: 0b01011000, dx: -1, dy:  1, penUp: 0, penDown: 0},
        "R": {bits: 0b01001001, dx:  0, dy:  0, penUp: 1, penDown: 0},
        "S": {bits: 0b00110010, dx:  1, dy:  1, penUp: 0, penDown: 0},
        "T": {bits: 0b00100011, dx:  1, dy:  0, penUp: 0, penDown: 0},
        "U": {bits: 0b00110100, dx:  1, dy: -1, penUp: 0, penDown: 0},
        "V": {bits: 0b00100101, dx:  0, dy: -1, penUp: 0, penDown: 0},
        "W": {bits: 0b00100110, dx: -1, dy: -1, penUp: 0, penDown: 0},
        "X": {bits: 0b00110111, dx: -1, dy:  0, penUp: 0, penDown: 0},
        "Y": {bits: 0b00111000, dx: -1, dy:  1, penUp: 0, penDown: 0},
        "Z": {bits: 0b00101001, dx:  0, dy:  0, penUp: 0, penDown: 0},
        ".": {bits: 0b01101011, dx:  1, dy:  0, penUp: 0, penDown: 0},
        ")": {bits: 0b01111100, dx:  0, dy:  0, penUp: 0, penDown: 1},
        "*": {bits: 0b01001100, dx:  0, dy:  0, penUp: 0, penDown: 0},
        "$": {bits: 0b01011011, dx:  1, dy:  0, penUp: 0, penDown: 0},
        "(": {bits: 0b00101100, dx:  0, dy:  0, penUp: 0, penDown: 1},
        ",": {bits: 0b00111011, dx:  1, dy:  0, penUp: 0, penDown: 0},
        "|": {bits: 0b00101010, dx:  0, dy:  1, penUp: 0, penDown: 0},
        "!": {bits: 0b01001010, dx:  0, dy:  1, penUp: 0, penDown: 0},
        "=": {bits: 0b00001011, dx:  1, dy:  0, penUp: 0, penDown: 0},
        "@": {bits: 0b00011100, dx:  0, dy:  0, penUp: 0, penDown: 0},
        "+": {bits: 0b01110000, dx:  0, dy:  0, penUp: 0, penDown: 1},
        "-": {bits: 0b01000000, dx:  0, dy:  0, penUp: 0, penDown: 0},
        " ": {bits: 0b00010000, dx:  0, dy:  0, penUp: 0, penDown: 0},
        "/": {bits: 0b00110001, dx:  0, dy:  1, penUp: 0, penDown: 0},
        "^": {bits: 0b00111110, dx: -1, dy:  0, penUp: 0, penDown: 0},
        "\\":{bits: 0b00101111, dx: -1, dy:  0, penUp: 0, penDown: 0},
        "\"":{bits: 0b01001111, dx: -1, dy:  0, penUp: 0, penDown: 0},
        "<": {bits: 0b10000000, dx:  0, dy:  0, penUp: 0, penDown: 0}   // EOL
    };


    // Public Instance Properties

    doc = null;                         // window document object
    innerHeight = 0;                    // window specified innerHeight
    paper = null;                       // the output canvas
    paperDoc = null;                    // window paper-area
    platen = null;                      // the scrolling area
    window = null;                      // window object

    movingFast = false;                 // true if doing manual fast move
    penDown = false;                    // pen up=0, down=1
    outputReadyStamp = 0;               // timestamp when ready for next point
    pixelHOrigin = 0;                   // horizontal pixel origin
    pixelVOrigin = 0;                   // vertical pixel origin
    timer = new Timer();                // delay management timer
    x = 0;                              // vertical offset (to down on the canvas)
    y = 0;                              // horizontal offset (to left on the canvas)


    constructor(context) {
        /* Initializes and wires up events for the plotter device.
        "context" is an object passing other objects and callback functions from
        the global script:
            config is the SystemConfig object
            processor is the Processor object
        */

        this.context = context;
        this.config = context.config;
        this.processor = context.processor;

        this.boundControlClick = this.controlClick.bind(this);
        this.boundControlMouseDown = this.controlMouseDown.bind(this);
        this.boundControlMouseUp = this.controlMouseUp.bind(this);

        // Create the Plotter window
        let geometry = this.config.formatWindowGeometry("Plotter");
        if (geometry.length) {
            this.innerHeight = this.config.getWindowProperty("Plotter", "innerHeight");
        } else {
            this.innerHeight = Plotter.windowHeight;
            geometry = `,left=${(screen.availWidth-Plotter.windowWidth)/2}` +
                       `,top=${screen.availHeight-Plotter.windowHeight}` +
                       `,width=${Plotter.windowWidth},height=${Plotter.windowHeight}`;
        }

        openPopup(window, "../webUI/Plotter.html", "retro-1620.Plotter",
                "location=no,scrollbars,resizable" + geometry,
                this, this.plotterOnLoad);
    }

    /**************************************/
    $$(id) {
        /* Returns a DOM element from its id property. Must not be called until
        plotterOnLoad is called */

        return this.doc.getElementById(id);
    }

    /**************************************/
    plotterOnLoad(ev) {
        /* Initializes the Plotter window and user interface */
        const prefs = this.config.getNode("Plotter");

        this.doc = ev.target;           // now we can use this.$$()
        this.window = this.doc.defaultView;
        this.doc.title = "retro-1620 Plotter";
        this.hCursor = this.$$("HCursor");
        this.vCursor = this.$$("VCursor");
        this.hCoord = this.$$("HCoordSpan");
        this.vCoord = this.$$("VCoordSpan");
        this.penStat = this.$$("PenStatusSpan");
        this.frame = this.$$("PlotterFrame");
        this.frameWin = this.frame.contentWindow;
        this.frameDoc = this.frame.contentDocument;
        this.canvas = this.frameDoc.getElementById("PlotterCanvas");
        this.dc = this.canvas.getContext("2d");

        this.canvasPixelHeight = Math.round(Math.abs(Plotter.canvasMaxHeight*Plotter.canvasVScale));
        this.canvasPixelWidth = Math.round(Math.abs(Plotter.canvasWidth/Plotter.canvasStepSize*Plotter.canvasHScale));
        this.canvasUnitHeight = Math.round(Plotter.canvasHeight/Plotter.canvasStepSize);
        this.canvasUnitWidth = Math.round(Plotter.canvasWidth/Plotter.canvasStepSize);
        this.canvasLineWidth = 1;       // was Math.abs(1/Plotter.canvasHScale);

        const plotView = this.frameDoc.getElementById("FrameBody");
        this.canvasHOffset = this.canvasPixelWidth - 0.5;
        this.canvasVOffset = Math.round(plotView.offsetHeight/2) + 0.5;

        [this.pixelHOrigin, this.pixelVOrigin] = this.toPixelCoord(0, 0);
        this.canvas.height = Math.abs(this.canvasUnitHeight*Plotter.canvasVScale);
        this.canvas.width = Math.abs(this.canvasUnitWidth*Plotter.canvasHScale);

        // Do translation before scaling!
        this.dc.translate(this.canvasHOffset, this.canvasVOffset);
        this.dc.scale(Plotter.canvasHScale, Plotter.canvasVScale);
        this.dc.fillStyle = "black";

        this.setCanvasEmpty();

        // Events
        this.window.addEventListener("beforeunload", this.beforeUnload);
        this.$$("ControlsDiv").addEventListener("click", this.boundControlClick);
        this.$$("ControlsDiv").addEventListener("mousedown", this.boundControlMouseDown);
        this.$$("ControlsDiv").addEventListener("mouseup", this.boundControlMouseUp);

        // Resize the window to take into account the difference between
        // inner and outer heights (WebKit quirk).
        if (this.window.innerHeight < this.innerHeight) {        // Safari bug
            this.window.resizeBy(0, this.innerHeight - this.window.innerHeight);
        }
    }

    /**************************************/
    clear() {
        /* Initializes the plotter unit state */

        this.busy = false;              // an I/O is in progress
        this.x = 0;
        this.y = 0;
        this.positionCursor(0, 0);
        this.outputReadyStamp = 0;      // timestamp when ready for output
    }

    /**************************************/
    cancel() {
        /* Cancels the I/O currently in process. This routine does nothing
        useful. It exists only to satisfy the Processor's I/O cancelation
        interface */

        this.busy = false;
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
    controlClick(ev) {
        /* Handles click events for the controls pane */

        switch (ev.target.id) {
        case "StepLeftBtn":
            this.move(1, 0);
            break;
        case "StepRightBtn":
            this.move(-1, 0);
            break;
        case "StepUpBtn":
            this.move(0, 1);
            break;
        case "StepDownBtn":
            this.move(0, -1);
            break;
        case "PenUpBtn":
            this.setPenUp();
            break;
        case "PenDownBtn":
            this.setPenDown();
            break;
        case "PrintBtn":
            this.printBtnClick(ev);
            break;
        case "HomeBtn":
            this.x = this.y = 0;
            this.positionCursor(0, 0);
            break;
        case "ClearBtn":
            if (this.window.confirm("Are you sure you want to erase the plot area?")) {
                this.setCanvasEmpty();
            }
            break;
        }
    }

    /**************************************/
    controlMouseDown(ev) {
        /* Handles mousedown events for the controls pane */

        switch (ev.target.id) {
        case "FastLeftBtn":
            this.moveFast(1, 0);
            break;
        case "FastRightBtn":
            this.moveFast(-1, 0);
            break;
        case "FastUpBtn":
            this.moveFast(0, 1);
            break;
        case "FastDownBtn":
            this.moveFast(0, -1);
            break;
        }
    }
    /**************************************/
    controlMouseUp(ev) {
        /* Handles mouseup events for the controls pane */

        switch (ev.target.id) {
        case "FastLeftBtn":
        case "FastRightBtn":
        case "FastUpBtn":
        case "FastDownBtn":
            this.movingFast = false;
            break;
        }
    }

    /**************************************/
    printBtnClick(ev) {
        /* Handler for clicking the Selectric logo and printing the paper area */

        this.frame.contentWindow.print();
    }


    /*******************************************************************
    *  Plotter Output                                                  *
    *******************************************************************/

    /**************************************/
    toUnitCoord(x, y) {
        /* Converts canvas (pixel) coordinates to transformed unit coordinates */

        return [(x-this.canvasHOffset)/Plotter.canvasHScale,
                (y-this.canvasVOffset)/Plotter.canvasVScale];
    }

    /**************************************/
    toPixelCoord(x, y) {
        /* Converts transformed canvas unit coordinates into canvas (pixel)
        coordinates */

        return [Math.floor(x*Plotter.canvasHScale + this.canvasHOffset),
                Math.floor(y*Plotter.canvasVScale + this.canvasVOffset)];
    }

    /**************************************/
    setCanvasEmpty() {
        /* Erases the plotter canvas and initializes it for new output */

        this.clear();
        this.setPenUp();
        this.dc.clearRect(-1, -1, this.canvasUnitWidth+1, this.canvasUnitHeight+1);
    }

    /**************************************/
    positionCursor(x, y) {
        /* Positions the cursor crosshairs to the specified coordinates */
        const [px,py] = this.toPixelCoord(x, y);

        this.hCoord.textContent = y;
        this.vCoord.textContent = x;
        this.hCursor.style.left = `${px}px`;
        this.frameWin.scrollTo(0, py-this.pixelVOrigin);
    }

    /**************************************/
    async setPenUp() {
        /* Sets the pen in the up position */

        this.penDown = false;
        this.penStat.textContent = "UP";
        this.outputReadyStamp += Plotter.penPeriod;
}

    /**************************************/
    async setPenDown() {
        /* Sets the pen in the down position */

        this.penDown = true;
        this.penStat.textContent = "DOWN";
        this.outputReadyStamp += Plotter.penPeriod;
}

    /**************************************/
    async move(dx, dy) {
        /* Moves the plot in the indicated direction(s). If the pen is down,
        plots a point at the new location. Delays to the actual speed of the
        plotter as needed */
        const now = performance.now();
        const delay = this.outputReadyStamp - now;

        if (delay < 0) {
            this.outputReadyStamp = now + Plotter.stepPeriod;
        } else if (delay < Plotter.minWait) {
            this.outputReadyStamp += Plotter.stepPeriod;
        } else {
            await this.timer.delayFor(delay);
            this.outputReadyStamp = now + Plotter.stepPeriod;
        }

        let x = this.x + dx;
        if (x < 0) {
            x = 0;
        } else if (x >= this.canvasUnitWidth) {
            x = this.canvasUnitWidth-1;
        }

        let y = this.y + dy;
        if (y < 0) {
            y = 0;
        } else if (y >= this.canvasUnitHeight) {
            y = this.canvasUnitHeight-1;
        }

        this.x = x;
        this.y = y;
        this.positionCursor(x, y);
        if (this.penDown) {
            this.dc.fillRect(x, y, this.canvasLineWidth, this.canvasLineWidth);
        }
    }

    /**************************************/
    async moveFast(dx, dy) {
        /* Initiates and control manual fast moving of the cursor */

        this.movingFast = true;
        do {
            await this.move(dx, dy);
        } while (this.movingFast);
    }

    /**************************************/
    plotChar(char) {
        /* Decodes one paper tape character code into the appropriate plotting
        command. Returns a Promise that resolves once any pending delay has
        taken place */
        const command = Plotter.plotXlate[char];

        //console.log("Plotter: '%s' %5i %5i %i", char, this.x, this.y, this.penDown);

        if (!command) {
            return this.move(0, 0);     // no action
        } else if (command.penUp) {
            return this.setPenUp();
        } else if (command.penDown) {
            return this.setPenDown();
        } else {
            return this.move(-command.dy, command.dx);
        }

    }

    /**************************************/
    dumpNumeric(code) {
        /* Writes one digit to the plotter. This should be used directly by
        Dump Numerically. Returns a Promise for completion */
        const digit = code & Register.digitMask;

        return this.plotChar(Plotter.numericGlyphs[digit & Register.bcdMask]);
    }

    /**************************************/
    writeAlpha(digitPair) {
        /* Writes one even/odd digit pair to the typewriter. This should be used
        directly by Write Alphanumerically. Returns a Promise for completion */
        const even = (digitPair >> Register.digitBits) & Register.digitMask;
        const odd = digitPair & Register.digitMask;
        const code = (even & Register.bcdMask)*16 + (odd & Register.bcdMask);

        return this.plotChar(Plotter.alphaGlyphs[code]);
    }

    /**************************************/
    writeNumeric(digit) {
        /* Writes one digit to the typewriter, suppressing some undigit codes.
        This should be used directly by Write Numerically. Returns a Promise
        for completion */

        return this.dumpNumeric(digit);
    }

    /**************************************/
    initiateWrite() {
        /* Called by Processor to prepare the device for output */

        this.busy = true;
    }

    /**************************************/
    release() {
        /* Called by Processor to indicate the device has been released */

        this.busy = false;
    }

    /**************************************/
    manualRelease() {
        /* Called by Processor to indicate the device has been released manually */

        this.busy = false;              // no I/O is in progress
    }

    /**************************************/
    shutDown() {
        /* Shuts down the device. If the window open failed and onLoad didn't
        run, do nothing because this.window, etc., didn't get initialized */

        if (this.window) {
            this.$$("ControlsDiv").removeEventListener("click", this.boundControlClick);
            this.$$("ControlsDiv").removeEventListener("mousedown", this.boundControlMouseDown);
            this.$$("ControlsDiv").removeEventListener("mouseup", this.boundControlMouseUp);

            this.config.putWindowGeometry(this.window, "Plotter");
            this.window.removeEventListener("beforeunload", this.beforeUnload);
            this.window.close();
        }
    }
} // class Plotter
