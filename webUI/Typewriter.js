/***********************************************************************
* retro-1620/webUI Typewriter.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* IBM 1620 Model 2 Emulator Console Selectric Typewriter device.
*
* Defines the typewriter keyboard and printer device.
*
************************************************************************
* 2022-12-09  P.Kimpel
*   Original version, from retro-g15 Typewriter.js and retro-220
*   B220ConsolePrinter.js.
***********************************************************************/

export {Typewriter};

import {Envir} from "../emulator/Envir.js";
import {Register} from "../emulator/Register.js";
import {Timer} from "../emulator/Timer.js";
import {openPopup} from "./PopupUtil.js";

class Typewriter {

    constructor(context) {
        /* Initializes and wires up events for the console typewriter device.
        "context" is an object passing other objects and callback functions from
        the global script:
            config is the SystemConfig object
            processor is the Processor object
        */
        const h = 240;
        const w = 660;

        this.context = context;
        this.config = context.config;
        this.processor = context.processor;
        this.paper = null;                      // the output canvas
        this.platen = null;                     // the scrolling area

        this.marginLeft = 0;                    // left margin indent
        this.marginRight = Typewriter.maxCols;  // right margin stop
        this.printerCol = 0;                    // current print position
        this.scrollLines = 0;                   // lines in scroll buffer
        this.flagPending = false;               // FLG key has been pressed, awaiting next char
        this.tabStops = [];                     // tab stop columns
        this.timer = new Timer();

        this.boundKeydown = this.keydown.bind(this);
        this.boundResizeWindow = this.resizeWindow.bind(this);
        this.boundUnloadPaperClick = this.unloadPaperClick.bind(this);
        this.boundTextOnChange = this.textOnChange.bind(this);

        // Create the Typewriter window
        this.doc = null;
        this.window = null;
        openPopup(window, "../webUI/Typewriter.html", "Typewriter",
                `location=no,scrollbars,resizable,width=${w},height=${h}` +
                    `,top=${screen.availHeight-h},left=${screen.availWidth-w}`,
                this, this.typewriterOnLoad);

        this.clear();
    }

    /**************************************/
    $$(id) {
        /* Returns a DOM element from its id property. Must not be called until
        typewriterOnLoad is called */

        return this.doc.getElementById(id);
    }

    /**************************************/
    clear() {
        /* Initializes (and if necessary, creates) the typewriter unit state */

        this.busy = false;              // an I/O is in progress
        this.canceled = false;          // current I/O canceled
        this.inputReady = true;         // typewriter is ready for input
        this.inputReadyStamp = 0;       // timestamp when ready for input
        this.lastUseStamp = 0;          // last I/O activity (for idle checking)
        this.outputReadyStamp = 0;      // timestamp when ready for output
        this.printerCol = 0;            // current printer column number
    }

    /**************************************/
    cancel() {
        /* Cancels the I/O currently in process. Since the keyboard
        generates input only when the user presses a key, there's nothing here
        to interrupt, so this routine does nothing useful. It exists only to
        satisfy the Processor's I/O cancelation interface */

        if (this.busy) {
            this.busy = false;
            //this.canceled = true;     // currently affects nothing
        }
    }

    /**************************************/
    beforeUnload(ev) {
        let msg = "Closing this window will make the device unusable.\n" +
                  "Suggest you stay on the page and minimize this window instead";

        ev.preventDefault();
        ev.returnValue = msg;
        return msg;
    }

    /**************************************/
    resizeWindow(ev) {
        /* Handles the window onresize event by scrolling the "paper" so it remains at the end */

        this.platen.scrollTop = this.platen.scrollHeight;
    }

