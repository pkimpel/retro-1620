/***********************************************************************
* retro-1620/webUI PaperTapeReader.js
************************************************************************
* Copyright (c) 2024, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* IBM 1621 Paper Tape Reader device.
*
* Defines the paper tape reader device. It is capable of reading and
* processing 8-channel tape image files in two formats:
*   (1) Each tape frame is represented in the image file as one binary
*       byte. The low-order bit of the byte represents the 1-punch on a
*       tape, the high-order bit represents the EOL punch, which indicates
*       the end of a record and is not stored in memory.
*   (2) Each tape frame is represented in the image file as one ASCII or
*       Unicode character. Only characters valid for 1620 paper tape are
*       allowed; all other are treated as parity errors when they are
*       read and stored as binary zero in memory.
*
* The punches in a tape frame were identified, highest to lowest order,
* as:
*
*       E X 0 C 8 4 2 1
*
* where E is the EOL punch and C is the "check" or odd-parity punch.
* Small tape-feed sprocket holes were present between the 8- and 4-punches,
* but these were not read.
*
* Regardless of the format of a tape image file, tapes could be read in
* numeric, alphanumeric, or binary modes. Binary mode requires the 1620
* "Binary Capabilities" option. To support this, all tape image files
* are handled internally as 8-bit binary tape frames.
*
* The reader allows multiple tape image file to be loaded to its internal
* buffer. Once loaded, however, the image files are treated as if they
* had been spliced, and are treated as one continugous tape.
*
************************************************************************
* 2024-04-25  P.Kimpel
*   Original version, from Typewriter.js.
***********************************************************************/

export {PaperTapeReader};

import {Envir} from "../emulator/Envir.js";
import {Register} from "../emulator/Register.js";
import {Timer} from "../emulator/Timer.js";
import {openPopup} from "./PopupUtil.js";

class PaperTapeReader {

    // Static properties

    static charPeriod = 1000/150;       // ms per tape frame (character)
    static windowBottomOffset = 208;    // offset from bottom of window to bottom of screen
    static windowHeight = 80;           // window innerHeight, pixels
    static windowWidth = 575;           // window innerWidth, pixels

    static eolBits = 0b10000000;        // EOL hole pattern
    static eolGlyph = "<";              // EOL glyph in TapeView
    static invalidGlyph = "\xB7";       // invalid hole pattern glyph, B7 = mid-dot
    static tapeFeedBits = 0b01111111;   // tape-feed hole pattern
    static tapeFeedGlyph = "_";         // ASCII character for tape-feed

    static xlateASCIIToPTCode = {       // ASCII to 1620 paper-tape punch bits
           //  EX0C8421 tape channels
        "0": 0b00100000,
        "1": 0b00000001,
        "2": 0b00000010,
        "3": 0b00010011,
        "4": 0b00000100,
        "5": 0b00010101,
        "6": 0b00010110,
        "7": 0b00000111,
        "8": 0b00001000,
        "9": 0b00011001,
        "A": 0b01100001,
        "B": 0b01100010,
        "C": 0b01110011,
        "D": 0b01100100,
        "E": 0b01110101,
        "F": 0b01110110,
        "G": 0b01100111,
        "H": 0b01101000,
        "I": 0b01111001,
        "]": 0b01000000,        // -0 (flagged 0)
        "J": 0b01010001,
        "K": 0b01010010,
        "L": 0b01000011,
        "M": 0b01010100,
        "N": 0b01000101,
        "O": 0b01000110,
        "P": 0b01010111,
        "Q": 0b01011000,
        "R": 0b01001001,
        "S": 0b00110010,
        "T": 0b00100011,
        "U": 0b00110100,
        "V": 0b00100101,
        "W": 0b00100110,
        "X": 0b00110111,
        "Y": 0b00111000,
        "Z": 0b00101001,
        ".": 0b01101011,
        ")": 0b01111100,
        "*": 0b01001100,
        "$": 0b01011011,
        "(": 0b00101100,
        ",": 0b00111011,
        "|": 0b00101010,        // Record Mark
        "!": 0b01001010,        // flagged Record Mark
        "=": 0b00001011,
        "@": 0b00011100,
        "+": 0b01110000,
        "-": 0b01000000,
        " ": 0b00010000,
        "/": 0b00110001,
        "^": 0b00111110,        // "special" char
        "}": 0b00101111,        // Group Mark
        "\"":0b01001111,        // flagged Group Mark
     // Codes requiring special handling
     // "!": 0b01111010,        // alternate for flagged Record Mark
     // "<": 0b10000000,        // EOL (never read into memory)
     // "_": 0b01111111,        // tape-feed (ignored during non-binary read)
     // " ": 0b00000000,        // blank tape (alternate for tape-feed)
    };


