/***********************************************************************
* retro-1620/webUI PanelRegister.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* JavaScript class module for arrays of GateLamp objects as registers.
************************************************************************
* 2022-10-25  P.Kimpel
*   Original version, from retro-205 webUI/D205PanelUtil.js.
***********************************************************************/

export {PanelRegister};

import {GateLamp} from "./GateLamp.js";

class PanelRegister {

    constructor(parent, digits, hasFlag, bottomRow, idPrefix) {
        /* Parameters:
            parent      the DOM element (usually a <div>) within which the register will be built.
            digits      number of digits in register.
            hasFlag     true if each digit has a flag bit: stored as CF8421 vs C08421.
            bottomRow   0-relative row index of the bottom row of the register.
            idPrefix    prefix string for the individual lamp ids */

        let cols = (hasFlag ? 6 : 5);
        let bits = digits*cols;

        this.element = parent;              // containing element for the panel
        this.digits = digits;               // number of digits in the register
        this.hasFlag = hasFlag;             // whether digits have a flag bit
        this.bits = bits;                   // number of bits in register
        this.lastValue = 0;                 // prior register value
        this.lamps = new Array(bits);       // bit lamps
        this.clientRect = parent.getBoundingClientRect();

        let cx = 0;
        let cy = (digits+bottomRow)*PanelRegister.vSpacing + PanelRegister.vOffset;
        for (let b=0; b<bits; b++) {
            if (b%cols == 0) {
                cx = this.clientRect.width - PanelRegister.hOffset - PanelRegister.lampDiameter;
                cy -= PanelRegister.vSpacing;
            } else {
                cx -= PanelRegister.hSpacing;
            }

            this.lamps[b] = new GateLamp(parent, cx, cy, idPrefix + b.toString());
        }
    }

    /**************************************/
    xCoord(col) {
        /* Returns the horizontal lamp coordinate in pixels */

        return ((col-1)*PanelRegister.hSpacing + PanelRegister.hOffset);
    }

    /**************************************/
    yCoord(row) {
        /* Returns the vertical lamp coordinate in pixels */

        return ((row-1)*PanelRegister.vSpacing + PanelRegister.vOffset);
    }

    /**************************************/
    panelWidth(cols) {
        /* Returns the width of a register panel in pixels */

        return (cols-1)*PanelRegister.hSpacing + PanelRegister.hOffset*2 + PanelRegister.lampDiameter;
    }

    /**************************************/
    panelHeight(rows) {
        /* Returns the height of a register panel in pixels */

        return (rows-1)*PanelRegister.vSpacing + PanelRegister.vOffset*2 + PanelRegister.lampDiameter;
    }

    /**************************************/
    drawBox(col, lamps, rows, leftStyle, rightStyle) {
        /* Creates a box centered around a specified group of lamps in a register.
        leftStyle and rightStyle specify the left and right borders of the box using
        standard CSS border syntax. Returns the box element */
        let box = document.createElement("div");
        let rightBias = (rightStyle ? 1 : 0);

        box.style.position = "absolute";
        box.style.left = (this.xCoord(col) - (PanelRegister.hSpacing-PanelRegister.lampDiameter)/2).toString() + "px";
        box.style.width = (PanelRegister.hSpacing*lamps - rightBias).toString() + "px";
        box.style.top = this.yCoord(1).toString() + "px";
        box.style.height = (this.yCoord(rows) - this.yCoord(1) + PanelRegister.lampDiameter).toString() + "px";
        box.style.borderLeft = leftStyle;
        box.style.borderRight = rightStyle;
        box.appendChild(document.createTextNode("\xA0"));
        this.element.appendChild(box);
        return box;
    }

    /**************************************/
    setBoxCaption(box, caption) {
        /* Establishes an optional caption for register lamp box.
        Returns the caption element */
        let e = box.captionDiv;

        if (e) {
            e.textContent = caption;
        } else {
            box.captionDiv = e = document.createElement("div");
            e.className = PanelRegister.boxCaptionClass;
            e.appendChild(document.createTextNode(caption));
            box.appendChild(e);
        }
        return e;
    }

    /**************************************/
    update(value) {
        /* Update the register lamps from the value of the parameter. This routine
        compares the value of the register that was previously updated against the new
        one in an attempt to minimize the number of lamp flips that need to be done */
        let lastValue = this.lastValue;
        let thisValue = Math.floor(Math.abs(value)) % 0x40000000;

        if (thisValue != lastValue) {
            let bitBase = 0;
            this.lastValue = thisValue;     // save it for next time

            do {
                // Loop through the masks 30 bits at a time so we can use Javascript bit ops
                let bitNr = bitBase;
                let lastMask = lastValue % 0x40000000;          // get the low-order 30 bits
                let thisMask = thisValue % 0x40000000;          // ditto for the second value
                lastValue = (lastValue-lastMask)/0x40000000;    // shift the value right 30 bits
                thisValue = (thisValue-thisMask)/0x40000000;

                lastMask ^= thisMask;       // determine which bits have changed
                while (lastMask) {
                    if (lastMask & 0x01) {
                        this.lamps[bitNr].set(thisMask & 0x01);
                    }
                    if (++bitNr <= this.bits) {
                        lastMask >>>= 1;
                        thisMask >>>= 1;
                    } else {
                        thisValue = thisMask = 0;
                        lastValue = lastMask = 0;
                        break;              // out of inner while loop
                    }
                }

                bitBase += 30;
            } while (thisValue || lastValue);
        }
    }

    /**************************************/
    updateLampGlow(glow) {
        /* Update the register lamps from the bitwise intensity values in "glow" */

        for (let bitNr=this.bits-1; bitNr>=0; --bitNr) {
            this.lamps[bitNr].set(glow[bitNr]);
        }
    }

} // class PanelRegister


// Static class properties

PanelRegister.hSpacing = 28;            // horizontal lamp spacing, pixels
PanelRegister.hOffset = 14;             // horizontal lamp offset within container
PanelRegister.vSpacing = 40;            // vertical lamp spacing, pixels
PanelRegister.vOffset = 74;             // vertical lamp offset within container
PanelRegister.lampDiameter = 18;        // lamp outer diameter including border ring, pixels
PanelRegister.panelClass = "panelRegister";
PanelRegister.captionClass = "panelRegCaption";
PanelRegister.captionSpanClass = "panelRegSpan";
PanelRegister.boxCaptionClass = "boxCaption";
