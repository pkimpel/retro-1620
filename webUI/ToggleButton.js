/***********************************************************************
* retro-1620/webUI ToggleButton.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* JavaScript class module for large, two-state (push-push) panel buttons.
* The button light when in the "on" on "set" state. The click event can
* be captured either by calling this.addEventListener or by registering
* an event handler that captures events on the DOM element. Note that a
* click by itself does not change the state -- that must be done by an
* event handler.
************************************************************************
* 2023-06-12  P.Kimpel
*   Original version, from PanelButton.js and ToggleSwitch.js.
***********************************************************************/

export {ToggleButton}

class ToggleButton {

    // Static class properties

    static topCaptilitClass = "coloredLampTopCaption";
    static bottomCaptilitClass = "coloredLampBottomCaption";


    constructor(parent, x, y, id, caption, offClass, litClass) {
        /* Parameters:
            parent      the DOM container element for this button object.
            x & y       coordinates of the button within its containing element.
            id          the DOM id for the button object.
            caption     text to be displayed on the button.
            offClass    path to image for the switch in the off state.
            litClass    path to the image for the switch in the on state */

        this.state = 0;                     // current switch state, 0=off
        this.topCaptionDiv = null;          // optional top caption element
        this.bottomCaptionDiv = null;       // optional bottom caption element
        this.offClass = offClass;           // image used for the off state
        this.litClass = litClass;           // image used for the on state

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
    }

    /**************************************/
    addEventListener(eventName, handler, options) {
        /* Sets an event handler on the button element */

        this.element.addEventListener(eventName, handler, options);
    }

    /**************************************/
    removeEventListener(eventName, handler, options) {
        /* Removes an event handler from the button element */

        this.element.removeEventListener(eventName, handler, options);
    }

    /**************************************/
    set(state) {
        /* Changes the visible state of the switch according to the low-order
        bit of "state" */
        let newState = state & 1;

        if (this.state ^ newState) {         // the state has changed
            this.state = newState;
            if (newState) {
                this.element.classList.add(this.litClass);
            } else {
                this.element.classList.remove(this.litClass);
            }
        }
    }

    /**************************************/
    flip() {
        /* Complements the visible state of the switch */

        this.set(this.state ^ 1);
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
                e.className = ToggleButton.bottomCaptilitClass;
            } else {
                this.topCaptionDiv = e;
                e.className = ToggleButton.topCaptilitClass;
            }
            e.appendChild(document.createTextNode(caption));
            this.element.appendChild(e);
        }
        return e;
    }

} // class ToggleButton