    /**************************************/
    typewriterOnLoad(ev) {
        /* Initializes the Typewriter window and user interface */
        let prefs = this.config.getNode("Typewriter");

        this.doc = ev.target;
        this.window = this.doc.defaultView;
        this.doc.title = "retro-1620 Typewriter";
        this.paper = this.$$("Paper");
        this.platen = this.$$("PrinterPlaten");
        this.setPaperEmpty();

        this.$$("MarginLeft").value = this.marginLeft = prefs.marginLeft;
        this.$$("MarginRight").value = this.marginRight = prefs.marginRight;

        let tabStops = this.parseTabStops(prefs.tabs || "", this.window);
        if (tabStops !== null) {
            this.tabStops = tabStops;
            this.$$("TabStops").value = this.formatTabStops(tabStops);
        }

        this.setPaperEmpty();

        // Events
        this.window.addEventListener("beforeunload", this.beforeUnload, false);
        this.window.addEventListener("resize", this.boundResizeWindow, false);
        this.paper.addEventListener("dblclick", this.boundUnloadPaperClick, false);
        this.window.addEventListener("keydown", this.boundKeydown, false);
        this.$$("FormatControlsDiv").addEventListener("change", this.boundTextOnChange);
    }


    /*******************************************************************
    *  Typewriter Input                                                *
    *******************************************************************/

    /**************************************/
    enableInput() {
        /* Called by Processor to prepare the device for input */

        this.window.focus();
    }

    /**************************************/
    indicateKeyboardLock() {
        /* Temporarily flashes the cursor character to indicate the keyboard
        is locked */
        const paper = this.paper;

        paper.lastChild.nodeValue =
                paper.lastChild.nodeValue.slice(0, -1) + Typewriter.lockoutChar;
        setTimeout(() => {
            paper.lastChild.nodeValue =
                    paper.lastChild.nodeValue.slice(0, -1) + Typewriter.cursorChar;
        }, Typewriter.lockoutFlashTime);
    }

    /**************************************/
    async resetFlagPending(key) {
        /* If this.flagPending is set, supplies the character to be flagged,
        reinstates the cursor, and resets this.flagPending */

        if (this.flagPending) {
            this.flagPending = false;
            let lastChild = this.paper.lastChild;       // should be the cursor char
            if (lastChild && lastChild.nodeType == Node.TEXT_NODE) {
                lastChild.nodeValue += Typewriter.cursorChar;   // reinstate the cursor
                let priorChild = lastChild.previousSibling;     // should be the <span>
                if (priorChild && priorChild.nodeType == Node.ELEMENT_NODE) {
                    priorChild.textContent = key;       // fill in the current keystroke under the flag
                } else {
                    await this.printChar(key, false, false);
                }
            } else {
                await this.printChar(key, false, false);
            }
        }
    }

    /**************************************/
    async keydown(ev) {
        /* Handles the keydown event from Typewriter window. Processes data
        input from the keyboard and sends it to Processor.receiveKeystroke().
        This routine always sends the keystroke without regard to the state of
        things in the Processor at the moment. receiveKeystroke will decide if
        the keystroke can be accepted or the keyboard is locked. The parameter
        to receiveKeystroke is:
            (>=0) the ASCII code for the key pressed.
            (-1) indicates the R/S (Enter) key was pressed.
            (-2) indicates the CORR (Backspace) key was pressed.
            (-3) indicates the FLG (` [grave accent] or ~ [tilde] key was pressed.
            (-4) indicates the INSERT (ESC) key was pressed (reply=0).
        The receiveKeystroke method returns:
            0 if the keystroke is to be ignored and not echoed (keyboard locked).
            (-1) if an R/S code is accepted and should be echoed to the paper.
            (-2) if a CORR code is accepted and should be printed.
            (-3) if a FLG code is accepted and a flagged echo should be set up.
            (-4) if an INSERT key is accepted (no action taken).
            otherwise, the 1620 internal code for the character to be echoed.
        Note that keystrokes are normally processed on keyup, but with a typewriter,
        when you pressed the key, you got the action. Hence, the processing of
        keystrokes on keydown */
        let key = ev.key;               // string representation of keystroke
        let code = 0;                   // code to be sent to the processor

        if (ev.ctrlKey || ev.altKey || ev.metaKey) {
            return;                     // ignore this keystroke, allow default action
        }

        switch (key) {
        case "Enter":                   // treat as the R/S key
            ev.preventDefault();
            code = -1;
            // Print R/S unconditionally now to avoid a time race with the Processor.
            await this.resetFlagPending(" ");
            await this.printChar(Typewriter.RSChar, false, false);
            break;
        case "Backspace":               // treat as the CORR key
            ev.preventDefault();
            code = -2;
            break;
        case "`":                       // treat both as the FLG key
        case "~":
            ev.preventDefault();
            code = -3;
            break;
        case "Escape":                  // treat as the INSERT key
            ev.preventDefault();
            code = -4;
            break;
        case "|":                       // treat both as the record mark key
        case "\\":
            ev.preventDefault();
            code = key.charCodeAt(0);
            key = Envir.glyphRecMark;           // echo the correct glyph
            break;
        default:                        // all other keys
            if (key.length > 1) {
                return;                         // all special and control keys just do their thing
            } else {
                ev.preventDefault();
                code = key.toUpperCase().charCodeAt(0);
            }
            break;
        }

        if (code) {
            let reply = this.processor.receiveKeystroke(code);
            switch (reply) {
            case 0:                     // ignore keystroke, flash the cursor
                this.indicateKeyboardLock();
                break;
            case -1:                    // R/S key, echo is handled above
                break;
            case -2:                    // CORR key, print a struck-through space
                await this.resetFlagPending(" ");
                await this.printChar(" ", false, true);
                break;
            case -3:                    // FLG key, print a flagged space as a placeholder
                if (!this.flagPending) {
                    this.flagPending = true;
                    await this.printChar(Typewriter.cursorChar, true, false);
                    // Temporarily get rid of the cursor char after the flagged cursor.
                    this.paper.lastChild.nodeValue = this.paper.lastChild.nodeValue.slice(0, -1);
                }
                break;
            case -4:                    // INSERT key, do nothing
                break;
            default:                    // echo the keystroke
                if (this.flagPending) {
                    await this.resetFlagPending(key);
                } else {
                    await this.printChar(key, false, false);
                }
                break;
            }
        }
    }


