/***********************************************************************
* retro-1620/webUI AuxCEPanel.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* IBM-1620 emulator support class implementing display and behavior
* for the auxiliary customer engineer panel.
************************************************************************
* 2023-11-22  P.Kimpel
*   Original version, from retro-1620 ControlPanel.js.
***********************************************************************/

export {AuxCEPanel};

import * as Version from "../emulator/Version.js";
import {FlipFlop} from "../emulator/FlipFlop.js";
import {Register} from "../emulator/Register.js";
import {Timer} from "../emulator/Timer.js";
import {openPopup} from "./PopupUtil.js";

import {ColoredLamp} from "./ColoredLamp.js";
import {GateLamp} from "./GateLamp.js";
import {MARSelectorKnob} from "./MARSelectorKnob.js";
import {PanelButton} from "./PanelButton.js";
import {PanelRegister} from "./PanelRegister.js";
import {ToggleSwitch} from "./ToggleSwitch.js";

class AuxCEPanel {

    // Static class properties

    static displayAlpha = 0.01;         // running average decay factor
    static displayRefreshPeriod = 50;   // ms
    static lampFreezeThreshold = FlipFlop.lampPersistence*2;
    static windowHeight = 232;          // window innerHeight, pixels
    static windowWidth =  468;          // window innerWidth, pixels
    static lampHSpacing = 44;           // panel lamp horizontal spacing
    static lampVSpacing = 48;           // panel lamp vertical spacing

    // Public instance properties

    doc = null;                         // window document object
    innerHeight = 0;                    // window specified innerHeight
    window = null;                      // window object

    avgInstructionRate = 0;             // running average instructions/sec
    intervalToken = 0;                  // panel refresh timer cancel token
    lastETime = 0;                      // last emulation clock value

    /**************************************/
    constructor(context) {
        /* Constructs the 1620 aux CE panel controls and wires up their events.
        "context" is an object passing other objects and callback functions from
        the global script:
            processor is the Processor object
            controlPanel is the main Control Panel object
        */

        this.context = context;
        this.config = context.config;

        this.boundUpdatePanel = this.updatePanel.bind(this);
        this.boundClosePanel = this.closePanel.bind(this);

        // Create the Aux CE Panel window
        let geometry = this.config.formatWindowGeometry("AuxCEPanel");
        if (geometry.length) {
            [this.innerWidth, this.innerHeight, this.windowLeft, this.windowTop] =
                    this.config.getWindowGeometry("AuxCEPanel");
        } else {
            this.innerWidth  = AuxCEPanel.windowWidth;
            this.innerHeight = AuxCEPanel.windowHeight;
            this.windowLeft =  (screen.availWidth-AuxCEPanel.windowWidth)/2;
            this.windowTop =   screen.availHeight-AuxCEPanel.windowHeight;
            geometry = `,left=${this.windowLeft},top=${this.windowTop}` +
                       `,innerWidth=${this.innerWidth},innerHeight=${this.innerHeight}`;
        }

        openPopup(window, "../webUI/AuxCEPanel.html", "retro-1620.AuxCEPanel",
                "location=no,scrollbars,resizable" + geometry,
                this, this.panelOnLoad);
    }

    /**************************************/
    $$(id) {
        /* Returns a DOM element from its id property. Cannot be called until
        panelOnLoad is called */

        return this.doc.getElementById(id);
    }

    /**************************************/
    panelOnLoad(ev) {
        /* Initializes the Aux CE Panel window and user interface */
        const p = this.context.processor;
        const cols = 10;
        let panel = null;               // panel DOM object

        let buildGatePanel = (panelID, gateCols, gateIDs) => {
            let caption = "";           // panel caption text
            let i = -1;                 // horizontal index
            let idText = "";            // object id
            let j = -1;                 // vertical index
            let panel = this.$$(panelID);
            let x = 0;                                  // horizontal lamp offset
            let y = 20 - AuxCEPanel.lampVSpacing;       // vertical lamp offset
            const prefix = "gate";

            for (let k=0; k<gateIDs.length; ++k) {
                if (k % gateCols > 0) {
                    ++i;
                    x += AuxCEPanel.lampHSpacing;
                } else {
                    i = 0;
                    ++j;
                    x = PanelRegister.hOffset+6;
                    y += AuxCEPanel.lampVSpacing;
                }

                idText = gateIDs[k];
                if (idText) {
                    caption = idText.replace(/\|/g, "<br>").replace("1ST ", "1<sup class=tiny>st</sup>");
                    idText = prefix + idText.replace(/\s/g, "_").replace(/\-/g, "_")
                                            .replace(/\|/g, "_").replace(/[/]/g, "");
                    this[idText] = new GateLamp(panel, x, y, idText);
                    this[idText].setCaption(caption, true);
                }
            }
        };

        this.doc = ev.target;
        this.window = this.doc.defaultView;
        let body = this.doc.body;

        // Control Gates
        buildGatePanel("AuxPanel", cols, [
            "EXP ADD", "FRAC ADD|ENTRY", "FRAC|ADD", "FRAC COMP|ENTRY", "FRAC|COMP", "EXP MOD|ENTRY", "EXP|MODIFY", "EXP MOD|REQD", "EXP OFLO|CORR", "HI PLUS|AUX",
            "MULT|ENTRY", "MULT", "FALSE XMIT|ENTRY", "FALSE|XMIT", "LOAD DVD|ENTRY", "LOAD|DVD", "DIV|ENTRY", "DIV", "EXP|XMIT", "RESULT|XMIT",
            "SCAN|ENTRY", "SCAN", "SCAN|MINUS", "SCAN|Q", "SCAN Q|EXIT", "CTR|COMPL", "D GTR|99", "SIG|DIGIT", "DIG FORCE|ENTRY", "DIGIT|FORCE",
            "SHIFT|OPS ENT", "SHIFT", "EXTRA|SFT CYC", "HI ORDER|ZERO", "NORM SFT|RIGHT", "FORCE|CF1", "", "", "X SIG|DIGIT", "SCE"]);

        this.window.addEventListener("unload", this.boundClosePanel);
        this.intervalToken = this.window.setTimeout(this.boundUpdatePanel, AuxCEPanel.displayRefreshPeriod);

        // Resize the window to take into account the difference between
        // inner and outer heights (WebKit quirk).
        let deltaWidth = AuxCEPanel.lampHSpacing*cols + PanelRegister.hOffset*2 - this.window.clientWidth;
        let deltaHeight = 0;
        if (this.window.innerHeight < this.innerHeight) {        // Safari bug
            deltaHeight = this.innerHeight - this.window.innerHeight;
        }

        this.window.resizeBy(deltaWidth, deltaHeight);
    }

