/***********************************************************************
* retro-1620/webUI PaperTapePunch.js
************************************************************************
* Copyright (c) 2024, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* IBM 1624 Paper Tape Punch device.
*
* Defines the paper tape punch device. It is capable of writing
* 8-channel tape image files in two formats:
*   (1) Each tape frame is represented in the image file as one binary
*       byte. The low-order bit of the byte represents the 1-punch on a
*       tape, the high-order bit represents the EOL punch, which indicates
*       the end of a record.
*   (2) Each tape frame is represented in the image file as one ASCII or
*       Unicode character. Only characters valid for 1620 paper tape are
*       allowed; all other are treated as parity errors and are written
*       as a tape-feed frame.
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
* Regardless of the format of a tape image file, tapes can be written in
* numeric, alphanumeric, or binary modes. Binary mode requires the 1620
* "Binary Capabilities" option.
*
************************************************************************
* 2024-05-03  P.Kimpel
*   Original version, from PaperTapeReader.js.
***********************************************************************/

export {PaperTapePunch};

import {Envir} from "../emulator/Envir.js";
import {Register} from "../emulator/Register.js";
import {Timer} from "../emulator/Timer.js";
import {WaitSignal} from "../emulator/WaitSignal.js";
import {openPopup} from "./PopupUtil.js";

class PaperTapePunch {

    // Static properties

    static charPeriod = 1000/15;        // ms per tape frame (character)
    static windowBottomOffset = 0;      // offset from bottom of window to bottom of screen
    static windowHeight = 54;           // window innerHeight, pixels
    static windowWidth = 575;           // window innerWidth, pixels

    static bufferLimit = 119999;        // maximum number of frames that can be buffered (~2.25 hours worth)
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

    static xlateNumericToPTCode = [     // numeric BCD to paper-tape code
        0b00100000,     0b00000001,     0b00000010,     0b00010011,     // 0-3
        0b00000100,     0b00010101,     0b00010110,     0b00000111,     // 4-7
        0b00001000,     0b00011001,     0b00101010,     -1,             // 8-9, RM, ?
        0b00011100,     -1,             -1,             0b00101111,     // NB, ?, ?, GM
        0b01000000,     0b01010001,     0b01010010,     0b01000011,     // 0-3 (flagged)
        0b01010100,     0b01000101,     0b01000110,     0b01010111,     // 4-7 (flagged)
        0b01011000,     0b01001001,     0b00001011,     -1,             // 8-9, RM, ? (flagged)
        -1,             -1,             -1,             0b01001111];    // NB, ?, ?, GM (flagged)