    /*******************************************************************
    *  Typewriter Output                                               *
    *******************************************************************/

    /**************************************/
    setPaperEmpty() {
        /* Empties the printer output "paper" and initializes it for new output */

        // Replace the current paper content with margin spaces and a cursor character.
        this.paper.textContent = (" ").repeat(this.marginLeft) + Typewriter.cursorChar;
        this.printerCol = this.marginLeft;
        this.scrollLines = 0;
        this.platen.scrollTop = this.platen.scrollHeight; // scroll to end
    }

    /**************************************/
    formatTabStops(tabStops) {
        /* Formats the array "tabStops" of 0-relative tab stop positions as a comma-
        delimited string of 1-relative numbers */
        let s = (tabStops[0]+1).toString();

        for (let x=1; x<tabStops.length; ++x) {
            s += "," + (tabStops[x]+1).toString();
        }

        return s;
    }

    /**************************************/
    parseTabStops(text, alertWin) {
        /* Parses a comma-delimited list of 1-relative tab stops. If the list is parsed
        successfully, returns an array of 0-relative tab stop positions; otherwise
        returns null. An alert is displayed on the window for the first parsing or
        out-of-sequence error */
        let copacetic = true;
        let tabStops = [];

        if (text.search(/\S/) >= 0) {
            let lastCol = 0;
            let cols = text.split(",");
            for (let item of cols) {
                let raw = item.trim();
                if (raw.length > 0) {       // ignore empty fields
                    let col = parseInt(raw, 10);
                    if (isNaN(col)) {
                        copacetic = false;
                        alertWin.alert(`Tab stop "${raw}" is not numeric`);
                        break; // out of for loop
                    } else if (col <= lastCol) {
                        copacetic = false;
                        alertWin.alert(`Tab stop "${raw}" is out of sequence`);
                        break; // out of for loop
                    } else {
                        lastCol = col;
                        tabStops.push(col-1);
                    }
                }
            } // for x
        }

        return (copacetic ? tabStops : null);
    }

