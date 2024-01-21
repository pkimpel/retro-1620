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
* The system configuration has an option to size the display of the
* plotting area at 100% (one css pixel per plotter step) or 50% (one
* css pixel for every two steps). The 50% setting is recommended for
* general use. The plotting area is not scaled, only the display of it.
*
* Different browsers support different maximum sizes of the <canvas>
* element. As of late 2023, desktop versions of the following browsers
* support maximum coordinate values of: Firefox 32767, Chrome and Edge
* 65535, Apple Safari 4,194,303 in width and 8,388,607 in height.
* There are further restrictions on the total area of a canvas.
* See https://github.com/jhildenbiddle/canvas-size#test-results.
*
* This implementation currently uses a canvas width of 1100 pixels and
* allows the height to be selected in the system configuration. One of
* several height values can be selected, ranging from 2048 to 32767
* pixels. Smaller heights generally result in better drawing performance.
* At or above a height of 16384 pixels, performance in most browsers
* becomes poor, althogh the actual effect varies by browser. The default
* height is 4096 pixels, allowing a drawing of 11 inches wide by almost
* 41 inches long.
*
* Note that canvas pixels are not the same as css (window) pixels,
* except at a scale factor of 1.000 (100%). At 50% scale, there are
* two canvas pixels per css pixels, and that relationship will change
* as the Plotter window is resized.
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

    static fpsAlpha = 0.01;             // alpha for moving exponential average frames/sec
    static minWait = 4;                 // ms for minimum throttling delay
    static penPeriod = 100;             // ms for pen up/down
    static resizeDelay = 100;           // delay to apply a window resize event, ms
    static stepPeriod = 1000/300;       // ms per step
    static windowHeight = 488;          // window height, css pixels
    static windowExtraWidth = 93;       // window non-canvas width, css pixels:
                                        //     ControlDiv=68, scrollbar=17, margin=4+4

    static canvasStepSize = 0.01;       // plotter step size, inches
    static canvasMaxHeight = 32767;     // max canvas step height, about 27.3 feet
    static canvasMaxWidth = 1100;       // max canvas step width, 11 inches
    static canvasHOffset =              // canvas coordinate horizontal offset
                Plotter.canvasMaxWidth-1;
    static canvasVOffset = 0;           // canvas coordinate vertical offset
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
    canvasLineWidth = 1;                // width of dots drawn by plotter steps, canvas units
    canvasMaxHeight = 0;                // maximum canvas height, canvas pixels
    canvasScrollLimit = 0;              // current max vertical offset where scrolling is allowed, css pixels
    canvasScrollOffset = 0;             // amount canvas has been scrolled, css pixels
    cxLast = 0;                         // last horizontal canvas coord
    cyLast = 0;                         // last vertical canvas coord
    fps = 60.0;                         // moving exponential average frames/sec
    frameLastStamp = performance.now(); // last animation frame timestamp
    movingFast = false;                 // true if doing manual fast move
    outputReadyStamp = 0;               // timestamp when ready for next step
    penDown = false;                    // pen up=false, down=true
    resizeDelayToken = 0;               // setTimeout cancel token for resize events
    stepCache = new Array(20);          // cache of steps to be drawn at next frame time as x,y pairs
    stepCacheToken = 0;                 // cancellation token for requestAnimationFrame
    stepCacheTop = 0;                   // current length of this.stepCache
    stepXLast = 0;                      // last cached X canvas pixel coord
    stepYLast = 0;                      // last cached Y canvas pixel coord
    timer = new Timer();                // delay management timer
    vCursorBottom = 0;                  // current bottom cursor scrolling boundary offset, css pixels
    vCursorOffset = 0;                  // current offset of the vertical-coordinate cursor, css pixels
    vCursorTop = 0;                     // current top cursor scrolling boundary offset, css pixels
    viewHeight = 0;                     // current canvas height, css pixels
    viewScaleFactor = 1;                // current scale factor of viewed canvas
    viewSlideOffset = 0;                // offset of canvas in <iframe> to keep cursor in middle of view, css pixels
    viewWidth = 0;                      // current canvas width, css pixels
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

        this.boundApplyResize = this.applyResize.bind(this);
        this.boundControlClick = this.controlClick.bind(this);
        this.boundControlMouseDown = this.controlMouseDown.bind(this);
        this.boundControlMouseUp = this.controlMouseUp.bind(this);
        this.boundDrawSteps = this.drawSteps.bind(this);
        this.boundResizeWindow = this.resizeWindow.bind(this);

        this.canvasHeight = Math.min(Math.max(this.config.getNode("Plotter.maxHeight"),
                Plotter.windowHeight), Plotter.canvasMaxHeight);

        // Create the Plotter window
        let geometry = this.config.formatWindowGeometry("Plotter");
        this.persistentWindowPosition = (geometry.length > 0);
        if (this.persistentWindowPosition) {
            this.innerHeight = this.config.getWindowProperty("Plotter", "innerHeight");
            this.innerWidth = this.config.getWindowProperty("Plotter", "innerWidth");
            this.viewScaleFactor = (this.innerWidth - Plotter.windowExtraWidth)/Plotter.canvasMaxWidth;
        } else {
            this.viewScaleFactor = (this.config.getNode("Plotter.scale") == 2 ? 1.0 : 0.5);
            this.innerHeight = Plotter.windowHeight;
            this.innerWidth = Plotter.windowExtraWidth +
                    Math.round(Plotter.canvasMaxWidth*this.viewScaleFactor);
            geometry = `,left=${(screen.availWidth - this.innerWidth)/2}` +
                       `,top=${screen.availHeight - Plotter.windowHeight}` +
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

        this.printingFrame = this.$$("PrintingFrame");
        this.printingFrameDoc = this.printingFrame.contentDocument;
        this.printingBody = this.printingFrameDoc.getElementById("FrameBody");
        this.printingCanvasDiv = this.printingFrameDoc.getElementById("CanvasDiv");
        this.printingCanvas = this.printingFrameDoc.getElementById("PlotterCanvas");

        this.calculateScaling();
        this.setCursorOffset();

        this.canvas.height = this.canvasHeight;
        this.canvas.width = Plotter.canvasMaxWidth;
        this.canvas.title = `Max plot area: ${Plotter.canvasMaxWidth} × ${this.canvasHeight} pixels`;

        // Events
        this.window.addEventListener("beforeunload", this.beforeUnload);
        this.window.addEventListener("resize", this.boundResizeWindow);
        this.$$("ControlsDiv").addEventListener("click", this.boundControlClick);
        this.$$("ControlsDiv").addEventListener("mousedown", this.boundControlMouseDown);
        this.$$("ControlsDiv").addEventListener("mouseup", this.boundControlMouseUp);

        // Resize the window to take into account the difference between inner
        // and outer heights (WebKit quirk). Also force the width to match the
        // initial scale factor.
        if (this.persistentWindowPosition) {
            this.innerWidth = this.canvasDiv.offsetWidth + Plotter.windowExtraWidth;
            const dw = this.innerWidth - this.window.innerWidth;
            this.viewScaleFactor = (this.canvasDiv.offsetWidth + dw)/Plotter.canvasMaxWidth;
            this.window.resizeBy(dw, this.innerHeight - this.window.innerHeight);
        } else {
            this.window.resizeBy(
                    Plotter.canvasMaxWidth/Math.round(1/this.viewScaleFactor) -
                            this.canvasDiv.offsetWidth,
                    this.innerHeight - this.window.innerHeight);
        }

        // Recalculate scaling and offsets after initial window resize.
        this.applyResize();
        this.setCursorOffset();
        this.emptyCanvas();
        this.changeColor("black");      // the default
    }

    /**************************************/
    clear() {
        /* Initializes the plotter unit state */

        this.busy = false;              // an I/O is in progress
        this.xMax = this.yMax = 0;
        this.xMin = this.canvasHeight;
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
        case "BrownBtn":
            this.changeColor("#630");
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

        this.viewHeight = this.frameBody.offsetHeight;
        this.viewWidth = this.canvasDiv.offsetWidth;
        this.viewScaleFactor = this.viewWidth/Plotter.canvasMaxWidth;
        this.$$("ScaleFactor").textContent = this.viewScaleFactor.toFixed(3);

        this.vCursorTop = Math.round(this.viewHeight*Plotter.vCursorTopFactor);
        this.vCursorBottom = Math.round(this.viewHeight*Plotter.vCursorBottomFactor);
        this.canvasScrollLimit =
                Math.round((this.canvasHeight)*this.viewScaleFactor) -
                (this.viewHeight - this.vCursorBottom);
    }

    /**************************************/
    setCursorOffset() {
        /* Calculates the vertical-cursor offsets. this.calculateScaling() must
        be called before this method */

        this.vCursorOffset = Math.round(this.viewHeight/2);
    }

    /**************************************/
    applyResize() {
        /* Apply the effect of the last resize event after a delay to allow the
        effect of any prior resize to finish completely. After a resize, the
        cursor will still be a mid-height in the canvas view. If the resized
        window is larger, the plot will have moved upward with respect to the
        cursor, so the plot will need either to scroll or slide downward to
        compensate. If the resized window is smaller, the plot will have moved
        downward with respect to the cursor, so the plot will need either to
        scroll or slide upward to compensate. That's what makes resize tricky */
        const lastOffset = this.vCursorOffset;

        this.resizeDelayToken = 0;
        this.calculateScaling();
        const newOffset = Math.round(this.viewHeight/2);
        let delta = lastOffset - newOffset;

        if (delta > 0) {
            // Window is smaller, so move the plot upward, first by decreasing any slide offset.
            if (this.canvasSlideOffset > 0) {
                this.canvasSlideOffset -= delta;
                if (this.canvasSlideOffset > 0) {
                    delta = 0;
                } else {
                    delta = -this.canvasSlideOffset;
                    this.canvasSlideOffset = 0;
                }
            }

            // Move any remaining distance by increasing scrolling.
            this.canvasScrollOffset = Math.min(this.canvasScrollOffset+delta, this.canvasScrollLimit);
        } else if (delta < 0) {
            // Window is larger, so move the plot downward, first by decreasing any scroll offset.
            if (this.canvasScrollOffset > 0) {
                this.canvasScrollOffset += delta;       // note delta < 0, so this subtracts
                if (this.canvasScrollOffset > 0) {
                    delta = 0;
                } else {
                    delta = this.canvasScrollOffset;    // both < 0, so this moves delta toward zero
                    this.canvasScrollOffset = 0;
                }
            }

            // Move any remaining distance by increasing sliding.
            this.canvasSlideOffset = Math.min(this.canvasSlideOffset-delta, newOffset);
        }

        //console.debug("Plotter resize (%5d, %5d) %f vCursor @ %d",
        //        this.viewWidth, this.viewHeight, this.viewScaleFactor, newOffset);

        this.vCursorOffset = newOffset;
        this.vCursor.style.top = `${newOffset}px`;
        this.hCursor.style.left = `${Math.round(this.cxLast*this.viewScaleFactor)}px`;
        this.frame.style.top = `${this.canvasSlideOffset}px`;
        this.frameWin.scrollTo(0, this.canvasScrollOffset);
        this.positionCursor(this.cxLast, this.cyLast);
    }

    /**************************************/
    resizeWindow(ev) {
        /* Handles Plotter resize events. Schedules reconfiguration of the
        scaling parameters and changing the vertical cursor position after a
        short delay when the window is resized. If resize events happen too
        fast, only the final one every Plotter.resizeDelay ms will be used */

        if (this.resizeDelayToken == 0) {
            this.resizeDelayToken = setTimeout(this.boundApplyResize, Plotter.resizeDelay);
        }
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
        this.printingCanvasDiv.style.left = "50%";
        this.printingCanvasDiv.style.width = "fit-content";
        this.printingCanvasDiv.style.height = "fit-content";
        this.printingCanvasDiv.style.transform = "translate(-50%,0)";
        this.printingCanvas.style.position = "static";
        this.printingCanvas.style.width = "revert";
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
    toInternalCoord(x, y) {
        /* Converts canvas pixel coordinates to internal pixel coordinates */

        return [Plotter.canvasHOffset-x, y-Plotter.canvasVOffset];
    }

    /**************************************/
    toCanvasCoord(x, y) {
        /* Converts internal pixel coordinates to canvas pixel coordinates */

        return [Plotter.canvasHOffset-x, y+Plotter.canvasVOffset];
    }

    /**************************************/
    homeCursor() {
        /* Homes the cursor and resets the related properties */

        this.x = this.y = 0;
        const [cx, cy] = this.toCanvasCoord(this.x, this.y);
        this.canvasScrollOffset = 0;
        this.canvasSlideOffset = this.vCursorOffset;
        this.cxLast = cx-1;
        this.cyLast = cy+1;
        this.raisePen();
        this.frameWin.scrollTo(0, 0)
        this.frame.style.top = `${this.vCursorOffset}px`;
        this.vCursor.style.top = `${this.vCursorOffset}px`;
        this.positionCursor(cx, cy);
    }

    /**************************************/
    emptyCanvas() {
        /* Erases the plotter canvas, initializes it for new output, and resets
        the vertical origin to the middle of the plotting area */

        this.setCursorOffset();
        this.clear();                   // calls this.homeCursor()
        this.raisePen();
        if (this.printingCanvas) {      // remove any print canvas from its frame
            this.printingCanvasDiv.removeChild(this.printingCanvas);
            this.printingCanvas = null;
        }

        const saveStyle = this.dc.fillStyle;
        this.dc.fillStyle = "white";
        this.dc.fillRect(0, 0, Plotter.canvasMaxWidth+1, this.canvasHeight+1);
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
        case "#630":
            this.$$("BrownLamp").style.display = "block";
            break;
        }
    }

    /**************************************/
    cloneCanvas(margin) {
        /* Copies that part of the visible canvas from (0,0) to (xMax,yMax) and
        returns that portion as a new canvas object. "margin" specifies the
        number of margin pixels to be added around the original canvas */
        const margin2 = margin*2;
        const [cxMin, cyMin] = this.toCanvasCoord(this.xMin, this.yMin);
        const [cxMax, cyMax] = this.toCanvasCoord(this.xMax, this.yMax);
        const width = cxMin-cxMax+2;
        const height = cyMax-cyMin+2;
        const iData = this.dc.getImageData(cxMax, cyMin, width, height);

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
    positionCursor(cx, cy) {
        /* Positions the cursor crosshairs to the specified canvas pixel
        coordinates. If the current point is between the upper and lower
        scrolling boundaries, or the window is already scrolled to the top,
        moves the vCursor line, otherwise scrolls the window */
        const vx = Math.round(cx*this.viewScaleFactor);
        const vy = Math.round(cy*this.viewScaleFactor);
        const yLast = Math.round(this.cyLast*this.viewScaleFactor);

        this.hCoord.textContent = this.y;
        this.vCoord.textContent = this.x;
        if (this.cxLast != cx) {
            this.hCursor.style.left = `${vx}px`;
            this.cxLast = cx;
        }

        if (vy != yLast) {
            if (vy < this.vCursorTop) {
                // If the new vertical position is less than the top boundary, slide the canvas down.
                this.vSlideOffset = this.vCursorTop - vy;
                this.frame.style.top = `${this.vSlideOffset}px`;
                if (this.canvasScrollOffset) {
                    this.canvasScrollOffset = 0;
                    this.frameWin.scrollTo(0, 0);
                }
            } else {
                // Slide the canvas all the way up before doing any scrolling or cursor movement.
                if (this.vSlideOffset) {
                    this.vSlideOffset = 0;
                    this.frame.style.top = "0";
                }

                const newOffset = vy - this.canvasScrollOffset;
                if (newOffset > this.vCursorBottom) {
                    // Cursor will be below the bottom boundary.
                    if (vy < this.canvasScrollLimit) {
                        // New point will be above the bottom scroll limit, so scroll.
                        this.canvasScrollOffset = vy - this.vCursorOffset;
                        this.frameWin.scrollTo(0, this.canvasScrollOffset);
                    } else {
                        // New point will be below the bottom scroll limit, so move cursor line.
                        this.vCursorOffset = newOffset;
                        this.vCursor.style.top = `${newOffset}px`;
                    }
                } else if (newOffset > this.vCursorTop) {
                    // Cursor will be between the boundaries, so move cursor line.
                    this.vCursorOffset = newOffset;
                    this.vCursor.style.top = `${newOffset}px`;
                } else {
                    // Cursor will be above the top boundary.
                    console.warn("Plotter: cursor above top boundary vy=%d newO=%d vCO=%d",
                            vy, newOffset, this.vCursorOffset);
                    this.canvasScrollOffset = vy - this.vCursorOffset;
                    this.frameWin.scrollTo(0, this.canvasScrollOffset);
                }

                this.cyLast = cy;
            }
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
        steps accumulated in this.stepCache. If there has been only pen-up
        movement since the last frame, then the cache will be empty, so all
        that we need to do is reposition the cursor lines */
        const top = this.stepCacheTop;

        // Draw the cached step movements on the drawing canvas.
        if (top) {
            const cache = this.stepCache;
            for (let x=0; x<top; x+=2) {
                this.dc.fillRect(cache[x], cache[x+1],
                        this.canvasLineWidth, this.canvasLineWidth);
            }

            this.stepCacheTop = 0;
        }

        this.stepCacheToken = 0;
        this.positionCursor(this.stepXLast, this.stepYLast);

        // Update average frames/second.
        // const elapsed = timestamp - this.frameLastStamp;                                // frame time, ms
        // this.frameLastStamp = timestamp;
        // this.fps = this.fps*(1-Plotter.fpsAlpha) + Plotter.fpsAlpha*1000/elapsed;       // avg frame/sec
        // this.$$("FPS").textContent = this.fps.toFixed(2);
    }

    /**************************************/
    async move(dx, dy) {
        /* Steps the plot in the indicated direction(s). Caches all movement
        until the next animation frame time, when it will then be drawn. If the
        pen is down, caches the coordinates of a new point to be drawn;
        otherwise just caches the last pen position. Throttles I/O timing to
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

        // Determine new (x,y) from (dx,dy) and update overall extents of the plot.
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
        } else if (y >= this.canvasHeight) {
            y = this.canvasHeight-1;
        } else if (this.penDown) {
            if (y > this.yMax) {this.yMax = y}
            if (y < this.yMin) {this.yMin = y}
        }

        this.x = x;
        this.y = y;
        const [cx, cy] = this.toCanvasCoord(x, y);

        // Cache this step until the next frame time.
        this.stepXLast = cx;
        this.stepYLast = cy;
        if (this.penDown) {
            if (this.stepCacheTop) {
                if (this.stepCache.length <= this.stepCacheTop) {
                    this.stepCache.push(cx, cy);
                } else {
                    this.stepCache[this.stepCacheTop] = cx;
                    this.stepCache[this.stepCacheTop+1] = cy;
                }

                this.stepCacheTop += 2;
            } else {
                this.stepCache[0] = cx;
                this.stepCache[1] = cy;
                this.stepCacheTop = 2;
            }
        }

        // Schedule the next frame update.
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