    static xlateAlphaToPTCode = [       // alpha as (even-BCD*16 + odd-BCD) to paper-tape code
        0b00010000,     -1,             -1,             0b01101011,     // 00
        0b01111100,     -1,             -1,             -1,             // 04
        -1,             -1,             0b00101010,     -1,             // 08
        -1,             -1,             -1,             0b00101111,     // 0C
        0b01110000,     -1,             -1,             0b01011011,     // 10
        0b01001100,     -1,             -1,             -1,             // 14
        -1,             -1,             -1,             -1,             // 18
        -1,             -1,             -1,             -1,             // 1C
        0b01000000,     0b00110001,     -1,             0b00111011,     // 20
        0b00101100,     -1,             0b00111110,     -1,             // 24
        -1,             -1,             -1,             -1,             // 28
        -1,             -1,             -1,             -1,             // 2C
        -1,             -1,             -1,             0b00001011,     // 30
        0b00011100,     -1,             -1,             -1,             // 34
        -1,             -1,             -1,             -1,             // 38
        -1,             -1,             -1,             -1,             // 3C
        -1,             0b01100001,     0b01100010,     0b01110011,     // 40
        0b01100100,     0b01110101,     0b01110110,     0b01100111,     // 44
        0b01101000,     0b01111001,     -1,             -1,             // 48
        -1,             -1,             -1,             -1,             // 4C
        0b01000000,     0b01010001,     0b01010010,     0b01000011,     // 50
        0b01010100,     0b01000101,     0b01000110,     0b01010111,     // 54
        0b01011000,     0b01001001,     -1,             -1,             // 58
        -1,             -1,             -1,             -1,             // 5C
        -1,             -1,             0b00110010,     0b00100011,     // 60
        0b00110100,     0b00100101,     0b00100110,     0b00110111,     // 64
        0b00111000,     0b00101001,     -1,             -1,             // 68
        -1,             -1,             -1,             -1,             // 6C
        0b00100000,     0b00000001,     0b00000010,     0b00010011,     // 70
        0b00000100,     0b00010101,     0b00010110,     0b00000111,     // 74
        0b00001000,     0b00011001,     -1,             -1,             // 78
        -1,             -1,             -1,             -1,             // 7C
        -1,             -1,             -1,             -1,             // 80
        -1,             -1,             -1,             -1,             // 84
        -1,             -1,             -1,             -1,             // 88
        -1,             -1,             -1,             -1,             // 8C
        -1,             -1,             -1,             -1,             // 90
        -1,             -1,             -1,             -1,             // 94
        -1,             -1,             -1,             -1,             // 98
        -1,             -1,             -1,             -1,             // 9C
        -1,             -1,             -1,             -1,             // A0
        -1,             -1,             -1,             -1,             // A4
        -1,             -1,             -1,             -1,             // A8
        -1,             -1,             -1,             -1,             // AC
        -1,             -1,             -1,             -1,             // B0
        -1,             -1,             -1,             -1,             // B4
        -1,             -1,             -1,             -1,             // B8
        -1,             -1,             -1,             -1,             // BC
        -1,             -1,             -1,             -1,             // C0
        -1,             -1,             -1,             -1,             // C4
        -1,             -1,             -1,             -1,             // C8
        -1,             -1,             -1,             -1,             // CC
        -1,             -1,             -1,             -1,             // D0
        -1,             -1,             -1,             -1,             // D4
        -1,             -1,             -1,             -1,             // D8
        -1,             -1,             -1,             -1,             // DC
        -1,             -1,             -1,             -1,             // E0
        -1,             -1,             -1,             -1,             // E4
        -1,             -1,             -1,             -1,             // E8
        -1,             -1,             -1,             -1,             // EC
        -1,             -1,             -1,             -1,             // F0
        -1,             -1,             -1,             -1,             // F4
        -1,             -1,             -1,             -1,             // F8
        -1,             -1,             -1,             -1];            // FC


    // Public Instance Properties

    buffer = null;                      // internal tape image buffer
    bufIndex = 0;                       // current index into buffer
    doc = null;                         // window document object
    innerHeight = 0;                    // window specified innerHeight
    nextFrameStamp = 0;                 // timestamp when ready for next frame
    punchCheck = false;                 // true if a bad code was punched
    punchFeeding = false;               // true if Punch Feed switch is on
    tapeSupplyBar = null;               // input buffer meter bar
    tapeView = null;                    // tape characters view area
    tapeViewLength = 75;                // chars that will fit in the TapeView box
    timer = new Timer();                // delay management timer
    waitForBuffer = new WaitSignal();   // signal for manual tape-feed completion
    window = null;                      // window object
    xlatePTCodeToASCII = Array(256);    // translate binary hole patterns to ASCII


    constructor(context) {
        /* Initializes for the paper tape punch device. "context" is an object
        passing other objects and callback functions from the global script:
            config is the SystemConfig object
            processor is the Processor object
        */

        this.context = context;
        this.config = context.config;
        this.processor = context.processor;

        this.boundMenuClick = this.menuClick.bind(this);
        this.boundPunchFeedSwitchClick = this.punchFeedSwitchClick.bind(this);
        this.boundResizeWindow = this.resizeWindow.bind(this);

        // Allocate and extra punch buffer byte for a final EOL code.
        this.buffer = new Uint8Array(PaperTapePunch.bufferLimit+1);

        // Create the punch window
        let geometry = this.config.formatWindowGeometry("PaperTapePunch");
        if (geometry.length) {
            [this.innerWidth, this.innerHeight, this.windowLeft, this.windowTop] =
                    this.config.getWindowGeometry("PaperTapePunch");
        } else {
            this.innerWidth  = PaperTapePunch.windowWidth;
            this.innerHeight = PaperTapePunch.windowHeight;
            this.windowLeft =  (screen.availWidth - PaperTapePunch.windowWidth)/2 - 8;
            this.windowTop =   screen.availHeight - PaperTapePunch.windowHeight - PaperTapePunch.windowBottomOffset;
            geometry = `,left=${this.windowLeft},top=${this.windowTop}` +
                       `,innerWidth=${this.innerWidth},innerHeight=${this.innerHeight}`;
        }

        openPopup(window, "../webUI/PaperTapePunch.html", "retro-1620.PaperTapePunch",
                "location=no,scrollbars,resizable" + geometry,
                this, this.punchOnLoad);

        this.clear();

        // Build the xlatePTCodeToASCII table from xlateASCIIToPTCode.
        this.xlatePTCodeToASCII.fill(null);
        for (let char in PaperTapePunch.xlateASCIIToPTCode) {
            this.xlatePTCodeToASCII[PaperTapePunch.xlateASCIIToPTCode[char]] = char;
        }

        // Special/alternate hole patterns.
        this.xlatePTCodeToASCII[0b00000000] = " ";      // alternate for tape-feed (blank tape)
        this.xlatePTCodeToASCII[0b01111010] = "!";      // alternate for flagged Record Mark
        this.xlatePTCodeToASCII[0b01111111] = "_";      // tape-feed (ignored during non-binary read)
        this.xlatePTCodeToASCII[0b10000000] = "<";      // EOL (never read into memory)
    }