    /**************************************/
    textOnChange(ev) {
        /* Handler for textbox onchange events */
        let box = ev.target;
        let prefs = this.config.getNode("Typewriter");
        let text = box.value;
        let v = null;

        switch (box.id) {
        case "MarginLeft":
            v = parseInt(text, 10);
            if (isNaN(v) || v < 0 || v > this.marginRight) {
                this.window.alert("Invalid left margin");
                box.value = this.marginLeft;
                box.focus();
                box.select();
            } else {
                box.value = this.marginLeft = prefs.marginLeft = v;
                this.config.putNode("Typewriter", prefs);
            }
            break;
        case "MarginRight":
            v = parseInt(text, 10);
            if (isNaN(v) || v <= this.marginLeft || v > Typewriter.maxCols) {
                this.window.alert("Invalid right margin");
                box.value = this.marginRight;
                box.focus();
                box.select();
            } else {
                box.value = this.marginRight = prefs.marginRight = v;
                this.config.putNode("Typewriter", prefs);
            }
            break;
        case "TabStops":
            v = this.parseTabStops(text || "", this.window);
            if (v === null) {
                box.value = this.formatTabStops(this.tabStops);
                box.focus();
                box.select();
            } else {
                this.tabStops = v;
                box.value = prefs.tabs = this.formatTabStops(v);
                this.config.putNode("Typewriter", prefs);
            }
            break;
        } // switch box.id

        ev.preventDefault();
        ev.stopPropagation();
    }

    /**************************************/
    async waitReadyOutput() {
        /* Delays until the typewriter is ready for output. This could include:
        (a) delay for motor startup if the unit is idle for more than 5 minutes.
        (b) delay for any continuing activity, such as printing element motion.
        Sets this.lastUseStamp to the new ready time and returns current time */
        let now = performance.now();

        // Wait for motor startup if idle.
        if (now - this.lastUseStamp > Typewriter.idlePeriod) {
            await this.timer.delayFor(Typewriter.idleStartupTime);
            now += Typewriter.idleStartuptime;
        }

        // Wait until pending activity completed.
        if (this.outputReadyStamp > now) {
            await this.timer.delayUntil(this.outputReadyStamp);
            now = this.outputReadyStamp;
        }

        this.lastUseStamp = now;
        return now;
    }

    /**************************************/
    async printNewLine() {
        /* Appends a newline to the current text node, and then a new text
        node to the end of the <pre> element within the paper element */
        let height = this.platen.scrollHeight;
        let paper = this.paper;
        let line = paper.lastChild.nodeValue;
        let positions = this.printerCol - this.marginLeft;

        // Remove old lines that have overflowed the buffer.
        while (this.scrollLines > Typewriter.maxScrollLines) {
            let child = paper.removeChild(paper.firstChild);
            if (child.nodeType = Node.TEXT_NODE) {
                // Count the node as a line only if it ends with a newline.
                if (child.nodeValue.at(-1) == "\n") {
                    --this.scrollLines;
                }
            }
        }

        let now = await this.waitReadyOutput();

        // Delay for the newline and printing element return time.
        this.outputReadyStamp = now +
                Math.max(Typewriter.returnInterlock, Typewriter.travelPeriod*positions);
        await this.timer.delayFor(Typewriter.returnInterlock);

        // Erase the cursor at end of the current line and output a newline.
        paper.lastChild.nodeValue = line.slice(0, -1) + "\n";

        // Output the margin spaces and new cursor character for the new line.
        paper.appendChild(this.doc.createTextNode(
                (" ").repeat(this.marginLeft) + Typewriter.cursorChar));
        this.printerCol = this.marginLeft;
        ++this.scrollLines;
        this.platen.scrollTop = height; // scroll to end
        return 1;                       // always returns end-of-block
    }

