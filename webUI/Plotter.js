/***********************************************************************
* retro-1620/webUI Plotter.js
************************************************************************
* Copyright (c) 2023, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* IBM 1620 Model 2 Emulator 1627 Plotter device.
*
* Defines the plotter device. The device uses a <canvas> element for its
* drawing surface. The canvas coordinate system has the X-axis along the
* horizontal dimension and the Y-axis along the vertical dimension, with
* coordinate values increasing from left to right and top to bottom.
*
* The 1627 (a rebranded CALCOMP 565) did not have a coordinate system.
* It simply moved in 0.01-inch increments one step at a time in one of
* eight directions, left/right, up/down, and along the two diagnonals.
* See the 1627 Plotter Manual for a description of the commands:
* https://bitsavers.org/pdf/ibm/1130/A26-5710-0_1627_Plotter.pdf.
*
* The plotter worked by moving its pen horizontally along a carriage.
* The paper underneath the pen was moved up and down by a rotating, pin-
* feed drum. The paper unspooled from a roll at the back of the device,
* across the top, down under the pen, and out the bottom of the device,
* where it was either wound on a take-up roll or allowed to fall loose
* below the plotter. Thus, the area being plotted moved upward as the
* paper moved downward.
*
* That orientation is the opposite from the way that most GUI windows
* scroll, so in this emulation, the plotter is effectively turned upside
* down, as if the supply spool was on the bottom and the take-up spool
* on the top. As the plot advances, the image moves downward and the
* plotting area moves upward. Note that the usual convention with the
* 1627 was that the X-axis was considered to be vertical (along the
* length of the paper) and the Y-axis was horizontal across the front
* of the plotter.
*
* Therefore, in this emulation, X-axis coordinates increase as the plot
* moves down the plotter's window, and Y-axis coordinates increase as
* the pen moves to the right. The (0,0) coordinate is at the mid-right
* of the plotting area. All of this will make much better sense if you
* watch the emulated plotter while standing on your head.
*
* Different browsers support different maximum sizes of the <canvas>
* element. As of late 2023, desktop versions of the following browsers
* support maximum coordinate values of: Firefox 32767, Chrome and Edge
* 65535, Apple Safari 4,194,303 in width and 8,388,607 in height.
* There are further restrictions on the total area of a canvas.
* See https://github.com/jhildenbiddle/canvas-size#test-results.
*
* This implementation currently uses a maximum width of 1100 and the
* maximum height given by the Plotter.canvasMaxHeight static property.
* 1100 corresponds to the 1627's 11-inch carriage and the max height
* was chosen to allow for adequate performance.
*
* The system configuration has an option to scale the plotting area at
* 100% (one pixel per emulated plotter step) or 50% (one pixel for every
* two emulated steps). The 50% setting is recommended for general use.
*
* See the wiki on the device for more information:
* https://github.com/pkimpel/retro-1620/wiki/UsingThePlotter.
*
************************************************************************
* 2022-12-22  P.Kimpel
*   Original version, from retro-1620 Typewriter.js.
***********************************************************************/

export {Plotter};

import {Register} from "../emulator/Register.js";
import {Timer} from "../emulator/Timer.js";
import {openPopup} from "./PopupUtil.js";

class Plotter {

    // Static properties

    static fpsAlpha = 0.001;            // alpha for fps moving exponential average
    static frameExtraWidth = 20;        // plot/print non-frame width, pixels
    static minWait = 4;                 // ms for minimum throttling delay
    static penPeriod = 100;             // ms for pen up/down
    static stepPeriod = 1000/300;       // ms per step
    static windowHeight = 488;          // window height, pixels
    static windowExtraWidth = 96;       // window non-canvas width, pixels:
                                        // ControlDiv=68, scrollbar=20, margin=4+4

    static canvasStepSize = 0.01;       // plotter step size, inches
    static canvasMaxHeight = 32767;     // max canvas step height, about 27.3 feet
    static canvasMaxWidth = 1100;       // max canvas step width, 11 inches
    static vCursorTopFactor = 0.50;     // top scrolling boundary offset factor
    static vCursorBottomFactor = 0.50;  // bottom scrolling boundary offset factor