    /**************************************/
    updatePanel() {
        /* Updates the panel registers and flip-flops from processor state */
        const p = this.context.processor;

        if (!p) {
            return;                     // probably got caught in a shutdown
        }

        this.gateCTR_COMPL.set(p.gateCOUNTER_COMP.glow);
        this.gateDIG_FORCE_ENTRY.set(p.gateDIGIT_FORCE_ENTRY.glow);
        this.gateDIGIT_FORCE.set(p.gateDIG_FORCE_MODE.glow);
        this.gateDIV.set(p.gateFDIV.glow);
        this.gateDIV_ENTRY.set(p.gateFDIV_ENTRY.glow);
        this.gateD_GTR_99.set(p.gateD_GTR_99.glow);
        this.gateEXP_ADD.set(p.gateEXP_ADD.glow);
        this.gateEXP_MODIFY.set(p.gateEXP_MODIFY.glow);
        this.gateEXP_MOD_ENTRY.set(p.gateEXP_MOD_ENTRY.glow);
        this.gateEXP_MOD_REQD.set(p.gateEXP_MOD_REQ.glow);
        this.gateEXP_OFLO_CORR.set(p.gateEXP_OFLO_CORR.glow);
        this.gateEXP_XMIT.set(p.gateEXP_XMIT.glow);
        this.gateEXTRA_SFT_CYC.set(p.gateEXTRA_SFT_CYC.glow);
        this.gateFALSE_XMIT.set(p.gateFALSE_XMIT.glow);
        this.gateFALSE_XMIT_ENTRY.set(p.gateFALSE_XMIT_ENTRY.glow);
        this.gateFORCE_CF1.set(p.gateFORCE_CF1.glow);
        this.gateFRAC_ADD.set(p.gateFRAC_ADD_MODE.glow);
        this.gateFRAC_ADD_ENTRY.set(p.gateFRAC_ADD_ENTRY.glow);
        this.gateFRAC_COMP.set(p.gateFRAC_COMPARE_MODE.glow);
        this.gateFRAC_COMP_ENTRY.set(p.gateFRAC_COMPR_ENTRY.glow);
        this.gateHI_ORDER_ZERO.set(p.gateHI_ORDER_ZERO.glow);
        this.gateHI_PLUS_AUX.set(p.gateFP_HI_PLUS.glow);
        this.gateLOAD_DVD.set(p.gateLD.glow);
        this.gateLOAD_DVD_ENTRY.set(p.gateLD_ENTRY.glow);
        this.gateMULT_ENTRY.set(p.gateFMUL_ENTRY.glow);
        this.gateMULT.set(p.gateFMUL_MODE.glow);
        this.gateNORM_SFT_RIGHT.set(p.gateNORM_SHIFT_RT.glow);
        this.gateRESULT_XMIT.set(p.gateRESULT_XMIT.glow);
        this.gateSCAN.set(p.gateSCAN_MODE.glow);
        this.gateSCAN_ENTRY.set(p.gateSCAN_ENTRY.glow);
        this.gateSCAN_MINUS.set(p.gateSCAN_MINUS.glow);
        this.gateSCAN_Q.set(p.gateSCAN_Q.glow);
        this.gateSCAN_Q_EXIT.set(p.gateQ_EXIT.glow);
        this.gateSCE.set(p.gateSCE.glow);
        this.gateSHIFT.set(p.gateSHIFT_MODE.glow);
        this.gateSHIFT_OPS_ENT.set(p.gateSHIFT_ENTRY.glow);
        this.gateSIG_DIGIT.set(p.gateSIG_DIGIT.glow);
        this.gateX_SIG_DIGIT.set(p.gateX_SIG_DIGIT.glow);

        this.intervalToken = this.window.setTimeout(this.boundUpdatePanel, AuxCEPanel.displayRefreshPeriod);
    }

    /**************************************/
    closePanel(ev) {
        /* Closes the panel and informs ControlPanel that it's gone */

        this.context.controlPanel?.postAuxCEPanelClosed();
        this.shutDown();
    }

    /**************************************/
    shutDown() {
        /* Shuts down the panel */

        if (this.window && !this.window.closed) {
            this.window.removeEventListener("unload", this.boundClosePanel);
            if (this.intervalToken) {
                this.window.clearTimeout(this.intervalToken);
                this.intervalToken = 0;
            }

            this.config.putWindowGeometry(this.window, "AuxCEPanel");
            this.window.close();
            this.window = null;
        }
    }
} // class AuxCEPanel