    /**************************************/
    async printChar(char, flag, strike) {
        /* Outputs the Unicode character "char" to the device.
        "flag" indicates the character should be printed with a flag.
        "strike" indicates the character should be printed with strike-through */
        let paper = this.paper;
        let span = null;

        // Check for right margin overflow and automatic newline.
        if (this.printerCol >= this.marginRight) {
            await this.printNewLine();
        }

        await this.waitReadyOutput();

        // Remove the existing cursor character from the line.
        let line = paper.lastChild.nodeValue.slice(0, -1);
        paper.lastChild.nodeValue = line;

        // If the character will be flagged or struck, create a blank <span>
        // element for it. If flagged, make the element visible with an
        // overline style.
        if (flag || strike) {
            span = this.doc.createElement("span");
            span.appendChild(this.doc.createTextNode(" "));
            if (flag) {                 // print the flag first
                span.className = "flag";
                paper.appendChild(span);
                // Delay for printing the flag and backspacing over it.
                await this.timer.delayFor(Typewriter.charPeriod*2);
            }
        }

        // If the character is not flagged or struck, just append the character
        // and new cursor to the line text.
        if (!(flag || strike)) {
            paper.lastChild.nodeValue = `${line}${char}${Typewriter.cursorChar}`;
        } else {
            // If the character is flagged or struck, set it in the span.
            span.textContent = char;
            // If the span hasn't been appended to the line yet, now's the time.
            if (!flag) {
                paper.appendChild(span);
            }
        }

        // Delay for one character time. Note that spaces are output slighty
        // faster, at about 35ms each.
        await this.timer.delayFor(char == " " ? Typewriter.spacePeriod : Typewriter.charPeriod);

        // If the character is flagged or struck, output the new cursor character
        // as a new text node.
        if (flag || strike) {
            paper.appendChild(this.doc.createTextNode(Typewriter.cursorChar));
        }

        // If the character is struck, backspace and set the style.
        if (strike) {
            await this.timer.delayFor(Typewriter.charPeriod);  // delay for backspace

            // Set the appropriate styling on the span and delay for its output.
            span.className = (flag ? "flagstrike" : "strike");
            await this.timer.delayFor(Typewriter.charPeriod);   // delay for revised output
        }

        ++this.printerCol;
        return 1;                       // always returns end-of-block
    }

    /**************************************/
    async printBackspace() {
        /* Backspaces the printing element one position. Presumably this was
        done so you could overprint, but we can't overprint on the web page
        (well, not without using Canvas or something like transparent,
        absolutely-position elements -- i.e., not easily). So we'll punt and
        just erase the last character printed.
        Note in the following that the last node of the paper is always a text
        node containing at least the cursor character at its end */

        await this.waitReadyOutput();
        if (this.printerCol > this.marginLeft) {
            let paper = this.paper;
            let node = paper.lastChild;
            let line = node.nodeValue;

            if (line.length > 1) {
                // If the node has at least two characters, we can trim the cursor
                // character and the one before it, then re-append the cursor.
                node.nodeValue = line.slice(0, -2) + Typewriter.cursorChar;
            } else if (paper.firstNode !== paper.lastNode) {
                // Otherwise, the node has just the cursor character, so unless
                // it's the only node, remove it and examine the prior node.
                let cursorOnly = paper.removeChild(node);
                let prior = paper.lastChild;
                switch (prior.nodeType) {
                case Node.ELEMENT_NODE:
                    // If the prior node is an element, assume the character to
                    // be backspaced is in a flag span, and just delete that node.
                    paper.removeChild(prior);
                    prior = paper.lastChild;
                    if (prior && prior.nodeType == Node.TEXT_NODE) {
                        // If the prior node is a text node, append the cursor char.
                        prior.nodeValue += Typewriter.cursorChar;
                    } else {
                       // If there is no node before the element or it's not a
                       // text node, just re-append the cursor-only node.
                       paper.appendChild(cursorOnly);
                    }
                    break;
                case Node.TEXT_NODE:
                    // If the prior node is a text node, just trim the last char
                    // and re-append the cursor char.
                    if (prior.nodeValue.length > 0) {
                        prior.nodeValue = prior.nodeValue.slice(0, -1);
                    }

                    prior.nodeValue += Typewriter.cursorChar;
                    break;
                default:
                    // The prior node is probably another flag span, so just
                    // append the cursor-only node.
                    paper.appendChild(cursorOnly);
                    break;
                }
            }

            --this.printerCol;
        }

        await this.timer.delayFor(Typewriter.defaultInterlock);
        return 1;                       // always returns end-of-block
    }

    /**************************************/
    async printIndex() {
        /* Indexes the platen one line without moving the printing element. We
        simulate this by emitting a newline, then padding the new line with
        spaces to the original print position */
        let height = this.platen.scrollHeight;
        let position = this.printerCol;
        let paper = this.paper;

        let now = await this.waitReadyOutput();

        // Erase the cursor at end of the current line and output a newline.
        paper.lastChild.nodeValue = paper.lastChild.nodeValue.slice(0, -1) + "\n";

        // Output the position spacing and new cursor characater
        paper.appendChild(this.doc.createTextNode(
                (" ").repeat(position) + Typewriter.cursorChar));
        ++this.scrollLines;

        // Delay for the index interlock time.
        await this.timer.delayFor(Typewriter.indexInterlock);
        this.platen.scrollTop = height; // scroll to end
        return 1;                       // always returns end-of-block
    }

