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

    constructor(parent, id, initial, positions, captions) {
        /* Constructor for the black control knob objects used within panels.
            parent      the containing DOM element; the control will be sized to fill
                        this element
            id          the DOM id for the knob element (i.e., its canvas)
            initial     the 0-relative index indicating the default position of the switch;
            positions   an array of angles for the knob positions (in degrees, where 0 is
                            straight up)
            captions    an arrays of caption labels corresponding to each position
        */

        this.direction = 1;             // rotate knob clockwise(1), counter-clockwise(-1)
        this.parent = parent;           // the parent div
        this.position = 0;              // current knob position
        this.positions = [];            // knob position angles

        this.boundStep = this.step.bind(this);
        this.boundCaptionClick = this.captionClick.bind(this);
        this.changeListener = null;     // listener function to report knob changes -- only one allowed

        // visible DOM element
        this.size = parent.clientWidth;

        this.element = document.createElement("div");
        this.element.id = id;
        this.element.className = MARSelectorKnob.cupClassName;
        parent.appendChild(this.element);
        this.cupSize = this.element.clientWidth;

        this.canvas = document.createElement("canvas");
        this.canvas.height = this.cupSize;
        this.canvas.width = this.cupSize;
        this.canvas.className = MARSelectorKnob.className;
        this.element.appendChild(this.canvas);

        // Build the captions
        let offset = Math.round(this.size/2);
        let radius = Math.round((this.size + this.cupSize)/4) + 2;
        let captionSize = Math.round(this.size*0.12);
        for (let i=0; i<positions.length; ++i) {
            let angle = Math.PI - positions[i]*MARSelectorKnob.degrees;
            this.positions.push(angle);
            let caption = document.createElement("div");
            caption.id = "MARSelectorPos_" + i;
            caption.className = MARSelectorKnob.captionClassName;
            caption.style.width = `${captionSize}px`;
            caption.style.height = `${captionSize}px`;
            let x = Math.sin(angle)*radius + offset;
            let y = Math.cos(angle)*radius + offset;
            caption.style.left = `${x}px`;
            caption.style.top = `${y}px`;
            let span = document.createElement("span");
            span.textContent = captions[i];
            caption.appendChild(span);
            parent.appendChild(caption);
            caption.addEventListener("click", this.boundCaptionClick, false);
        }

        this.set(initial);              // set to its initial position
        this.canvas.addEventListener("click", this.boundStep, false);
    }

    /**************************************/
    setChangeListener(listener) {
        /* Sets an event handler whenever the knob position is changed. Note
        that this is not a JavaScript event mechanism. It only sets a call-back
        function, and only one function at a time is supported. When the knob
        position is change and has reached its destination, the listener will
        be called with the new 0-relative position as its only parameter */

        this.changeListener = listener;
    }

    /**************************************/
    removeChangeListener() {
        /* Removes any event handler for knob position changes */

        this.changeListener = null;
    }

    /**************************************/
    set(position) {
        /* Changes the visible state of the knob according to the position index */
        let dc = this.canvas.getContext("2d");
        let posTop = this.positions.length - 1;
        let radius = Math.round(this.cupSize/2);
        const fullCircle = 360*MARSelectorKnob.degrees;

        if (position < 0) {
            this.position = posTop;
        } else if (position <= posTop) {
            this.position = position;
        } else {
            this.position = 0;
        }

        dc.save();
        dc.translate(radius, radius);                   // move origin to the center
        dc.fillStyle = MARSelectorKnob.canvasColor;     // fill in the panel background (aids antialiasing)
        dc.clearRect(-radius, -radius, this.cupSize, this.cupSize);

        // Compute the pointer wedge verticies.
        radius -= 2;
        let angle = this.positions[this.position];
        let t0x = Math.sin(angle)*(radius-2);
        let t0y = Math.cos(angle)*(radius-2);

        let angle1 = angle + Math.PI + MARSelectorKnob.baseAngle;
        let b1x = Math.sin(angle1)*radius;
        let b1y = Math.cos(angle1)*radius;
        let angle2 = angle + Math.PI - MARSelectorKnob.baseAngle;
        let b2x = Math.sin(angle2)*radius;
        let b2y = Math.cos(angle2)*radius;

        let angle3 = angle - MARSelectorKnob.tipAngle;
        let t1x = Math.sin(angle3)*radius;
        let t1y = Math.cos(angle3)*radius;
        let angle4 = angle + MARSelectorKnob.tipAngle;
        let t2x = Math.sin(angle4)*radius;
        let t2y = Math.cos(angle4)*radius;

        // Draw the pointer wedge.
        dc.beginPath();
        dc.moveTo(t1x, t1y);
        dc.fillStyle = "#333";
        dc.shadowOffsetX = 8;
        dc.shadowOffsetY = 8;
        dc.shadowColor = "#444";
        dc.shadowBlur = 8;
        dc.lineTo(t2x, t2y);
        dc.lineTo(b2x, b2y);
        dc.lineTo(b1x, b1y);
        dc.fill();

        // Draw the pointer indicator
        dc.beginPath();
        dc.moveTo(0, 0);
        dc.fillStyle = "white";
        dc.arc(0, 0, 3, fullCircle, false);
        dc.fill();
        dc.beginPath();
        dc.moveTo(0, 0);
        dc.lineWidth = 2;
        dc.strokeStyle = "white";
        dc.lineTo(t0x, t0y);
        dc.closePath();
        dc.stroke();

        dc.restore();                               // pop the outermost save()
    }

    /**************************************/
    step() {
        /* Steps the knob to its next position. If it is at the last position, steps it
        to the first position */

        this.set(this.position+this.direction);
        if (this.changeListener) {
            this.changeListener(this.position);
        }
    }

    /**************************************/
    moveTo(position) {
        /* Steps the knob to the specified position */
        let steps = position - this.position;

        const nextStep = () => {
            this.set(this.position+this.direction);
            if (this.position != position) {
                setTimeout(nextStep, 100);
             } else {
               if (this.changeListener) {
                    this.changeListener(this.position);
                }
            }
        };

        if (steps) {
            let dir = Math.sign(steps);
            this.direction = (Math.abs(steps) <= this.positions.length/2 ? dir : -dir);
            nextStep();
        }
    }

    /**************************************/
    captionClick(ev) {
        /* Handles a click event on one of the position captions to move the
        knob to the position of that caption */
        let e = ev.target;

        while (e.tagName != "DIV") {
            e = e.parentElement;
        }

        let id = e.id;
        let [prefix, suffix] = id.split("_");

        if (prefix == "MARSelectorPos") {
            if (suffix) {
                let position = parseInt(suffix, 10);
                if (!isNaN(position) && position < this.positions.length && position >= 0) {
                    this.moveTo(position);
                }
            }
        }
    }

} // class MARSelectorKnob


// Static class properties

    MARSelectorKnob.className = "selectorKnob";
    MARSelectorKnob.canvasColor = "transparent";
    MARSelectorKnob.cupClassName = "MARSelectorCup";
    MARSelectorKnob.captionClassName = "MARSelectorCaption";
    MARSelectorKnob.degrees = Math.PI/180;
    MARSelectorKnob.baseAngle = 36*MARSelectorKnob.degrees/2;
    MARSelectorKnob.tipAngle = 6*MARSelectorKnob.degrees/2;