    /**************************************/
    $$(id) {
        /* Returns a DOM element from its id property. Must not be called until
        punchOnLoad is called */

        return this.doc.getElementById(id);
    }

    /**************************************/
    punchOnLoad(ev) {
        /* Initializes the punch window and user interface */
        const prefs = this.config.getNode("PaperTapePunch");

        this.doc = ev.target;           // now we can use this.$$()
        this.window = this.doc.defaultView;
        this.doc.title = "retro-1620 Paper Tape Punch";

        this.tapeSupplyBar = this.$$("TapeSupplyBar");
        this.tapeSupplyBar.max = PaperTapePunch.bufferLimit;
        this.tapeSupplyBar.value = PaperTapePunch.bufferLimit;
        this.tapeView = this.$$("TapeView");

        // Events
        this.window.addEventListener("beforeunload", this.beforeUnload);
        this.window.addEventListener("resize", this.boundResizeWindow);
        this.$$("PunchFeedSwitch").addEventListener("click", this.boundPunchFeedSwitchClick);
        this.$$("PunchMenuIcon").addEventListener("click", this.boundMenuClick);

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
        /* Initializes (and if necessary, creates) the punch unit state */

        this.busy = false;              // an I/O is in progress
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
        //console.debug("PTP Resize: font specs %s, sample length %i / width %f * TV width %i = TVLength %i",
        //          fontSpecs, sample.length, sampleWidth, this.tapeView.clientWidth, this.tapeViewLength);
        if (this.tapeView.value.length > this.tapeViewLength) {
            this.tapeView.value = this.tapeView.value.slice(-this.tapeViewLength);
        }
    }

    /**************************************/
    punchFeedSwitchClick(ev) {
        /* Handle the click event for the PunchFeedSwitch. The punch must not be
        ready and the input hopper must be empty. The mousedown and mouse up
        events simply animate the button's appearance during a click */
        const punchFeedSwitch = this.$$("PunchFeedSwitch");
        const switchOn = punchFeedSwitch.classList.contains("clicked");

        if (this.punchFeeding) {
            this.punchFeeding = false;
            punchFeedSwitch.classList.remove("clicked");
            if (this.busy) {                            // a write has initiated,
                this.waitForBuffer.signal(false);       // so resume the write
            }
        } else if (switchOn) {
            punchFeedSwitch.classList.remove("clicked");
        } else {
            punchFeedSwitch.classList.add("clicked");
            if (this.busy) {
                if (this.punchCheck) {
                    this.punchCheck = false;
                    if (this.bufIndex > 0) {
                        --this.bufIndex;                // overwrite the bad char with tape-feed
                        this.tapeView.value = this.tapeView.value.slice(0, -1);
                    }

                    this.punchFrame(PaperTapePunch.tapeFeedBits, false);
                    if (this.processor.paperTapeErrorHalt(false)) {
                        this.punchFrame(PaperTapePunch.eolBits, false); // was a binary write
                    }
                }
            } else if (this.bufIndex < PaperTapePunch.bufferLimit) {
                this.punchTapeFeed();
            }
        }
    }