    // Public Instance Properties

    buffer = null;                      // internal tape image buffer
    bufIndex = 0;                       // current index into buffer
    bufLength = 0;                      // current length of buffer
    doc = null;                         // window document object
    innerHeight = 0;                    // window specified innerHeight
    readFcn = null;                     // current read function, regular or binary
    tapeSupplyBar = null;               // input buffer meter bar
    tapeView = null;                    // tape characters view area
    tapeViewLength = 75;                // chars that will fit in the TapeView box
    timer = new Timer();                // delay management timer
    window = null;                      // window object
    xlatePTCodeToASCII = Array(256);    // translate binary hole patterns to ASCII


    constructor(context) {
        /* Initializes for the paper tape reader device. "context" is an object
        passing other objects and callback functions from the global script:
            config is the SystemConfig object
            processor is the Processor object
        */

        this.context = context;
        this.config = context.config;
        this.processor = context.processor;

        this.boundFileSelectorChange = this.fileSelectorChange.bind(this);
        this.boundNPROSwitchAction = this.NPROSwitchAction.bind(this);
        this.boundRead = this.read.bind(this);
        this.boundReadBinary = this.readBinary.bind(this);
        this.boundResizeWindow = this.resizeWindow.bind(this);

        // Create the reader window
        let geometry = this.config.formatWindowGeometry("PaperTapeReader");
        if (geometry.length) {
            [this.innerWidth, this.innerHeight, this.windowLeft, this.windowTop] =
                    this.config.getWindowGeometry("PaperTapeReader");
        } else {
            this.innerWidth  = PaperTapeReader.windowWidth;
            this.innerHeight = PaperTapeReader.windowHeight;
            this.windowLeft =  (screen.availWidth - PaperTapeReader.windowWidth)/2 - 8;
            this.windowTop =   screen.availHeight - PaperTapeReader.windowHeight - PaperTapeReader.windowBottomOffset;
            geometry = `,left=${this.windowLeft},top=${this.windowTop}` +
                       `,innerWidth=${this.innerWidth},innerHeight=${this.innerHeight}`;
        }

        openPopup(window, "../webUI/PaperTapeReader.html", "retro-1620.PaperTapeReader",
                "location=no,scrollbars,resizable" + geometry,
                this, this.readerOnLoad);

        this.clear();

        // Build the xlatePTCodeToASCII table from xlateASCIIToPTCode.
        this.xlatePTCodeToASCII.fill(null);
        for (let char in PaperTapeReader.xlateASCIIToPTCode) {
            this.xlatePTCodeToASCII[PaperTapeReader.xlateASCIIToPTCode[char]] = char;
        }

        // Alternate hole patterns.
        this.xlatePTCodeToASCII[0b01111010] = "!";      // alternate for flagged Record Mark

        // Codes requiring special handling in the Processor. These cause a
        // MBR parity error when read, per Germain, page 32.
        this.xlatePTCodeToASCII[0b00001110] = "\x11";  // DC1 => 842 punch, End Card 1
        this.xlatePTCodeToASCII[0b01011110] = "\x0D";  // CR  => XC842 punch, Carriage Return
    }

    /**************************************/
    $$(id) {
        /* Returns a DOM element from its id property. Must not be called until
        readerOnLoad is called */

        return this.doc.getElementById(id);
    }

