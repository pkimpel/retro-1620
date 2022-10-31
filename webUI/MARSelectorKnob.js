/***********************************************************************
* retro-1620/webUI MARSelectorKnob.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* JavaScript class module for the MAR Selector Knob console switch.
************************************************************************
* 2022-10-30  P.Kimpel
*   Original version, from retro-205 D205PanelUtil.js BlackControlKnob.
***********************************************************************/

export {MARSelectorKnob};

class MARSelectorKnob {

    const degrees = Math.PI/180;
    const fullCircle = 360*degrees;

    constructor(parent, id, initial, positions) {
        /* Constructor for the black control knob objects used within panels.
            parent      the containing DOM element; the control will be sized to fill
                        this element
            id          the DOM id for the knob element (i.e., its canvas)
            initial     the 0-relative index indicating the default position of the switch;
            positions   an array of objects with the following properties:
                angle       indicates the angular position (in degrees, where 0 is
                            straight up) of each of the knob's positions
                caption     a textual label for the position
        */

        this.position = 0;              // current knob position
        this.direction = 1;             // rotate knob clockwise(1), counter-clockwise(-1)
        this.positions = {};            // array of knob position objects
        for (item of positions) {
            this.positions.push({radians: item.angle*degrees, caption: item.caption});
        }

        // visible DOM element
        this.size = Math.min(parent.clientWidth, parent.clientHeight);
        this.element = document.createElement("canvas");
        this.element.id = id;
        this.element.height = this.size;
        this.element.width = this.size;
        this.element.className = MARSelectorKnob.className;
        parent.appendChild(this.element);

        this.set(initial);              // set to its initial position
    }

    /**************************************/
    MARSelectorKnob.prototype.addEventListener = function addEventListener(eventName, handler, useCapture) {
        /* Sets an event handler whenever the canvas element is clicked */

        this.element.addEventListener(eventName, handler, useCapture);
    }

    /**************************************/
    set(position) {
        /* Changes the visible state of the knob according to the position index */
        let dc = this.element.getContext("2d");
        let halfSize = Math.floor(this.size/2);
        let quarterSize = Math.floor(this.size/4);
        let silverSkirt;

        if (position < 0) {
            this.position = 0;
            this.direction = 1;
        } else if (position < this.positions.length) {
            this.position = position;
        } else {
            this.position = this.positions.length-1;
            this.direction = -1;
        }

        dc.save();
        dc.translate(halfSize+0.5, halfSize+0.5);   // move origin to the center

        dc.fillStyle = MARSelectorKnob.canvasColor;// fill in the panel background (aids antialiasing)
        dc.fillRect(-halfSize, -halfSize, this.size, this.size);

        silverSkirt = dc.createRadialGradient(0, 0, 1.0, 0, 0, 0.01);
        silverSkirt.addColorStop(0.5, "#FFF");
        silverSkirt.addColorStop(1, "#666");

        dc.beginPath();                             // draw the outer skirt of the knob
        dc.arc(0, 0, halfSize-1, 0, fullCircle, false);
        dc.fillStyle = silverSkirt;
        dc.fill();

        dc.beginPath();                             // draw the central knob
        dc.arc(0, 0, quarterSize, 0, fullCircle, false);
        dc.fillStyle = "#000";
        dc.fill();

        dc.beginPath();                             // draw the inset on top of the knob
        dc.arc(0, 0, quarterSize-4, 0, fullCircle, false);
        dc.fillStyle = "#333";
        dc.fill();

        dc.save();                                  // draw the knob indicator
        dc.rotate(this.positions[this.position].radians);
        dc.beginPath();
        dc.moveTo(0, 1-halfSize);
        dc.lineTo(-quarterSize/4, -halfSize+quarterSize/2);
        dc.lineTo(quarterSize/4, -halfSize+quarterSize/2);
        dc.closePath();
        dc.fillStyle = "#000";
        dc.fill();
        dc.restore();                               // undo the rotation
        dc.restore();                               // undo the translation
    }

    /**************************************/
    step() {
        /* Steps the knob to its next position. If it is at the last position, steps it
        to the first position */
        let position = this.position+this.direction;

        if (position < 0) {
            this.direction = 1;
            this.set(1);
        } else if (position < this.positions.length) {
            this.set(position);
        } else {
            this.direction = -1;
            this.set(this.positions.length-2);
        }
    }

} // class MARSelectorKnob


// Static class properties

    MARSelectorKnob.className = "selectorKnob";
    MARSelectorKnob.canvasColor = "transparent";