    /**************************************/
    async punchTapeFeed(dx, dy) {
        /* Initiates and terminates punching tape-feed frames */

        this.punchFeeding = true;
        do {
            const now = performance.now();
            const delay = this.nextFrameStamp - now;
            if (delay < 0) {
                this.nextFrameStamp = now + PaperTapePunch.charPeriod;
            } else {
                this.nextFrameStamp += PaperTapePunch.charPeriod;
                if (delay > Timer.minTimeout) {
                    await this.timer.delayFor(delay);
                }
            }

            if (this.bufIndex >= PaperTapePunch.bufferLimit) {   // out of tape
                break;
            }

            this.punchFrame(PaperTapePunch.tapeFeedBits, false);
        } while (this.punchFeeding);
    }

    /**************************************/
    btoaUint8(bytes, start, end) {
        /* Converts a Uint8Array directly to base-64 encoding without using
        window.btoa and returns the base-64 string. "start" is the 0-relative
        index to the first byte; "end" is the 0-relative index to the ending
        byte + 1. Adapted from https://gist.github.com/jonleighton/958841 */
        let b64 = "";
        const byteLength = end - start;
        const remainderLength = byteLength % 3;
        const mainLength = byteLength - remainderLength;

        const encoding = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

        // Main loop deals with bytes in chunks of 3.
        for (let i=start; i<mainLength; i+=3) {
            // Combine the three bytes into a single integer.
            const chunk = (((bytes[i] << 8) | bytes[i+1]) << 8) | bytes[i+2];

            // Extract 6-bit segments from the triplet and convert to the ASCII encoding.
            b64 += encoding[(chunk & 0xFC0000) >> 18] +
                   encoding[(chunk &  0x3F000) >> 12] +
                   encoding[(chunk &    0xFC0) >>  6] +
                   encoding[chunk &      0x3F];
        }

        // Deal with any remaining bytes and padding.
        if (remainderLength == 1) {
           // Encode the high-order 6 and low-order 2 bits, and add padding.
           const chunk = bytes[mainLength];
           b64 += encoding[(chunk & 0xFC) >> 2] +
                  encoding[(chunk & 0x03) << 4] + "==";
        } else if (remainderLength == 2) {
           // Encode the high-order 6 bits of the first byte, plus the low-order
           // 2 bits of the first byte with the high-order 4 bits of the second
           // byte, and add padding.
           const chunk = (bytes[mainLength] << 8) | bytes[mainLength+1];
           b64 += encoding[(chunk & 0xFC00) >> 10] +
                  encoding[(chunk &  0x3F0) >> 4] +
                  encoding[(chunk &    0xF) << 2] + "=";
        }

        return b64;
    }

    /**************************************/
    extractPunch() {
        /* Copies the text contents of the punch buffer of the device, opens a
        new temporary window, and pastes that text into the window so it can be
        copied, printed, or saved by the user. All characters are ASCII according
        to the convention used by the 1620-Jr project */
        const title = "retro-1620 Paper Tape Punch Extract";

        const exportPunch = (ev) => {
            const doc = ev.target;
            const win = doc.defaultView;
            const content = doc.getElementById("Paper");
            let rec = "";
            let text = "";

            doc.title = title;
            win.moveTo((screen.availWidth-win.outerWidth)/2, (screen.availHeight-win.outerHeight)/2);

            for (let x=0; x<this.bufIndex; ++x) {
                const code = this.buffer[x];
                if (code == PaperTapePunch.eolBits) {
                    text += rec + "\n";
                    rec = "";
                } else {
                    rec += this.xlatePTCodeToASCII[code] ?? "?";
                }
            }

            content.textContent = text + rec;   // append any partial record without a new-line
        };

        if (this.bufIndex > 0) {
            openPopup(this.window, "./FramePaper.html", "",
                    "scrollbars,resizable,width=660,height=500",
                    this, exportPunch);
        }
    }

    /**************************************/
    savePunchASCII() {
        /* Extracts the contents of the punch buffer as an ASCII tape image,
        converts it to a DataURL, and constructs a link to cause the URL to be
        "downloaded" and stored on the local device. All characters are ASCII
        according to the convention used by the 1620-Jr project */
        const title = "retro-1620 Paper Tape Punch Output.pt.txt";

        if (this.bufIndex > 0) {
            let rec = "";
            let text = "";
            for (let x=0; x<this.bufIndex; ++x) {
                const code = this.buffer[x];
                if (code == PaperTapePunch.eolBits) {
                    text += rec + "\n";
                    rec = "";
                } else {
                    rec += this.xlatePTCodeToASCII[code] ?? "?";
                }
            }

            if (rec.length > 0) {       // append any partial record without a new-line
                text += rec;
            }

            const url = `data:text/plain,${encodeURIComponent(text)}`;
            const hiddenLink = this.doc.createElement("a");

            hiddenLink.setAttribute("download", title);
            hiddenLink.setAttribute("href", url);
            hiddenLink.click();
        }
    }