    static numericGlyphs = [            // translate numeric codes to paper-tape glyphs
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

    static plotXlate = {        // 1620 paper-tape code to plotter commands
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
        "|": {bits: 0b00101010, dx:  0, dy:  1, penUp: 0, penDown: 0},  // Record Mark
        "!": {bits: 0b01001010, dx:  0, dy:  1, penUp: 0, penDown: 0},  // Group Mark
        "=": {bits: 0b00001011, dx:  1, dy:  0, penUp: 0, penDown: 0},
        "@": {bits: 0b00011100, dx:  0, dy:  0, penUp: 0, penDown: 0},
        "+": {bits: 0b01110000, dx:  0, dy:  0, penUp: 0, penDown: 1},
        "-": {bits: 0b01000000, dx:  0, dy:  0, penUp: 0, penDown: 0},
        " ": {bits: 0b00010000, dx:  0, dy:  0, penUp: 0, penDown: 0},
        "/": {bits: 0b00110001, dx:  0, dy:  1, penUp: 0, penDown: 0},
        "^": {bits: 0b00111110, dx: -1, dy:  0, penUp: 0, penDown: 0},  // "special" char
        "\\":{bits: 0b00101111, dx: -1, dy:  0, penUp: 0, penDown: 0},  // flagged Record Mark
        "\"":{bits: 0b01001111, dx: -1, dy:  0, penUp: 0, penDown: 0},  // flagged Group Mark
        "<": {bits: 0b10000000, dx:  0, dy:  0, penUp: 0, penDown: 0}   // EOL
    };


    // Public Instance Properties (more in contructor and plotterOnLoad method)

    doc = null;                         // window document object
    window = null;                      // window object

    busy = false;                       // I/O in progress (not really used)
    canvasHOffset = 0;                  // canvas coordinate horizontal offset
    canvasLineWidth = 1;                // width of dots drawn by plotter steps, canvas units
    canvasScaleHeight = 0;              // current canvas height, pixels
    canvasScaleWidth = 0;               // current canvas width, pixels
    canvasVOffset = 0;                  // canvas coordinate vertical offset
    fps = 60.0;                         // moving exponential average frames/sec
    frameLastStamp = 0;                 // last animation frame timestamp
    movingFast = false;                 // true if doing manual fast move
    outputReadyStamp = 0;               // timestamp when ready for next step
    penDown = false;                    // pen up=false, down=true
    pxLast = 0;                         // last horizontal pixel offset
    pyLast = 0;                         // last vertical pixel offset
    stepCache = new Array(20);          // cache of steps to be drawn at next frame time as x,y pairs
    stepCacheToken = 0;                 // cancellation token for requestAnimationFrame
    stepCacheTop = 0;                   // current length of this.stepCache
    stepXLast = 0;                      // last cached X pixel coord
    stepXMax = 0;                       // highest X pixel coord in this frame time
    stepXMin = Plotter.canvasMaxWidth;  // lowest X pixel coord in this frame time
    stepYLast = 0;                      // last cached Y pixel coord
    stepYMax = 0;                       // highest Y pixel coord in this frame time
    stepYMin = Plotter.canvasMaxHeight; // lowest Y pixel coord in this frame time
    timer = new Timer();                // delay management timer
    vCursorBottom = 0;                  // current bottom cursor scrolling boundary offset, pixels
    vCursorOffset = 0;                  // current offset of the vertical-coordinate cursor line, pixels
    vCursorTop = 0;                     // current top cursor scrolling boundary offset, pixels
    x = 0;                              // vertical offset (to down on the canvas)
    xMax = 0;                           // maximum vertical offset attained
    xMin = 0;                           // minimum vertical offset attained
    y = 0;                              // horizontal offset (to left on the canvas)
    yMax = 0;                           // maximum horizontal offset attained
    yMin = 0;                           // minimum horizontal offset attained


    constructor(context) {
        /* Initializes and wires up events for the plotter device.
        "context" is an object passing other objects and callback functions from
        the global script:
            config is the SystemConfig object
            processor is the Processor object
        Additional properties are created in the plotterOnLoad method */

        this.context = context;
        this.config = context.config;
        this.processor = context.processor;

        this.boundControlClick = this.controlClick.bind(this);
        this.boundControlMouseDown = this.controlMouseDown.bind(this);
        this.boundControlMouseUp = this.controlMouseUp.bind(this);
        this.boundDrawSteps = this.drawSteps.bind(this);
        this.boundResizeWindow = this.resizeWindow.bind(this);

        this.canvasScaleFactor = (this.config.getNode("Plotter.scale") == 2 ? 1.0 : 0.5);
        this.innerHeight = Plotter.windowHeight;
        this.innerWidth = Plotter.windowExtraWidth +
                Math.round(Plotter.canvasMaxWidth*this.canvasScaleFactor);

        // Create the Plotter window
        let geometry = this.config.formatWindowGeometry("Plotter");
        if (geometry.length) {
            this.innerHeight = this.config.getWindowProperty("Plotter", "innerHeight");
            this.innerWidth = this.config.getWindowProperty("Plotter", "innerWidth");
        } else {
            geometry = `,left=${(screen.availWidth-this.innerWidth)/2}` +
                       `,top=${screen.availHeight-Plotter.windowHeight}` +
                       `,width=${this.innerWidth},height=${Plotter.windowHeight}`;
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
        /* Initializes the Plotter window and user interface. Creates many
        additional global properties */
        const prefs = this.config.getNode("Plotter");

        this.doc = ev.target;           // now we can use this.$$()
        this.doc.title = "retro-1620 Plotter";
        this.window = this.doc.defaultView;
        this.hCursor = this.$$("HCursor");
        this.vCursor = this.$$("VCursor");
        this.hCoord = this.$$("HCoordSpan");
        this.vCoord = this.$$("VCoordSpan");
        this.penStat = this.$$("PenStatusSpan");

        this.frame = this.$$("PlotterFrame");
        this.frameWin = this.frame.contentWindow;
        this.frameDoc = this.frame.contentDocument;
        this.frameBody = this.frameDoc.getElementById("FrameBody");
        this.canvasDiv = this.frameDoc.getElementById("CanvasDiv");
        this.canvas = this.frameDoc.getElementById("PlotterCanvas");
        this.dc = this.canvas.getContext("2d", {alpha: false, willReadFrequently: false});

        this.drawCanvas = new OffscreenCanvas(20, 20);  // offscreen drawing canvas
        this.drawDC = this.drawCanvas.getContext("2d", {alpha: false});

        this.printingFrame = this.$$("PrintingFrame");
        this.printingFrameDoc = this.printingFrame.contentDocument;
        this.printingBody = this.printingFrameDoc.getElementById("FrameBody");
        this.printingCanvasDiv = this.printingFrameDoc.getElementById("CanvasDiv");
        this.printingCanvas = this.printingFrameDoc.getElementById("PlotterCanvas");

        this.calculateScaling();
        this.calculateCanvasOffsets();

        this.canvas.height = Plotter.canvasMaxHeight;
        this.canvas.width = Plotter.canvasMaxWidth;
        this.emptyCanvas();
        this.changeColor("black");      // the default

        // Events
        this.window.addEventListener("beforeunload", this.beforeUnload);
        this.window.addEventListener("resize", this.boundResizeWindow);
        this.$$("ControlsDiv").addEventListener("click", this.boundControlClick);
        this.$$("ControlsDiv").addEventListener("mousedown", this.boundControlMouseDown);
        this.$$("ControlsDiv").addEventListener("mouseup", this.boundControlMouseUp);

        // Resize the window to take into account the difference between inner
        // and outer heights (WebKit quirk). Also force the width to match the
        // initial scale factor.
        this.window.resizeBy(
                Plotter.canvasMaxWidth/Math.round(1/this.canvasScaleFactor) -
                        this.canvasDiv.offsetWidth,
                this.innerHeight - this.window.innerHeight);
    }

    /**************************************/
    clear() {
        /* Initializes the plotter unit state */

        this.busy = false;              // an I/O is in progress
        this.xMax = this.yMax = 0;
        this.xMin = Plotter.canvasMaxHeight;
        this.yMin = Plotter.canvasMaxWidth;
        this.homeCursor();
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
        /* Handles the beforeunload event to warn the user that closing the
        window is not a good idea */
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
            this.raisePen();
            break;
        case "PenDownBtn":
            this.lowerPen();
            break;
        case "PrintBtn":
            this.printCanvas(ev);
            break;
        case "SaveBtn":
            this.saveCanvas(ev);
            break;
        case "HomeBtn":
            this.homeCursor();
            break;
        case "ClearBtn":
            if (this.window.confirm("Are you sure you want to erase the plot area?")) {
                this.emptyCanvas();
            }
            break;
        case "BlackBtn":
            this.changeColor("black");
            break;
        case "RedBtn":
            this.changeColor("red");
            break;
        case "GreenBtn":
            this.changeColor("green");
            break;
        case "BlueBtn":
            this.changeColor("blue");
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
    calculateScaling() {
        /* Calculates the canvas scaling and scrolling factors initially and
        whenever the window is resized */

        this.canvasScaleHeight = this.frameBody.offsetHeight;
        this.canvasScaleWidth = this.canvasDiv.offsetWidth;
        this.canvasScaleFactor = this.canvasScaleWidth/Plotter.canvasMaxWidth;
        this.$$("ScaleFactor").textContent = this.canvasScaleFactor.toFixed(3);

        this.vCursorTop = Math.round(this.canvasScaleHeight*Plotter.vCursorTopFactor);
        this.vCursorBottom = Math.round(this.canvasScaleHeight*Plotter.vCursorBottomFactor);
    }

    /**************************************/
    calculateCanvasOffsets() {
        /* Calculates the coordinate and vertical-cursor offsets */

        this.vCursorOffset = Math.round(this.canvasScaleHeight/2);
        this.canvasHOffset = Plotter.canvasMaxWidth-1;          // pixels are drawn to the right of the coord
        this.canvasVOffset = Math.round(this.vCursorOffset/this.canvasScaleFactor);
    }

    /**************************************/
    resizeWindow(ev) {
        /* Reconfigures the scaling vertical cursor position when the window
        is resized */

        this.calculateScaling();
        const lastOffset = Math.round(this.pyLast*this.canvasScaleFactor);
        const newOffset = Math.round(this.canvasScaleHeight/2);
        if (lastOffset >= newOffset) {
            this.vCursorOffset = newOffset;
            this.frameWin.scrollTo(0, Math.round(lastOffset - newOffset));
        } else {
            this.vCursorOffset = lastOffset;
            this.frameWin.scrollTo(0, 0);
        }

        //console.debug("Plotter resize (%5d, %5d) %f vCursor @ %d",
        //        this.canvasScaleWidth, this.canvasScaleHeight, this.canvasScaleFactor, this.vCursorOffset);

        this.vCursor.style.top = `${this.vCursorOffset}px`;
        this.hCursor.style.left = `${Math.round(this.pxLast*this.canvasScaleFactor)}px`;
    }

    /**************************************/
    printCanvas(ev) {
        /* Handler for clicking the Print button and printing the plotting area.
        Clones the visible canvas and inserts it into the (hidden) <iframe>
        behind the visible <iframe>, then initiates the print dialog for that
        (hidden) <iframe> */

        if (this.printingCanvas) {      // remove any old canvas from its frame
            this.printingCanvasDiv.removeChild(this.printingCanvas);
        }

        this.printingCanvas = this.cloneCanvas(0);
        this.printingCanvas.id = "PlotterCanvas";
        this.printingCanvasDiv.appendChild(this.printingCanvas);
        this.printingCanvas.left = (Plotter.canvasMaxWidth - this.printingCanvas.width)/2;
        this.printingFrame.contentWindow.print();
    }

    /**************************************/
    saveCanvas(ev) {
        /* Handler for clicking the Save button and conventing the canvas to
        a PNG image */
        const canvas = this.cloneCanvas(1);
        const data = canvas.toDataURL("image/png");
        const hiddenLink = this.doc.createElement('a');

        hiddenLink.setAttribute('download', 'PlotterImage.png');
        hiddenLink.setAttribute('href', data);
        hiddenLink.click();
    }


    /*******************************************************************
    *  Plotter Output                                                  *
    *******************************************************************/

    /**************************************/
    toUnitCoord(x, y) {
        /* Converts pixel (screen) coordinates to transformed unit coordinates */

        return [this.canvasHOffset-x, y-this.canvasVOffset];
    }

    /**************************************/
    toPixelCoord(x, y) {
        /* Converts canvas internal coordinates into pixel (screen)
        coordinates */

        return [this.canvasHOffset-x, y+this.canvasVOffset];
    }

    /**************************************/
    homeCursor() {
        /* Homes the cursor and resets the related properties */

        this.x = this.y = 0;
        this.pxLast = Plotter.canvasMaxWidth-1;
        this.pyLast = Math.round(this.vCursorOffset/this.canvasScaleFactor);
        this.vCursor.style.top = `${this.vCursorOffset}px`;
        this.frameWin.scrollTo(0, 0)
        const [px, py] = this.toPixelCoord(this.x, this.y);
        this.positionCursor(px, py);
    }

    /**************************************/
    emptyCanvas() {
        /* Erases the plotter canvas, initializes it for new output, and resets
        the vertical origin to the middle of the plotting area */

        this.calculateCanvasOffsets();
        this.clear();                   // calls this.homeCursor()
        this.raisePen();
        if (this.printingCanvas) {      // remove any print canvas from its frame
            this.printingCanvasDiv.removeChild(this.printingCanvas);
            this.printingCanvas = null;
        }

        const saveStyle = this.dc.fillStyle;
        this.dc.fillStyle = "white";
        this.dc.fillRect(0, 0, Plotter.canvasMaxWidth+1, Plotter.canvasMaxHeight+1);
        this.dc.fillStyle = saveStyle;
    }

    /**************************************/
    changeColor(color) {
        /* Changes the pen color */
        const lamps = this.$$("PaletteDiv").querySelectorAll(".paletteLamp");

        for (const lamp of lamps) {     // reset all of the color-selection lamps
            lamp.style.display = "none";
        }

        // Set the pen color and the corresponding lamp.
        this.dc.fillStyle = color;
        switch (color) {
        case "black":
            this.$$("BlackLamp").style.display = "block";
            break;
        case "red":
            this.$$("RedLamp").style.display = "block";
            break;
        case "green":
            this.$$("GreenLamp").style.display = "block";
            break;
        case "blue":
            this.$$("BlueLamp").style.display = "block";
            break;
        }
    }

    /**************************************/
    cloneCanvas(margin) {
        /* Copies that part of the visible canvas from (0,0) to (xMax,yMax) and
        returns that portion as a new canvas object. "margin" specifies the
        number of margin pixels to be added around the original canvas */
        const margin2 = margin*2;
        const [pxMin, pyMin] = this.toPixelCoord(this.xMin, this.yMin);
        const [pxMax, pyMax] = this.toPixelCoord(this.xMax, this.yMax);
        const width = pxMin-pxMax+2;
        const height = pyMax-pyMin+2;
        const iData = this.dc.getImageData(pxMax, pyMin, width, height);

        const newCanvas = this.doc.createElement("canvas");
        newCanvas.width = width+margin2;
        newCanvas.height = height+margin2;
        const newDC = newCanvas.getContext("2d");
        newDC.fillStyle = "white";
        newDC.clearRect(0, 0, width+margin2, height+margin2);
        newDC.putImageData(iData, margin, margin);
        return newCanvas;
    }

    /**************************************/
    positionCursor(px, py) {
        /* Positions the cursor crosshairs to the specified pixel coordinates.
        If the current point is between the upper and lower scrolling boundaries,
        or the window is already scrolled to the top, moves the vCursor line,
        otherwise scrolls the window */

        this.hCoord.textContent = this.y;
        this.vCoord.textContent = this.x;
        if (this.pxLast != px) {
            this.hCursor.style.left = `${Math.round(px*this.canvasScaleFactor)}px`;
            this.pxLast = px;
        }

        const delta = Math.round((py - this.pyLast)*this.canvasScaleFactor);
        if (delta) {
            const newOffset = this.vCursorOffset + delta;
            if (newOffset > this.vCursorBottom) {
                // Cursor is below the bottom boundary.
                this.frameWin.scrollTo(0, Math.round(py*this.canvasScaleFactor - newOffset));
            } else if (newOffset > this.vCursorTop) {
                // Cursor is between the boundaries.
                this.vCursorOffset = newOffset;
                this.vCursor.style.top = `${newOffset}px`;
            } else if (Math.round(py*this.canvasScaleFactor) > this.vCursorTop) {
                // Current point is below the top boundary.
                this.frameWin.scrollTo(0, Math.round(py*this.canvasScaleFactor - newOffset));
            } else {
                // Current point is above the top boundary.
                this.vCursorOffset = newOffset;
                this.vCursor.style.top = `${newOffset}px`;
            }

            this.pyLast = py;
        }
    }

    /**************************************/
    async raisePen() {
        /* Sets the pen in the up position */
        const now = performance.now();
        const delay = this.outputReadyStamp - now;

        this.penDown = false;
        this.penStat.textContent = "UP";
        this.penStat.classList.remove("red");
        this.outputReadyStamp += Plotter.penPeriod;
        if (delay > Plotter.minWait) {
            await this.timer.delayFor(delay);
        }
    }

    /**************************************/
    async lowerPen() {
        /* Sets the pen in the down position */
        const now = performance.now();
        const delay = this.outputReadyStamp - now;

        this.penDown = true;
        this.penStat.textContent = "DOWN";
        this.penStat.classList.add("red");
        this.outputReadyStamp += Plotter.penPeriod;
        if (delay > Plotter.minWait) {
            await this.timer.delayFor(delay);
        }
    }

    /**************************************/
    drawSteps(timestamp) {
        /* Called by the requestAnimationFrame mechanism to draw any plotter
        steps accumulated in this.stepCache. Copies the region of the onscreen
        canvas that would have been drawn to the offscreen canvas, draws the
        cached steps onto the offscreen canvas, then copies the new drawing
        to where it belongs on the onscreen canvas. All of this in the name
        of performance */
        const top = this.stepCacheTop;

        // If there has been only pen-up movement since the last frame, then the
        // cache will be empty, so all we need to do is position the cursor lines.

        if (top) {
            const cache = this.stepCache;
            // Get bounds of the region that has been drawn since the last frame.
            const xOffset = this.stepXMin;
            const yOffset = this.stepYMin;
            const width = this.stepXMax - xOffset + 1;
            const height = this.stepYMax - yOffset + 1;

            // Resize the drawing canvas if necessary.
            if (width > this.drawCanvas.width) {
                this.drawCanvas.width = width+5;
            }

            if (height > this.drawCanvas.height) {
                this.drawCanvas.height = height+5;
            }

            // Copy the drawn region of the onscreen canvas to the offscreen one.
            this.drawDC.putImageData(
                    this.dc.getImageData(xOffset, yOffset, width, height), 0, 0);

            // Draw the cached step movements on the drawing canvas.
            for (let x=0; x<top; x+=2) {
                this.drawDC.fillRect(cache[x]-xOffset, cache[x+1]-yOffset,
                        this.canvasLineWidth, this.canvasLineWidth);
            }

            // Copy the offscreen canvas to the onscreen one.
            this.dc.putImageData(
                    this.drawDC.getImageData(0, 0, width, height), xOffset, yOffset);

            //  Reset for the next frame.
            this.stepCacheTop = 0;
            this.stepXMax = 0;
            this.stepXMin = Plotter.canvasMaxWidth;
            this.stepYMax = 0;
            this.stepYMin = Plotter.canvasMaxHeight;
        }

        this.stepCacheToken = 0;
        this.positionCursor(this.stepXLast, this.stepYLast);

        // Update average frames/second.
        const elapsed = timestamp - this.frameLastStamp;                                // frame time, ms
        this.frameLastStamp = timestamp;
        this.fps = this.fps*(1-Plotter.fpsAlpha) + Plotter.fpsAlpha*1000/elapsed;       // avg frame/sec
        this.$$("FPS").textContent = this.fps.toFixed(2);
    }

    /**************************************/
    async move(dx, dy) {
        /* Steps the plot in the indicated direction(s). Caches all movement
        until the next animation frame time, when it will then be drawn. If the
        pen is down, caches the coordinates of a new point to be drawn;
        otherwise just caches the last pen coordinates Throttles I/O timing to
        the actual speed of the plotter as needed */
        const now = performance.now();
        const delay = this.outputReadyStamp - now;

        if (delay < 0) {
            this.outputReadyStamp = now + Plotter.stepPeriod;
        } else {
            this.outputReadyStamp += Plotter.stepPeriod;
            if (delay > Plotter.minWait) {
                await this.timer.delayFor(delay);
            }
        }

        // Determine new (x,y) from (dx,dy) and overall extents of the plot
        let x = this.x + dx;
        if (x < 0) {
            x = 0;
        } else if (x >= Plotter.canvasMaxWidth) {
            x = Plotter.canvasMaxWidth-1;
        } else if (this.penDown) {
            if (x > this.xMax) {this.xMax = x}
            if (x < this.xMin) {this.xMin = x}
        }

        let y = this.y + dy;
        if (y < 0) {
            y = 0;
        } else if (y >= Plotter.canvasMaxHeight) {
            y = Plotter.canvasMaxHeight-1;
        } else if (this.penDown) {
            if (y > this.yMax) {this.yMax = y}
            if (y < this.yMin) {this.yMin = y}
        }

        this.x = x;
        this.y = y;
        const [px, py] = this.toPixelCoord(x, y);

        // Determine the extents of movement in this frame time
        if (this.stepXMin > px) {
            this.stepXMin = px;
        }
        if (this.stepXMax < px) {
            this.stepXMax = px;
        }


        if (this.stepYMin > py) {
            this.stepYMin = py;
        }
        if (this.stepYMax < py) {
            this.stepYMax = py;
        }

        // Cache this step until the next frame time
        this.stepXLast = px;
        this.stepYLast = py;
        if (this.penDown) {
            if (this.stepCacheTop) {
                if (this.stepCache.length <= this.stepCacheTop) {
                    this.stepCache.push(px, py);
                } else {
                    this.stepCache[this.stepCacheTop] = px;
                    this.stepCache[this.stepCacheTop+1] = py;
                }

                this.stepCacheTop += 2;
            } else {
                this.stepCache[0] = px;
                this.stepCache[1] = py;
                this.stepCacheTop = 2;
            }
        }

        // Schedule the next frame update
        if (!this.stepCacheToken) {
            this.stepCacheToken = this.window.requestAnimationFrame(this.boundDrawSteps);
        }
    }

    /**************************************/
    async moveFast(dx, dy) {
        /* Initiates and terminates fast manual movement of the cursor */

        this.movingFast = true;
        do {
            await this.move(dx, dy);
        } while (this.movingFast);
    }

    /**************************************/
    plotCommand(char) {
        /* Decodes one paper-tape character code into the appropriate plotting
        command. Returns a Promise that resolves once any pending delay has
        taken place */
        const command = Plotter.plotXlate[char];

        //console.debug("Plotter: '%s' %5i %5i %i", char, this.x, this.y, this.penDown);

        if (!command) {
            return this.move(0, 0);     // no action
        } else if (command.penUp) {
            return this.raisePen();
        } else if (command.penDown) {
            return this.lowerPen();
        } else {                        // a stepping command
            return this.move(-command.dy, command.dx);
        }

    }

    /**************************************/
    dumpNumeric(digit) {
        /* Writes one digit to the plotter. This should be used directly by
        Dump Numerically. Returns a Promise for completion */

        return this.dumpNumeric(digit);
    }

    /**************************************/
    writeAlpha(digitPair) {
        /* Writes one even/odd digit pair to the typewriter. This should be used
        directly by Write Alphanumerically. Returns a Promise for completion */
        const even = (digitPair >> Register.digitBits) & Register.bcdMask;
        const odd = digitPair & Register.bcdMask;
        const code = even*16 + odd;

        return this.plotCommand(Plotter.alphaGlyphs[code]);
    }

    /**************************************/
    writeNumeric(digit) {
        /* Writes one digit to the typewriter, suppressing some undigit codes.
        This should be used directly by Write Numerically. Returns a Promise
        for completion */

        return this.plotCommand(Plotter.numericGlyphs[digit & Register.bcdMask]);
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

        if (this.stepCacheToken) {
            this.window.cancelAnimationFrame(this.stepCacheToken);
            this.stepCacheToken = 0;
        }

        if (this.window) {
            this.$$("ControlsDiv").removeEventListener("click", this.boundControlClick);
            this.$$("ControlsDiv").removeEventListener("mousedown", this.boundControlMouseDown);
            this.$$("ControlsDiv").removeEventListener("mouseup", this.boundControlMouseUp);

            this.config.putWindowGeometry(this.window, "Plotter");
            this.window.removeEventListener("resize", this.boundResizeWindow);
            this.window.removeEventListener("beforeunload", this.beforeUnload);
            this.window.close();
        }
    }
} // class Plotter