    /**************************************/
    readerOnLoad(ev) {
        /* Initializes the reader window and user interface */
        const prefs = this.config.getNode("PaperTapeReader");

        this.doc = ev.target;           // now we can use this.$$()
        this.window = this.doc.defaultView;
        this.doc.title = "retro-1620 Paper Tape Reader";

        this.fileSelector = this.$$("FileSelector");
        this.tapeSupplyBar = this.$$("TapeSupplyBar");
        this.tapeView = this.$$("TapeView");

        // Events
        this.window.addEventListener("beforeunload", this.beforeUnload);
        this.window.addEventListener("resize", this.boundResizeWindow);
        this.$$("NPROSwitch").addEventListener("click", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").addEventListener("mousedown", this.boundNPROSwitchAction);
        this.$$("NPROSwitch").addEventListener("mouseup", this.boundNPROSwitchAction);
        this.fileSelector.addEventListener("change", this.boundFileSelectorChange);

        // Recalculate scaling and offsets after initial window resize.
        this.config.restoreWindowGeometry(this.window,
                this.innerWidth, this.innerHeight, this.windowLeft, this.windowTop);

        // Do offsetting window resizes after things calm down a bit to force
        // recalculation of the number of characters the TapeView box can display.
        this.tapeView.value = "_";
        setTimeout(() => {
            this.window.resizeBy(-8, 0);
            setTimeout(() => {
                this.window.resizeBy(8, 0);
                this.tapeView.value = " ";
            }, 500);
        }, 500);
    }

    /**************************************/
    clear() {
        /* Initializes (and if necessary, creates) the reader unit state */

        this.busy = false;              // an I/O is in progress
        this.inputReadyStamp = 0;       // timestamp when ready for next frame
    }

    /**************************************/
    cancel() {
        /* Cancels the I/O currently in process */

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
    resizeWindow(ev) {
        /* Handles the window onresize event. Calculates the width of the
        TapeView text box element in terms of characters of monospaced text so
        we'll know how  much text to show in the TapeView text box element
        without overflow (Chrome doesn't properly display text that exceeds the
        size of a right-justified text box). Adapted from:
        https://www.geeksforgeeks.org/calculate-the-width-of-the-text-in-javascript/ */
        const getCssStyle = (e, prop) => {
            return this.window.getComputedStyle(e, null).getPropertyValue(prop);
        }

        // Determine the current font properties for TapeView.
        const fontWeight = getCssStyle(this.tapeView, 'font-weight') || 'normal';
        const fontSize = getCssStyle(this.tapeView, 'font-size') || '12px';
        const fontFamily = getCssStyle(this.tapeView, 'font-family') || 'monospace';

        // Create a temporary Canvas element and set its font.
        const canvas = document.createElement("canvas");
        const dc = canvas.getContext("2d");
        const fontSpecs = `${fontWeight} ${fontSize} ${fontFamily}`;
        dc.font = fontSpecs;

        // Compute the width of some sample text and from that the number of
        // characters that will fit in the TapeView box.
        const sample = ("ABCDEFGHIJKLMNOPQRSTUVWXYZ.(+$*-/,(^=@ 0123456789|}");
        const textSpecs = dc.measureText(sample);
        const sampleWidth = textSpecs.width;
        this.tapeViewLength = Math.floor(sample.length/sampleWidth*this.tapeView.clientWidth);
        //console.debug("PTR Resize: font specs %s, sample length %i / width %f * TV width %i = TVLength %i",
        //          fontSpecs, sample.length, sampleWidth, this.tapeView.clientWidth, this.tapeViewLength);
        if (this.tapeView.value.length > this.tapeViewLength) {
            this.tapeView.value = this.tapeView.value.slice(-this.tapeViewLength);
        }
    }

    /**************************************/
    async NPROSwitchAction(ev) {
        /* Handle the click event for the NPROSwitch. The reader must not be
        busy. The mousedown and mouse up events simply animate the button's
        appearance during a click */

        switch (ev.type) {
        case "mousedown":
            this.$$("NPROSwitch").classList.add("clicked");
            break;
        case "mouseup":
            this.$$("NPROSwitch").classList.remove("clicked");
            break;
        case "click":
            if (!this.busy) {
                let clearable = this.bufIndex >= this.bufLength;
                if (!clearable) {
                    const deltaHeight = Math.max(200 - this.window.innerHeight, 0);
                    const deltaWidth = Math.max(500 - this.window.innerWidth, 0);
                    const deltaTop = Math.min(screen.availHeight -
                            (this.window.screenY + this.window.outerHeight + deltaHeight), 0);
                    this.window.moveBy(0, deltaTop);
                    await this.timer.delayFor(100);     // give the window time to move
                    this.window.resizeBy(deltaWidth, deltaHeight);
                    clearable = this.window.confirm(
                             `${this.bufLength-this.bufIndex} of ${this.bufLength}` +
                             " characters remaining to read.\nDo you want to clear the input buffer?");
                    this.window.resizeBy(-deltaWidth, -deltaHeight);
                    await this.timer.delayFor(100);     // give the window time to resize
                    this.window.moveBy(0, -deltaTop);
                }

                if (clearable) {
                    this.buffer = null;
                    this.bufIndex = this.bufLength = 0;
                    this.fileSelector.value = null;     // reset the control
                    this.fileSelector.disabled = false;
                    this.tapeSupplyBar.value = 0;
                    this.tapeView.value = "";
                    this.clear();
                }
            }
            break;
        }
    }

    /**************************************/
    async fileSelectorChange(ev) {
        /* Handle the <input type=file> onchange event when files are selected. For each
        file, load it and add it to the input buffer of the reader */

        const prepareBuffer = (imageLength) => {
            /* Prepares this.buffer for more image data and assures that there
            is sufficient room by either (a) sliding any remaining bytes to the
            beginning of the array, or (b) if there is not room for the new data
            in the existing buffer, resizing it and moving any existing bytes to
            the beginning of the new array */
            let bufIndex = this.bufIndex;
            let bufLength = this.bufLength;

            if (bufIndex >= bufLength) {
                bufIndex = bufLength = 0;
            }

            const bufUsed = bufLength - bufIndex;
            if (!this.buffer) {
                this.buffer = new Uint8Array(imageLength);
                bufLength = 0;
            } else if (this.buffer.length - bufUsed < imageLength) {
                // Not enough room in the current buffer, so resize it
                const oldBuf = this.buffer;
                const oldLength = bufLength;
                bufLength = 0;
                this.buffer = new Uint8Array(bufUsed + imageLength);
                for (let x=bufIndex; x<oldLength; ++x) {
                    this.buffer[bufLength++] = oldBuf[x];
                }
            } else if (bufUsed > 0) {
                // Slide any remaining buffer down to make room for new image
                this.buffer.copyWithin(0, bufIndex, bufLength);
                bufLength -= bufIndex;
            }

            this.bufLength = bufLength;
            this.bufIndex = 0;
        };

        const binaryLoader = (arrayBuffer) => {
            /* Handle the onload event for an ArrayBuffer (binary) FileReader
            and load the binary hole patterns into this.buffer */
            const image = new Uint8Array(arrayBuffer);
            const imageLength = image.length;
            let bufLength = this.bufLength;

            prepareBuffer(imageLength);
            bufLength = this.bufLength;
            for (let x=0; x<imageLength; ++x) {
                this.buffer[bufLength++] = image[x];
            }

            this.bufLength = bufLength;
            this.tapeSupplyBar.max = bufLength;
            this.tapeSupplyBar.value = bufLength;
        };

        const textLoader = (image) => {
            /* Handle the onload event for a Text FileReader and load the text
            of the file into the buffer after converting it to binary hole
            patterns */
            const imageLength = image.length;

            prepareBuffer(imageLength);
            let bufLength = this.bufLength;
            let crFlag = false;
            for (const char of image) {
                const bits = PaperTapeReader.xlateASCIIToPTCode[char];
                if (bits !== undefined) {
                    this.buffer[bufLength++] = bits;
                } else {
                    switch (char) {
                    case "\n":          // new-line possibly preceded by a carriage return
                        if (crFlag) {
                            crFlag = false;     // EOL already handled
                        } else {
                            this.buffer[bufLength++] = PaperTapeReader.eolBits;
                        }
                        break;
                    case "\r":          // carriage return
                        crFlag = true;
                        this.buffer[bufLength++] = PaperTapeReader.eolBits;
                        break;
                    case "_":           // tape-feed code -- discard
                        crFlag = false;
                        break;
                    case Envir.glyphRecMark:        // \u2021
                        crFlag = false;
                        this.buffer[bufLength++] = PaperTapeReader.xlateASCIIToPTCode["|"];
                        break;
                    case Envir.glyphGroupMark:      // \u2262
                        crFlag = false;
                        this.buffer[bufLength++] = PaperTapeReader.xlateASCIIToPTCode["}"];
                        break;
                    default:            // unknown character -- store as a space with bad parity
                        crFlag = false;
                        this.buffer[bufLength++] = 0;
                        break;
                    }
                }
            }

            this.bufLength = bufLength;
            this.tapeSupplyBar.max = bufLength;
            this.tapeSupplyBar.value = bufLength;
        };

        // Outer block of FileSelectorChange.
        const loadAsText = this.$$("LoadAsTextCheck").checked;
        const fileList = ev.target.files;
        for (const file of fileList) {
            if (loadAsText) {
                textLoader(await file.text());
            } else {
                binaryLoader(await file.arrayBuffer());
            }
        }

        // Once all of the files are loaded, check if reader should be restarted.
        if (this.busy && this.readFcn) {        // a read was in progress
            this.processor.gateREAD_INTERLOCK.value = 0;
            this.readFcn();                     // so restart the read
        }
    }

    /**************************************/
    async read() {
        /* Reads one record from the buffer in numeric/alphanumeric mode,
        converting the hole patterns to ASCII characters and sending them to
        Processor. Reads until an EOL frame or the end of the tape buffer is
        encountered. If an attempt is made to read past the end of the buffer,
        the I/O is left hanging */
        let bufLength = this.bufLength; // current buffer length
        let eol = false;                // end-of-record flag
        let nextFrameStamp = 0;         // timestamp when next frame can be read
        let x = this.bufIndex;          // current buffer index

        do {
            const now = performance.now();
            const delay = nextFrameStamp - now;
            if (delay < 0) {
                nextFrameStamp = now + PaperTapeReader.charPeriod;
            } else {
                nextFrameStamp += PaperTapeReader.charPeriod;
                if (delay > Timer.minTimeout) {
                    await this.timer.delayFor(delay);
                }
            }

            if (!this.busy) {           // check for a release
                break;
            }

            if (x >= bufLength) {       // end of buffer
                this.processor.gateREAD_INTERLOCK.value = 1;
                eol = true;             // just quit and leave the I/O hanging
            } else {
                let code = this.buffer[x];
                let char = this.xlatePTCodeToASCII[code];
                if (char) {
                    this.processor.receivePaperTapeFrame(char, false);
                } else if (code == PaperTapeReader.eolBits) {
                    eol = true;
                    char = PaperTapeReader.eolGlyph;
                    this.processor.receivePaperTapeFrame("", true);
                } else if (code == 0 || code == PaperTapeReader.tapeFeedBits) {
                    char = PaperTapeReader.tapeFeedGlyph;       // tape-feed: ignore this frame
                } else {
                    char = PaperTapeReader.invalidGlyph;        // invalid hole pattern
                    this.processor.receivePaperTapeFrame(char, false);
                }

                ++x;
                this.tapeSupplyBar.value = bufLength-x;
                this.tapeView.value = this.tapeView.value.slice(-this.tapeViewLength+1) + char;
            }
        } while (!eol);

        this.bufIndex = x;
        if (x >= bufLength) {                   // end of buffer
            this.buffer = null;                 // deallocate the buffer
            this.fileSelector.disabled = false;
            this.fileSelector.value = null;     // reset the control so onChange will work
        }
    }

    /**************************************/
    async readBinary() {
        /* Reads one record from the buffer in binary mode, storing the X08 bits
        as the first digit of a character and the 421 bits as the second digit,
        and sending the character to the Processor. Reads until an EOL frame or
        the end of the tape buffer is encountered. A frame with the EOL bit but
        with any of the X0C8421 bits is not treated as an EOL frame. If an attempt
        is made to read past the end of the buffer, the I/O is left hanging */
        let bufLength = this.bufLength; // current buffer length
        let eol = false;                // end-of-record flag
        let nextFrameStamp = 0;         // timestamp when next frame can be read
        let x = this.bufIndex;          // current buffer index

        do {
            const now = performance.now();
            const delay = nextFrameStamp - now;
            if (delay < 0) {
                nextFrameStamp = now + PaperTapeReader.charPeriod;
            } else {
                nextFrameStamp += PaperTapeReader.charPeriod;
                if (delay > Timer.minTimeout) {
                    await this.timer.delayFor(delay);
                }
            }

            if (!this.busy) {           // check for a release
                break;
            }

            if (x >= bufLength) {       // end of buffer
                this.processor.gateREAD_INTERLOCK.value = 1;
                eol = true;             // just quit and leave the I/O hanging
            } else {
                let code = this.buffer[x];
                let char = this.xlatePTCodeToASCII[code] ?? PaperTapeReader.invalidGlyph;
                if (code == PaperTapeReader.eolBits) {
                    eol = true;
                    char = PaperTapeReader.eolGlyph;
                    this.processor.receivePaperTapeBinary(0, true);
                } else if (code == 0) {
                    char = "";          // ignore and don't send to Processor
                } else {
                    if (code == PaperTapeReader.tapeFeedBits) {
                        char = PaperTapeReader.tapeFeedGlyph;
                    }
                    this.processor.receivePaperTapeBinary(code, false);
                }

                ++x;
                this.tapeSupplyBar.value = bufLength-x;
                if (this.tapeView.value.length < this.tapeViewLength) {
                    this.tapeView.value += char;
                } else {
                    this.tapeView.value =
                        this.tapeView.value.slice(-this.tapeViewLength+1) + char;
                }
            }
        } while (!eol);

        this.bufIndex = x;
        if (x >= bufLength) {                   // end of buffer
            this.buffer = null;                 // deallocate the buffer
            this.fileSelector.disabled = false;
            this.fileSelector.value = null;     // reset the control so onChage will work
        }
    }

    /**************************************/
    initiateRead() {
        /* Called by Processor to prepare the device for regular input */

        this.busy = true;
        this.readFcn = this.boundRead;
        this.fileSelector.disabled = true;
        this.readFcn();
    }

    /**************************************/
    initiateReadBinary() {
        /* Called by Processor to prepare the device for binary input */

        this.busy = true;
        this.readFcn = this.boundReadBinary;
        this.fileSelector.disabled = true;
        this.readFcn();
    }

    /**************************************/
    release() {
        /* Called by Processor to indicate the device has been released */

        this.busy = false;
        this.readFcn = null;
        this.fileSelector.disabled = false;
    }

    /**************************************/
    manualRelease() {
        /* Called by Processor to indicate the device has been released manually */

        this.release();
    }

    /**************************************/
    shutDown() {
        /* Shuts down the device. If the window open failed and onLoad didn't
        run, do nothing because this.window, etc., didn't get initialized */

        if (this.window) {
            this.$$("NPROSwitch").removeEventListener("click", this.boundNPROSwitchAction);
            this.$$("NPROSwitch").removeEventListener("mousedown", this.boundNPROSwitchAction);
            this.$$("NPROSwitch").removeEventListener("mouseup", this.boundNPROSwitchAction);
            this.fileSelector.removeEventListener("change", this.boundFileSelectorChange);
            this.window.removeEventListener("resize", this.boundResizeWindow);
            this.window.removeEventListener("beforeunload", this.beforeUnload);

            this.config.putWindowGeometry(this.window, "PaperTapeReader");
            this.window.close();
        }
    }
} // class PaperTapeReader