    /**************************************/
    savePunchBinary() {
        /* Extracts the contents of the punch buffer as binary tape image,
        converts it to a base64-encoded DataURL, and constructs a link to cause
        the URL to be "downloaded" and stored on the local device. All
        characters are ASCII according to the convention used by the 1620-Jr
        project */
        const title = "retro-1620 Paper Tape Punch Output.pt";

        if (this.bufIndex > 0) {
            const url = "data:application/octet-stream;base64," +
                        this.btoaUint8(this.buffer, 0, this.bufIndex);
            const hiddenLink = this.doc.createElement("a");

            hiddenLink.setAttribute("download", title);
            hiddenLink.setAttribute("href", url);
            hiddenLink.click();
        }
    }

    /**************************************/
    async clearPunchBuffer() {
        /* Clears the punch buffer. If the buffer is not empty, displays an
        alert first to confirm the action. If an I/O is paused due to a full
        buffer, resumes the I/O */
        let clearable = this.bufIndex == 0;

        if (!clearable) {
            const deltaHeight = Math.max(200 - this.window.innerHeight, 0);
            const deltaWidth = Math.max(500 - this.window.innerWidth, 0);
            const deltaTop = Math.min(screen.availHeight -
                    (this.window.screenY + this.window.outerHeight + deltaHeight), 0);
            this.window.moveBy(0, deltaTop);
            await this.timer.delayFor(100);     // give the window time to move
            this.window.resizeBy(deltaWidth, deltaHeight);
            clearable = this.window.confirm(this.bufIndex.toString() +
                     " frames of data are currently buffered.\nDo you want to discard the punch output?");
            this.window.resizeBy(-deltaWidth, -deltaHeight);
            await this.timer.delayFor(100);     // give the window time to resize
            this.window.moveBy(0, -deltaTop);
        }

        if (clearable) {
            this.bufIndex = 0;
            this.tapeSupplyBar.value = PaperTapePunch.bufferLimit;
            this.tapeView.value = "";
        }
    }

    /**************************************/
    menuOpen() {
        /* Opens the PaperTapePunch menu panel and wires up events */

        this.$$("PunchMenu").style.display = "block";
        this.$$("PunchMenu").addEventListener("click", this.boundMenuClick, false);
    }

    /**************************************/
    menuClose() {
        /* Closes the PaperTapePunch menu panel and disconnects events */

        this.$$("PunchMenu").removeEventListener("click", this.boundMenuClick, false);
        this.$$("PunchMenu").style.display = "none";
    }

    /**************************************/
    async menuClick(ev) {
        /* Handles click for the menu icon and menu panel */

        switch (ev.target.id) {
        case "PunchMenuIcon":
            this.menuOpen();
            break;
        case "PunchExtractBtn":
            this.extractPunch();
            break;
        case "PunchSaveASCIIBtn":
            this.savePunchASCII();
            break;
        case "PunchSaveBinaryBtn":
            this.savePunchBinary();
            break;
        case "PunchClearBtn":
            await this.clearPunchBuffer();
            //-no break -- clear always closes the panel
        case "PunchCloseBtn":
            this.menuClose();
            break;
        }
    }