    /**************************************/
    async printTab() {
        /* Simulates tabulation by inserting an appropriate number of spaces */
        let line = this.paper.lastChild.nodeValue.slice(0, -1);
        let tabCol = this.marginRight+1; // tabulation defaults to right margin

        for (let stop of this.tabStops) {
            if (this.printerCol < stop) {
                if (stop < tabCol) {
                    tabCol = stop;
                }
                break; // out of for loop
            }
        }

        let now = await this.waitReadyOutput();

        // Output the necessary spacing to the tab stop.
        let positions = tabCol - this.printerCol;
        this.paper.lastChild.nodeValue =
                `${line}${(" ").repeat(positions)}${Typewriter.cursorChar}`;
        this.printerCol = tabCol;

        // Delay for the travel time.
        this.outputReadyStamp = now +
                Typewriter.defaultInterlock + Typewriter.travelPeriod*positions;
        await this.timer.delayFor(Typewriter.defaultInterlock);
        return 1;                       // always returns end-of-block
    }

    /**************************************/
    dumpNumeric(code) {
        /* Writes one digit to the typewriter. This should be used directly by
        Dump Numerically. Returns a Promise for completion */
        let digit = code & Register.digitMask;

        return this.printChar(Typewriter.numericGlyphs[digit & Register.bcdMask],
                (digit & Register.flagMask), (Envir.oddParity5[digit] != digit));
    }

    /**************************************/
    writeAlpha(digitPair) {
        /* Writes one even/odd digit pair to the typewriter. This should be used
        directly by Write Alphanumerically. Returns a Promise for completion */
        let even = (digitPair >> Register.digitBits) & Register.digitMask;
        let odd = digitPair & Register.digitMask;

        let code = (even & Register.bcdMask)*16 + (odd & Register.bcdMask);
        return this.printChar(Typewriter.alphaGlyphs[code],
                false, (Envir.oddParity5[even] != even || Envir.oddParity5[odd] != odd));
    }

    /**************************************/
    writeNumeric(digit) {
        /* Writes one digit to the typewriter, suppressing some undigit codes.
        This should be used directly by Write Numerically. Returns a Promise
        for completion */

        if (digit & Register.flagMask) {
            switch (digit & Register.bcdMask) {
            case Envir.numRecMark:
            case Envir.numBlank:
            case Envir.numGroupMark:
                return;     // don't output these chars at all unless DN op
                break;
            }
        }

        return this.dumpNumeric(digit);
    }

    /**************************************/
    control(code) {
        /* Performs control functions for the typewriter. "code" is the 2-digit
        contents of MBR in I-6 (the Q10/Q11 digits of the instruction. Only the
        Q11 digit is used here. This should be used directly by Control.
        Returns a Promise for completion */

        switch (code & Register.bcdMask) {
        case 1:         // output a space
            return this.printChar(" ", false, false);
            break;
        case 2:         // return typing element
            return this.printNewLine();
            break;
        case 3:         // backspace typing element
            return this.printBackspace();
            break;
        case 4:         // index platen one line
            return this.printIndex();
            break;
        case 8:         // tabulate
            return this.printTab();
            break;
        }
    }

    /**************************************/
    copyPaper(ev) {
        /* Copies the text contents of the "paper" area of the device, opens a new
        temporary window, and pastes that text into the window so it can be copied
        or saved by the user */
        let text = this.paper.textContent;
        let title = "retro-g15 Typewriter Output";

        openPopup(this.window, "./FramePaper.html", "",
                "scrollbars,resizable,width=500,height=500",
                this, function(ev) {
            let doc = ev.target;
            let win = doc.defaultView;

            doc.title = title;
            win.moveTo((screen.availWidth-win.outerWidth)/2, (screen.availHeight-win.outerHeight)/2);
            doc.getElementById("Paper").textContent = text;
            this.setPaperEmpty();
        });
    }

    /**************************************/
    unloadPaperClick(ev) {
        /* Clears the internal scrp;; buffer in response to double-clicking
        the paper area */

        this.copyPaper();
        ev.preventDefault();
        ev.stopPropagation();
    }

