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

    static frameExtraWidth = 20;        // plot/print non-frame width, pixels
    static minWait = 5;                 // ms for minimum throttling delay
    static penPeriod = 100;             // ms for pen up/down
    static stepPeriod = 1000/300;       // ms per step
    static windowHeight = 488;          // window heighteight, pixels
    static windowExtraWidth = 96;       // window non-canvas width, pixels

    static canvasStepSize = 0.01;       // plotter step size, inches
    static canvasWidth = 11;            // plotter carriage width, inches
    static canvasMaxHeight = 16383;     // max canvas unit height
    static canvasHeight = Plotter.canvasMaxHeight*Plotter.canvasStepSize;  // inches, about 13.6 feet
    static vCursorLowerFactor = 0.50;   // lower scrolling boundary factor
    static vCursorUpperFactor = 0.50;   // upper scrolling boundary factor

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


    // Public Instance Properties

    doc = null;                         // window document object
    window = null;                      // window object

    movingFast = false;                 // true if doing manual fast move
    outputReadyStamp = 0;               // timestamp when ready for next point
    penDown = false;                    // pen up=0, down=1
    pixelHOrigin = 0;                   // horizontal pixel origin
    pixelVOrigin = 0;                   // vertical pixel origin
    pyLast = 0;                         // last vertical pixel offset
    timer = new Timer();                // delay management timer
    x = 0;                              // vertical offset (to down on the canvas)
    y = 0;                              // horizontal offset (to left on the canvas)
    xMax = 0;                           // maximum vertical offset attained
    xMin = 0;                           // minimum vertical offset attained
    yMax = 0;                           // maximum horizontal offset attained
    yMin = 0;                           // minimum horizontal offset attained


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
        this.boundResizeWindow = this.resizeWindow.bind(this);

        this.innerHeight = Plotter.windowHeight;
        switch (this.config.getNode("Plotter.scale")) {
        case 2:
            this.canvasHScale = -1.0;
            this.canvasVScale = 1.0;
            break;
        default:
            this.canvasHScale = -0.5;
            this.canvasVScale = 0.5;
            break;
        }

        this.canvasPixelHeight = Math.round(Math.abs(Plotter.canvasMaxHeight*this.canvasVScale));
        this.canvasPixelWidth = Math.round(Math.abs(Plotter.canvasWidth/Plotter.canvasStepSize*this.canvasHScale));

        // Create the Plotter window
        let geometry = this.config.formatWindowGeometry("Plotter");
        if (geometry.length) {
            this.innerHeight = this.config.getWindowProperty("Plotter", "innerHeight");
        } else {
            const width = this.canvasPixelWidth + Plotter.windowExtraWidth;
            geometry = `,left=${(screen.availWidth-width)/2}` +
                       `,top=${screen.availHeight-Plotter.windowHeight}` +
                       `,width=${width},height=${Plotter.windowHeight}`;
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

        this.$$("PlotterDiv").style.width = `${this.canvasPixelWidth + Plotter.frameExtraWidth}px`;
        this.$$("PrintingDiv").style.width = `${this.canvasPixelWidth + Plotter.frameExtraWidth}px`;
        this.vCursor.style.width = `${this.canvasPixelWidth}px`;

        this.frame = this.$$("PlotterFrame");
        this.frameWin = this.frame.contentWindow;
        this.frameDoc = this.frame.contentDocument;
        this.frameBody = this.frameDoc.getElementById("FrameBody");
        this.canvas = this.frameDoc.getElementById("PlotterCanvas");
        this.dc = this.canvas.getContext("2d", {alpha: false, willReadFrequently: false});

        this.printingFrame = this.$$("PrintingFrame");
        this.printingFrameDoc = this.printingFrame.contentDocument;
        this.printingBody = this.printingFrameDoc.getElementById("FrameBody");
        this.printingCanvas = this.printingFrameDoc.getElementById("PlotterCanvas");

        this.innerHeight = this.frameBody.offsetHeight;
        this.canvasHOffset = this.canvasPixelWidth-1;   // pixels are drawn to the right of the point
        this.canvasVOffset = Math.round(this.innerHeight/2);
        this.canvasUnitHeight = Math.round(Plotter.canvasHeight/Plotter.canvasStepSize);
        this.canvasUnitWidth = Math.round(Plotter.canvasWidth/Plotter.canvasStepSize);
        this.canvasLineWidth = 1;

        [this.pixelHOrigin, this.pixelVOrigin] = this.toPixelCoord(0, 0);
        this.canvas.height = Math.abs(this.canvasUnitHeight*this.canvasVScale);
        this.canvas.width = Math.round(Math.abs(this.canvasUnitWidth*this.canvasHScale));

        this.vCursorOffset = this.canvasVOffset;
        this.vCursorLower = this.innerHeight*Plotter.vCursorLowerFactor;
        this.vCursorUpper = this.innerHeight*Plotter.vCursorUpperFactor;

        this.dc.fillStyle = "white";
        this.dc.fillRect(0, 0, this.canvasPixelWidth+1, this.canvasPixelHeight+1);

        this.emptyCanvas();
        this.changeColor("black");      // the default

        // Events
        this.window.addEventListener("beforeunload", this.beforeUnload);
        this.window.addEventListener("resize", this.boundResizeWindow);
        this.$$("ControlsDiv").addEventListener("click", this.boundControlClick);
        this.$$("ControlsDiv").addEventListener("mousedown", this.boundControlMouseDown);
        this.$$("ControlsDiv").addEventListener("mouseup", this.boundControlMouseUp);

        // Resize the window to take into account the difference between
        // inner and outer heights (WebKit quirk).
        if (this.window.innerHeight < this.innerHeight) {        // Safari bug
            this.window.resizeBy(0, this.innerHeight - this.window.innerHeight);
        }

        this.innerHeight = this.window.innerHeight;
    }

    /**************************************/
    clear() {
        /* Initializes the plotter unit state */

        this.busy = false;              // an I/O is in progress
        this.xMax = this.yMax = 0;
        this.xMin = this.canvasUnitHeight;
        this.yMin = this.canvasUnitWidth;
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
    resizeWindow(ev) {
        /* Reconfigures the vertical cursor position when the window is resized */
        const height = this.frameBody.offsetHeight;

        this.innerHeight = height;
        this.vCursorLower = height*Plotter.vCursorLowerFactor;
        this.vCursorUpper = height*Plotter.vCursorUpperFactor;
        this.vCursorOffset = Math.round(height/2);
        if (this.pyLast >= this.vCursorOffset) {
            this.frameWin.scrollTo(0, this.pyLast - this.vCursorOffset);
        } else {
            this.vCursorOffset = this.pyLast;
            this.frameWin.scrollTo(0, 0);
        }

        this.vCursor.style.top = `${this.vCursorOffset}px`;
    }

    /**************************************/
    printCanvas(ev) {
        /* Handler for clicking the Print button and printing the plotting area.
        Clones the visible canvas and inserts it into the (hidden) <iframe>
        behind the visible <iframe>, then initiates the print dialog for that
        (hidden) <iframe> */

        if (this.printingCanvas) {      // remove any old canvas from its frame
            this.printingBody.removeChild(this.printingCanvas);
        }

        this.printingCanvas = this.cloneCanvas(0);
        this.printingCanvas.id = "PlotterCanvas";
        this.printingBody.appendChild(this.printingCanvas);
        this.printingCanvas.left = (this.canvasPixelWidth - this.printingCanvas.width)/2;
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

        return [Math.round((x-this.canvasHOffset)/this.canvasHScale),
                Math.round((y-this.canvasVOffset)/this.canvasVScale)];
    }

    /**************************************/
    toPixelCoord(x, y) {
        /* Converts transformed canvas unit coordinates into pixel (screen)
        coordinates */

        return [Math.round(x*this.canvasHScale + this.canvasHOffset),
                Math.round(y*this.canvasVScale + this.canvasVOffset)];
    }

    /**************************************/
    homeCursor() {
        /* Homes the cursor and resets the related properties */

        this.x = this.y = 0;
        this.pyLast = this.vCursorOffset;
        this.vCursor.style.top = `${this.vCursorOffset}px`;
        this.frameWin.scrollTo(0, 0)
        const [px, py] = this.toPixelCoord(this.x, this.y);
        this.positionCursor(px, py);
    }

    /**************************************/
    emptyCanvas() {
        /* Erases the plotter canvas and initializes it for new output */

        this.canvasVOffset = Math.round(this.innerHeight/2);
        this.vCursorOffset = this.canvasVOffset;
        this.clear();
        this.raisePen();
        if (this.printingCanvas) {      // remove any print canvas from its frame
            this.printingBody.removeChild(this.printingCanvas);
            this.printingCanvas = null;
        }

        const saveStyle = this.dc.fillStyle;
        this.dc.fillStyle = "white";
        this.dc.fillRect(0, 0, this.canvasPixelWidth+1, this.canvasPixelHeight+1);
        this.dc.fillStyle = saveStyle;
    }

    /**************************************/
    changeColor(color) {
        /* Changes the pen color */
        const lamps = this.$$("PaletteDiv").querySelectorAll(".paletteLamp");

        // Reset all of the color-selection lamps.
        for (const lamp of lamps) {
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
        const height = pyMax-pyMin+1;
        const iData = this.dc.getImageData(pxMax-1, pyMin, width, height);

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
        this.hCursor.style.left = `${px}px`;

        const delta = py - this.pyLast;
        if (delta) {
            const newOffset = this.vCursorOffset + delta;
            if (newOffset > this.vCursorUpper) {        // cursor is below the high boundary
                this.frameWin.scrollTo(0, py - newOffset);
            } else if (newOffset > this.vCursorLower) { // cursor is between the boundaries
                this.vCursorOffset = newOffset;
                this.vCursor.style.top = `${newOffset}px`;
            } else if (py > this.vCursorLower) {        // current point is below the low boundary
                this.frameWin.scrollTo(0, py - newOffset);
            } else {                                    // current point is above the low boundary
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
    async move(dx, dy) {
        /* Moves the plot in the indicated direction(s). If the pen is down,
        plots a point at the new location. Delays to the actual speed of the
        plotter as needed */
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

        let x = this.x + dx;
        if (x < 0) {
            x = 0;
        } else if (x >= this.canvasUnitWidth) {
            x = this.canvasUnitWidth-1;
        } else if (this.penDown) {
            if (x > this.xMax) {this.xMax = x}
            if (x < this.xMin) {this.xMin = x}
        }

        let y = this.y + dy;
        if (y < 0) {
            y = 0;
        } else if (y >= this.canvasUnitHeight) {
            y = this.canvasUnitHeight-1;
        } else if (this.penDown) {
            if (y > this.yMax) {this.yMax = y}
            if (y < this.yMin) {this.yMin = y}
        }

        this.x = x;
        this.y = y;
        const [px, py] = this.toPixelCoord(x, y);
        this.positionCursor(px, py);
        if (this.penDown) {
            this.dc.fillRect(px, py, this.canvasLineWidth, this.canvasLineWidth);
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
    plotCommand(char) {
        /* Decodes one paper-tape character code into the appropriate plotting
        command. Returns a Promise that resolves once any pending delay has
        taken place */
        const command = Plotter.plotXlate[char];

        //console.log("Plotter: '%s' %5i %5i %i", char, this.x, this.y, this.penDown);

        if (!command) {
            return this.move(0, 0);     // no action
        } else if (command.penUp) {
            return this.raisePen();
        } else if (command.penDown) {
            return this.lowerPen();
        } else {
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