    /**************************************/
    async punchFrame(ptCode, badCode) {
        /* Stores one frame to the punch buffer. If "ptCode" is negative,
        unconditionally stores an EOL frame (there will always be room).
        If an attempt is made to write past the end of the buffer is made,
        returns -1 and the I/O is left hanging. If "badCode" is true (a parity
        error or invalid character was received), returns 1 and the I/O is
        left hanging */
        let char = "";                  // TapeView character
        let eol = false;                // end-of-record flag
        let result = 0;                 // return code

        if (this.punchFeeding && this.busy) {
            if (await this.waitForBuffer.request()) {
                return 0;
            }
        }

        const now = performance.now();
        const delay = this.nextFrameStamp - now;
        if (delay < 0) {
            this.nextFrameStamp = now + PaperTapePunch.charPeriod;
        } else {
            this.nextFrameStamp += PaperTapePunch.charPeriod;
            if (delay > Timer.minTimeout) {
                await this.timer.delayFor(delay);
            }
        }

        if (ptCode < 0) {               // end of record
            this.buffer[this.bufIndex++] = PaperTapePunch.eolBits;
            char = PaperTapePunch.eolGlyph;
        } else if (badCode) {
            char = "?";
            this.punchCheck = true;     // parity error or invalid code
            this.processor.ioWriteCheck.value = 1;
            this.processor.paperTapeErrorHalt(true);
            result = 1;                 // just quit and leave the I/O hanging
        } else if (this.bufIndex >= PaperTapePunch.bufferLimit) {
            this.punchCheck = true;     // end of buffer
            this.processor.paperTapeErrorHalt(true);
            result = -1;                // just quit and leave the I/O hanging
        } else {                        // it's a valid hole pattern
            this.buffer[this.bufIndex++] = ptCode;
            char = this.xlatePTCodeToASCII[ptCode] ?? PaperTapePunch.invalidGlyph;
        }

        this.tapeSupplyBar.value = PaperTapePunch.bufferLimit - this.bufIndex;
        this.tapeView.value = this.tapeView.value.slice(-this.tapeViewLength+1) + char;
        return result;
    }

    /**************************************/
    dumpNumeric(code) {
        /* Writes one digit to the punch. This should be used directly by
        Dump Numerically. Returns a Promise for completion */

        if (code < 0) {
            return this.punchFrame(-1, false);
        } else {
            const digit = code & Register.notParityMask;
            const ptCode = PaperTapePunch.xlateNumericToPTCode[digit];
            const badCode = !((ptCode ?? false) && Envir.oddParity5[code] == code);
            return this.punchFrame(ptCode, badCode);
        }
    }

    /**************************************/
    writeNumeric(code) {
        /* Writes one digit to the punch. This should be used directly by
        Write Numerically. Returns a Promise for completion */

        if (code < 0) {
            return this.punchFrame(-1, false);
        } else {
            const digit = code & Register.notParityMask;
            const ptCode = PaperTapePunch.xlateNumericToPTCode[digit];
            const badCode = !((ptCode ?? false) && Envir.oddParity5[code] == code);
            return this.punchFrame(ptCode, badCode);
        }
    }

    /**************************************/
    writeAlpha(digitPair) {
        /* Writes one even/odd digit pair to the punch. This should be used
        directly by Write Alphanumerically. Returns a Promise for completion */

        if (digitPair < 0) {
            return this.punchFrame(-1, false);
        } else {
            const even = (digitPair >> Register.digitBits) & Register.digitMask;
            const odd = digitPair & Register.digitMask;
            const ptCode = PaperTapePunch.xlateAlphaToPTCode[even*16 + odd];
            const badCode = !((ptCode ?? false) &&
                    Envir.oddParity5[even] == even && Envir.oddParity5[odd] == odd);
            return this.punchFrame(ptCode, badCode);
        }
    }

    /**************************************/
    async writeBinary(digitPair) {
        /* Writes one even/odd pair to the punch in binary mode, combining the
        X08 bits from the first digit of a character with the the 421 bits of
        the second digit. Writes until a negative parameter is received */

        if (digitPair < 0) {
            return this.punchFrame(-1, false);
        } else {
            const even = (digitPair >> Register.digitBits) & 0x07;
            const odd = digitPair & 0x07;
            const check = ((~(Envir.oddParity5[even] ^ Envir.oddParity5[odd])) >> 5) & 1;
            const ptCode = (((even & 0b110) | check) << 4) | ((even & 1) << 3) | odd;
            return this.punchFrame(ptCode, false);
        }
    }

    /**************************************/
    initiateWrite() {
        /* Called by Processor to prepare the device for regular output */

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

        this.release();
        this.waitForBuffer.signal(true);
    }

    /**************************************/
    shutDown() {
        /* Shuts down the device. If the window open failed and onLoad didn't
        run, do nothing because this.window, etc., didn't get initialized */

        if (this.window) {
            this.$$("PunchMenuIcon").removeEventListener("click", this.boundMenuClick);
            this.$$("PunchFeedSwitch").removeEventListener("click", this.boundPunchFeedSwitchClick);
            this.window.removeEventListener("resize", this.boundResizeWindow);
            this.window.removeEventListener("beforeunload", this.beforeUnload);

            this.config.putWindowGeometry(this.window, "PaperTapePunch");
            this.window.close();
        }
    }
} // class PaperTapePunch