    /**************************************/
    shutDown() {
        /* Shuts down the device. If the window open failed and onLoad didn't
        run, do nothing because this.window, etc., didn't get initialized */

        if (this.window) {
            this.$$("FormatControlsDiv").removeEventListener("change", this.boundTextOnChange);
            this.paper.removeEventListener("dblclick", this.boundUnloadPaperClick);
            this.window.removeEventListener("beforeunload", this.beforeUnload, false);
            this.window.removeEventListener("resize", this.boundResizeWindow, false);
            this.window.removeEventListener("keydown", this.boundKeydown, false);
            this.window.close();
        }
    }
}


// Static properties

Typewriter.cursorChar = "_";            // end-of-line cursor indicator
Typewriter.RSChar = "\u00A7";           // section symbol used for R/S
Typewriter.lockoutChar = "\u2592";

Typewriter.maxScrollLines = 10000;      // max lines retained in "paper" area
Typewriter.maxCols = 85;                // maximum number of columns per line
Typewriter.charPeriod = 1000/15.5;      // ms per non-space character
Typewriter.spacePeriod = 35;            // ms per space character
Typewriter.returnInterlock = 124;       // CPU interlock time for element return, ms
Typewriter.defaultInterlock = 56;       // CPU interlock time for tab/space/backspace, ms
Typewriter.indexInterlock = 124;        // CPU interlock time for indexing, ms
Typewriter.travelPeriod = 5.88;         // printing element travel time per position, ms
Typewriter.idlePeriod = 5*60000;        // typewriter motor turnoff delay, ms (5 minutes)
Typewriter.idleStartupTime = 500;       // typewriter idle startup time, ms
Typewriter.lockoutFlashTime = 150;      // keyboard lock flash time, ms
Typewriter.numericGlyphs = [
    "0", "1",  "2",  "3", "4", "5", "6", "7", "8", "9",
    Envir.glyphRecMark, Envir.glyphPillow, "@",  Envir.glyphPillow, Envir.glyphPillow, Envir.glyphGroupMark];

Typewriter.alphaGlyphs = [      // indexed as (even digit BCD)*16 + (odd digit BCD)
        " ",                    Envir.glyphPillow,      Envir.glyphPillow,      ".",                    // 00
        ")",                    Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 04
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphRecMark,     Envir.glyphPillow,      // 08
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphGroupMark,   // 0C
        "+",                    Envir.glyphPillow,      Envir.glyphPillow,      "$",                    // 10
        "*",                    Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 14
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 18
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 1C
        "-",                    "/",                    Envir.glyphPillow,      ",",                    // 20
        "(",                    Envir.glyphPillow,      "?",                    Envir.glyphPillow,      // 24
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 28
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 2C
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      "=",                    // 30
        "@",                    Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 34
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 38
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 3C
        Envir.glyphPillow,      "A",                    "B",                    "C",                    // 40
        "D",                    "E",                    "F",                    "G",                    // 44
        "H",                    "I",                    Envir.glyphPillow,      Envir.glyphPillow,      // 48
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 4C
        "-",                    "J",                    "K",                    "L",                    // 50
        "M",                    "N",                    "O",                    "P",                    // 54
        "Q",                    "R",                    null,                   Envir.glyphPillow,      // 58
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      null,                   // 5C
        Envir.glyphPillow,      Envir.glyphPillow,      "S",                    "T",                    // 60
        "U",                    "V",                    "W",                    "X",                    // 64
        "Y",                    "Z",                    Envir.glyphPillow,      Envir.glyphPillow,      // 68
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 6C
        "0",                    "1",                    "2",                    "3",                    // 70
        "4",                    "5",                    "6",                    "7",                    // 74
        "8",                    "9",                    Envir.glyphPillow,      Envir.glyphPillow,      // 78
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 7C
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 80
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 84
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 88
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 8C
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 90
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 94
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 98
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // 9C
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // A0
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // A4
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // A8
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // AC
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // B0
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // B4
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // B8
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // BC
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // C0
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // C4
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // C8
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // CC
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // D0
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // D4
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // D8
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // DC
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // E0
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // E4
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // E8
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // EC
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // F0
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // F4
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      // F8
        Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow,      Envir.glyphPillow];     // FC
