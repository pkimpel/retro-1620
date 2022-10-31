/***********************************************************************
* retro-1620/webUI GateLamp.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* JavaScript class module for incandescent lamp panel objects.
************************************************************************
* 2022-07-19  P.Kimpel
*   Original version, from retro-g15 NeonLamp.js.
***********************************************************************/

export {GateLamp};

class GateLamp {

    constructor(parent, x, y, id) {
        /* Parameters:
            parent      the DOM container element for this lamp object.
            x & y       coordinates of the lamp within its containing element.
            id          the DOM id for the lamp object */

        this.state = 0;                     // current lamp state, 0=off
        this.topCaptionDiv = null;          // optional top caption element
        this.bottomCaptionDiv = null;       // optional bottom caption element

        // visible DOM element
        this.element = document.createElement("div");
        this.element.id = id;
        this.element.className = GateLamp.lampClass;
        if (x !== null) {
            this.element.style.left = x.toString() + "px";
        }
        if (y !== null) {
            this.element.style.top = y.toString() + "px";
        }

        if (parent) {
            parent.appendChild(this.element);
        }
    }

    /**************************************/
    addEventListener(eventName, handler, useCapture) {
        /* Sets an event handler whenever the image element is clicked */

        this.element.addEventListener(eventName, handler, useCapture);
    }

    /**************************************/
    set(state) {
        /* Changes the visible state of the lamp according to the value of "state", 0-1 */
        let newState = Math.max(Math.min(Math.round(state*GateLamp.lampLevels + 0.4999),
                                         GateLamp.lampLevels), 0);

        if (this.state ^ newState) {         // the state has changed
            this.state = newState;
            this.element.className = GateLamp.levelClass[newState];
        }
    }

    /**************************************/
    flip() {
        /* Complements the visible state of the lamp */

        this.set(1.0 - this.state/GateLamp.lampLevels);
    }

    /**************************************/
    setCaption(caption, atBottom) {
        /* Establishes an optional caption at the top or bottom of a single lamp.
        NOTE that the caption is treated as HTML! Returns the caption element */
        let e = (atBottom ? this.bottomCaptionDiv : this.topCaptionDiv);

        if (!e) {
            e = document.createElement("div");
            if (atBottom) {
                this.bottomCaptionDiv = e;
                e.className = GateLamp.bottomCaptionClass;
            } else {
                this.topCaptionDiv = e;
                e.className = GateLamp.topCaptionClass;
            }
            this.element.appendChild(e);
        }

        e.innerHTML = caption;
        return e;
    }

} // class GateLamp


// Static class properties

GateLamp.topCaptionClass = "gateLampTopCaption";
GateLamp.bottomCaptionClass = "gateLampBottomCaption";
GateLamp.lampClass = "gateLamp";
GateLamp.litClass = "gateLamp gateLit";
GateLamp.lampLevels = 6;
GateLamp.levelClass = [                 // CSS class names for the lamp levels
            GateLamp.lampClass,
            GateLamp.litClass + "1",
            GateLamp.litClass + "2",
            GateLamp.litClass + "3",
            GateLamp.litClass + "4",
            GateLamp.litClass + "5",
            GateLamp.litClass];
