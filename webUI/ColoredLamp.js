/***********************************************************************
* retro-1620/webUI ColoredLamp.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* JavaScript class module for larger, colored lamp panel objects.
************************************************************************
* 2022-07-19  P.Kimpel
*   Original version, from retro-g15 ColoredLamp.js.
***********************************************************************/

export {ColoredLamp}

class ColoredLamp {

    // Static class properties

    static lampLevels = 6;
    static topCaptionClass = "coloredLampTopCaption";
    static bottomCaptionClass = "coloredLampBottomCaption";
    static blinkRate = 500;             // ms

    // Instance variables

    state = 0;                          // current lamp state, 0=off
    topCaptionDiv = null;               // optional top caption element
    bottomCaptionDiv = null;            // optional bottom caption element
    blinking = false;                   // true when blinking
    blinkToken = 0;                     // setInterval token for blinking

    constructor(parent, x, y, id, caption, offClass, onClass) {
        /* Parameters:
            parent      the DOM container element for this lamp object.
            x & y       coordinates of the lamp within its containing element.
            id          the DOM id for the lamp object.
            caption     text to be displayed on the lamp
            offClass    CSS class name supplying the color of the lamp when it is off.
            onClass     CSS class name supplying the color of the lamp when it is fully lit */

        this.lampClass = offClass;          // css styling for an "off" lamp
        this.litClass =                     // css styling for an "on" lamp
                    `${offClass} ${onClass}`;
        this.levelClass = [                 // css class names for the lamp levels
                offClass,
                this.litClass + "1",
                this.litClass + "2",
                this.litClass + "3",
                this.litClass + "4",
                this.litClass + "5",
                this.litClass];

        // visible DOM element
        this.element = document.createElement("button");
        this.element.id = id;
        this.element.className = offClass;
        this.element.innerHTML = caption;
        if (x !== null) {
            this.element.style.left = x.toString() + "px";
        }
        if (y !== null) {
            this.element.style.top = y.toString() + "px";
        }

        if (parent) {
            parent.appendChild(this.element);
        }

        this.boundToggleBlink = this.toggleBlink.bind(this);
    }

    /**************************************/
    addEventListener(eventName, handler, useCapture) {
        /* Sets an event handler whenever the image element is clicked */

        this.element.addEventListener(eventName, handler, useCapture);
    }

    /**************************************/
    set(state) {
        /* Changes the visible state of the lamp according to the value of "state", 0-1 */
        let newState = Math.max(Math.min(Math.round(state*ColoredLamp.lampLevels + 0.4999),
                                         ColoredLamp.lampLevels), 0);

        if (this.blinking) {
            this.blink(false);
        }

        if (this.state != newState) {       // the state has changed
            this.state = newState;
            this.element.className = this.levelClass[newState];
        }
    }

    /**************************************/
    flip() {
        /* Complements the visible state of the lamp */

        this.set(ColoredLamp.lampLevels - this.state);
    }

    /**************************************/
    setCaption(caption, atBottom) {
        /* Establishes an optional caption at the top or bottom of a single lamp.
        Returns the caption element */
        let e = (atBottom ? this.bottomCaptionDiv : this.topCaptionDiv);

        if (e) {
            e.textContent = caption;
        } else {
            e = document.createElement("div");
            if (atBottom) {
                this.bottomCaptionDiv = e;
                e.className = ColoredLamp.bottomCaptionClass;
            } else {
                this.topCaptionDiv = e;
                e.className = ColoredLamp.topCaptionClass;
            }
            e.appendChild(document.createTextNode(caption));
            this.element.appendChild(e);
        }

        return e;
    }

    /**************************************/
    blink(onOff) {
        /* Turns lamp blinking on or off */

        if (onOff && !this.blinking) {
            this.blinking = true;
            this.blinkState = false;
            this.blinkToken = setInterval(this.boundToggleBlink, ColoredLamp.blinkRate);
        } else if (!onOff && this.blinking) {
            this.blinking = false;
            clearInterval(this.blinkToken);
            this.blinkToken = 0;
            this.element.className = this.levelClass[this.state];
        }
    }

    /**************************************/
    toggleBlink() {
        /* Toggles the state of the lamp when blinking */

        this.blinkState = !this.blinkState;
        if (this.blinkState) {
            this.element.className = this.litClass;
        } else {
            this.element.className = this.lampClass;
        }
    }

} // class ColoredLamp
