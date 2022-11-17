/***********************************************************************
* retro-1620/webUI PanelButton.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* JavaScript class module for large panel buttons. The button will
* subtly highlight when it is clicked and released. The click event can
* be captured either by calling this.addEventListener or by registering
* an event handler that captures events on the DOM element.
************************************************************************
* 2022-11-16  P.Kimpel
*   Original version, from ColoredLamp.js.
***********************************************************************/

export {PanelButton}

class PanelButton {

    constructor(parent, x, y, id, caption, upClass, downClass) {
        /* Parameters:
            parent      the DOM container element for this button object.
            x & y       coordinates of the button within its containing element.
            id          the DOM id for the button object.
            caption     text to be displayed on the button.
            upClass     CSS class name for the button in its normal state (up).
            downClass   CSS class name for the button in its clicked state (down) */

        this.topCaptionDiv = null;          // optional top caption element
        this.bottomCaptionDiv = null;       // optional bottom caption element
        this.buttonUpClass = upClass;       // css styling for an "off" button
        this.buttonDownClass = downClass;   // css styling for an "on" button

        // visible DOM element
        this.element = document.createElement("button");
        this.element.id = id;
        this.element.className = upClass;
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

        this.element.addEventListener("mousedown", (ev) => {
            ev.target.classList.add(this.buttonDownClass);
        }, false);
        this.element.addEventListener("mouseup", (ev) => {
            ev.target.classList.remove(this.buttonDownClass);
        }, false);
    }

    /**************************************/
    addEventListener(eventName, handler, useCapture) {
        /* Sets an event handler whenever the image element is clicked */

        this.element.addEventListener(eventName, handler, useCapture);
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
                e.className = PanelButton.bottomCaptionClass;
            } else {
                this.topCaptionDiv = e;
                e.className = PanelButton.topCaptionClass;
            }
            e.appendChild(document.createTextNode(caption));
            this.element.appendChild(e);
        }
        return e;
    }

} // class PanelButton


// Static class properties

PanelButton.topCaptionClass = "coloredLampTopCaption";
PanelButton.bottomCaptionClass = "coloredLampBottomCaption";
