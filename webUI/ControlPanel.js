/***********************************************************************
* retro-1620/webUI ControlPanel.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* IBM-1620 emulator support class implementing display and behavior
* for the main control panel.
************************************************************************
* 2022-07-19  P.Kimpel
*   Original version, extracted from retro-g15 ControlPanel.js.
***********************************************************************/

export {ControlPanel};

import * as Util from "../emulator/Util.js";
import * as Version from "../emulator/Version.js";

import {ColoredLamp} from "./ColoredLamp.js";
import {GateLamp} from "./GateLamp.js";
import {PanelRegister} from "./PanelRegister.js";
import {ToggleSwitch} from "./ToggleSwitch.js";
import {openPopup} from "./PopupUtil.js";

class ControlPanel {

    /**************************************/
    constructor(context) {
        /* Constructs the 1620 control panel controls and wires up their events.
        "context" is an object passing other objects and callback functions from
        the global script:
            processor is the Processor object
            systemShutDown() shuts down the emulator
        */
        const h = 600;
        const w = 1414;

        this.context = context;
        this.p = context.processor;
        this.systemShutdown = context.systemShutdown
        this.intervalToken = 0;         // interval timer cancel token

        this.boundUpdatePanel = this.updatePanel.bind(this);
        this.boundBeforeUnload = this.beforeUnload.bind(this);

        // Create the Control Panel window
        this.doc = null;
        this.window = null;
        openPopup(window, "../webUI/ControlPanel.html", "ControlPanel",
                "location=no,scrollbars,resizable,width=" + w + ",height=" + h +
                    ",top=0,left=" + (screen.availWidth - w),
                this, this.panelOnLoad.bind(this));
    }

    /**************************************/
    $$(id) {
        /* Returns a DOM element from its id property. Cannot be called until
        panelOnLoad is called */

        return this.doc.getElementById(id);
    }

    /**************************************/
    panelOnLoad(ev) {
        /* Initializes the Control Panel window and user interface */
        let p = this.p;                 // local copy of processor object
        let panel = null;               // panel DOM object
        //var prefs = this.config.getNode("ControlPanel");

        let buildGatePanel = (panelID, gateCols, gateIDs) => {
            let caption = "";
            let idText = "";
            let xOffset = 0;
            let x = 0;
            let y = 0;

            let panel = this.$$(panelID);
            xOffset = panel.clientWidth - (PanelRegister.hSpacing*(gateCols-1) + PanelRegister.hOffset +
                            PanelRegister.lampDiameter);
            y = PanelRegister.vOffset - PanelRegister.vSpacing;
            for (let i=0; i<gateIDs.length; ++i) {
                if (i % gateCols > 0) {
                    x += PanelRegister.hSpacing;
                } else {
                    x = xOffset;
                    y += PanelRegister.vSpacing;
                }

                idText = gateIDs[i];
                if (idText) {
                    caption = idText.replace("|", "<br>").replace("1ST ", "1<sup class=tiny>st</sup>");
                    idText = idText.replace(" ", "_").replace("-", "_").replace("|", "_").replace("/", "");
                } else {
                    caption = null;
                    idText = `${panelID}_${x%gateCols}_${y%gateCols}`;
                }

                this[idText] = new GateLamp(panel, x, y, idText);
                this[idText].setCaption(caption, false);
            }
        };

        this.doc = ev.target;
        this.window = this.doc.defaultView;
        let body = this.doc.body;

        // Memory Address Register
        panel = this.$$("Panel6Blue");
        this.regMAR = new PanelRegister(panel, 5, false, 0, "MAR_");
        for (let y=0; y<5; ++y) {
            let z = y*5;
            this.regMAR.lamps[z+0].setCaption("1", false);
            this.regMAR.lamps[z+1].setCaption("2", false);
            this.regMAR.lamps[z+2].setCaption("4", false);
            this.regMAR.lamps[z+3].setCaption("8", false);
            this.regMAR.lamps[z+4].setCaption("C", false);
        }

        // Memory Buffer and Inhibit Registers
        panel = this.$$("Panel5Gray");
        this.regMBREven = new PanelRegister(panel, 1, true, 0, "MBRE_");
        this.regMBROdd =  new PanelRegister(panel, 1, true, 1, "MBRO_");
        this.regMBROdd.lamps[0].setCaption("|<br>1<br>|", false);
        this.regMBROdd.lamps[1].setCaption("|<br>2<br>|", false);
        this.regMBROdd.lamps[2].setCaption("|<br>4<br>|", false);
        this.regMBROdd.lamps[3].setCaption("|<br>8<br>|", false);
        this.regMBROdd.lamps[4].setCaption("|<br>F<br>|", false);
        this.regMBROdd.lamps[5].setCaption("|<br>C<br>|", false);

        this.regDummy1 = new PanelRegister(panel, 1, true, 2, "DUMMY1_");

        this.regMIREven = new PanelRegister(panel, 1, true, 3, "MIRE_");
        this.regMIROdd =  new PanelRegister(panel, 1, true, 4, "MIRO_");
        this.regMIROdd.lamps[0].setCaption("|<br>1<br>|", false);
        this.regMIROdd.lamps[1].setCaption("|<br>2<br>|", false);
        this.regMIROdd.lamps[2].setCaption("|<br>4<br>|", false);
        this.regMIROdd.lamps[3].setCaption("|<br>8<br>|", false);
        this.regMIROdd.lamps[4].setCaption("|<br>F<br>|", false);
        this.regMIROdd.lamps[5].setCaption("|<br>C<br>|", false);

        // Operation, Multiplier/Quotient, and Data Registers
        panel = this.$$("Panel4Blue");
        this.regOREven = new PanelRegister(panel, 1, false, 0, "ORE_");
        this.regOROdd =  new PanelRegister(panel, 1, false, 1, "ORO_");
        this.regOROdd.lamps[0].setCaption("|<br>1<br>|", false);
        this.regOROdd.lamps[1].setCaption("|<br>2<br>|", false);
        this.regOROdd.lamps[2].setCaption("|<br>4<br>|", false);
        this.regOROdd.lamps[3].setCaption("|<br>8<br>|", false);
        this.regOROdd.lamps[4].setCaption("|<br>C<br>|", false);

        this.regMQ = new PanelRegister(panel, 1, false, 2, "MQ_");
        this.regMQ.lamps[0].setCaption("1", false);
        this.regMQ.lamps[1].setCaption("2", false);
        this.regMQ.lamps[2].setCaption("4", false);
        this.regMQ.lamps[3].setCaption("8", false);
        this.regMQ.lamps[4].setCaption("C", false);

        this.regDREven = new PanelRegister(panel, 1, false, 3, "DRE_");
        this.regDROdd =  new PanelRegister(panel, 1, false, 4, "DRO_");
        this.regDROdd.lamps[0].setCaption("|<br>1<br>|", false);
        this.regDROdd.lamps[1].setCaption("|<br>2<br>|", false);
        this.regDROdd.lamps[2].setCaption("|<br>4<br>|", false);
        this.regDROdd.lamps[3].setCaption("|<br>8<br>|", false);
        this.regDROdd.lamps[4].setCaption("|<br>C<br>|", false);

        // Instruction & Execution Cycle
        buildGatePanel("Panel3Gray", 3, [
            "I_1", "I_6",  "E_1",
            "I_2", "IA_1", "E_2",
            "I_3", "IA_2", "E_3",
            "I_4", "IA_3", "E_4",
            "I_5", "IX",   "E_5"]);

        // Input-Output
        buildGatePanel("Panel2Blue", 7, [
            "RD", "WR", "CHAR|GATE", "RDR|FEED", "PCH|FEED", "I/O|FLAG", "RESP|GATE",
            "R$I", "DISK|OP", "DISK LD|ZERO", "DISK|ADDR", "SCTR|COUNT", "MEM|ADDR", "SCTR|CYC",
            null, null, null, "DISK|HUND", "DISK|UNIT", "SEND|HOLD", "SEND|3$",
            null, null, null, null, null, null, null,
            null, "PC|H/P", "PC|E/Z", "PC|OFLOW", "PC|TR $", "PC|IND", "PC|6XXX"]);

        // Control Gates
        buildGatePanel("Panel1Gray", 12, [
            "I CYC|ENT", "IX|ENT", "E CYC|ENT", "RA$", "1ST|CYC", "ADD|ENT", "RECOMP", "MASK", "INT|ENT", "CLR|MEM", null, "IA|SEL",
            "BR|EXEC", "IX|EXEC", null, "FIELD|MK-1", "1ST CYC|DELAYD", "ADD|MODE", "CARRY|IN", "EXP|OFLOW", "INT|MODE", null, null, "IX|BAND 1",
            "IA|ENT", "X-4", "EXMIT|ENT", "FIELD|MK-2", "1ST MPLY|CYCLE", "2 DIG|CNTRL", "CARRY|OUT", "EXP|OFLO", "BR|OUT", "RUN", "STOP", "IX|BAND 2",
            "IA|REQ", "X-2", "EXMIT|MODE", "FL-1", "DIV-1|CYC", "COMP", "MC-1", "DVD|SIGN", null, "$$$|OFLO", "LAST|CARD", "H/P",
            "P", "X-1", null, "FL-2", "DVD|L-CYC", "P|COMP", "MC-2", "LAST|LD CYC", "", "EOR$", "", "E/Z"]);

        this.$$("EmulatorVersion").textContent = Version.i1620Version;
        this.window.addEventListener("beforeunload", this.boundBeforeUnload);
    }

    /**************************************/
    toggleTracing(ev) {
        /* Toggles the Processor's tracing option */
        let p = this.context.processor;

        this.$$("FrontPanel").focus();  // de-select the version <div>

        p.tracing = !p.tracing;
        if (p.tracing) {
            ev.target.classList.add("active");
            console.log("<TRACE ON>");
        } else {
            ev.target.classList.remove("active");
            console.log("<TRACE OFF>");
        }
    }

    /**************************************/
    updatePanel() {
        /* Updates the panel registers and flip-flops from processor state */
        let p = this.context.processor; // local copy of Processor reference

        p.updateLampGlow(0);

        this.lampOverflow.set(p.FO.glow);
        this.violationLamp.set(p.VV.glow);
    }

    /**************************************/
    controlSwitchChange(ev) {
        /* Event handler for the pane's switch controls */
        let p = this.context.processor; // local copy of Processor reference

        switch (ev.target.id) {
        case "EnableSwitchOff":
            p.enableSwitchChange(0);
            break;
        }
    }

    /**************************************/
    enablePanel() {
        /* Enables events and periodic refresh for the Control */
        let p = this.context.processor;

        this.$$("EnableSwitchSet").addEventListener("click", this.boundControlSwitchChange, false);
        this.$$("PunchSwitchSet").addEventListener("click", this.boundControlSwitchChange, false);
        this.$$("ComputeSwitchSet").addEventListener("click", this.boundControlSwitchChange, false);
        this.$$("I1620Version").addEventListener("dblclick", this.boundToggleTracing, false);
        this.$$("PowerOffBtn").addEventListener("click", this.context.systemShutDown, false);
        this.$$("ResetBtn").addEventListener("click", this.boundSystemReset, false);
        this.$$("ViolationResetBtn").addEventListener("click", this.boundControlSwitchChange, false);
        this.violationSwitch.addEventListener("click", this.boundControlSwitchChange, false);
        if (p.tracing) {
            this.$$("I1620Version").classList.add("active");
        } else {
            this.$$("I1620Version").classList.remove("active");
        }

        this.updatePanel();
        this.panelEnabled = true;
        this.$$("FrontPanel").style.visibility = "visible";
        if (!this.intervalToken) {
            this.intervalToken = setInterval(this.boundUpdatePanel, ControlPanel.displayRefreshPeriod);
        }
    }

    /**************************************/
    disablePanel() {
        /* Disables events and periodic refresh for the Control Panel */

        this.dcPowerLamp.set(0);
        this.readyLamp.set(0);
        this.violationSwitch.set(0)
        this.$$("EnableSwitchOn").checked = false;
        this.$$("EnableSwitchOff").checked = true;
        this.$$("PunchSwitchOn").checked = false;
        this.$$("PunchSwitchRewind").checked = false;
        this.$$("PunchSwitchOff").checked = true;
        this.$$("ComputeSwitchGo").checked = false;
        this.$$("ComputeSwitchBP").checked = false;
        this.$$("ComputeSwitchOff").checked = true;

        this.$$("EnableSwitchSet").removeEventListener("click", this.boundControlSwitchChange, false);
        this.$$("PunchSwitchSet").removeEventListener("click", this.boundControlSwitchChange, false);
        this.$$("ComputeSwitchSet").removeEventListener("click", this.boundControlSwitchChange, false);
        this.$$("I1620Version").removeEventListener("dblclick", this.boundToggleTracing, false);
        this.$$("PowerOffBtn").removeEventListener("click", this.context.systemShutDown, false);
        this.$$("ResetBtn").removeEventListener("click", this.boundSystemReset, false);
        this.$$("ViolationResetBtn").removeEventListener("click", this.boundControlSwitchChange, false);
        this.violationSwitch.removeEventListener("click", this.boundControlSwitchChange, false);

        this.panelEnabled = false;
        this.$$("FrontPanel").style.visibility = "hidden";
        if (this.intervalToken) {
            clearInterval(this.intervalToken);
            this.intervalToken = 0;
        }
    }

    /**************************************/
    async systemReset(ev) {
        /* Event handler for the RESET button */
        let timer = new Util.Timer();

        if (this.context.processor.CH.value) {  // system halted
            this.readyLamp.set(0);
            this.dcPowerLamp.set(0);
            await timer.set(1500);          // wait for the DC power supplies...
            this.dcPowerLamp.set(1);
            await this.context.processor.systemReset();
            this.readyLamp.set(1);
            if (!this.panelEnabled) {
                this.enablePanel();
            }
        }
    }

    /**************************************/
    beforeUnload(ev) {
        const msg = "Closing this window will make the panel unusable.\n" +
                    "Suggest you stay on the page and minimize this window instead";

        ev.preventDefault();
        ev.returnValue = msg;
        return msg;
    }

    /**************************************/
    shutDown() {
        /* Shuts down the panel */

        this.window.removeEventListener("beforeunload", this.bountBeforeUnload);
        if (this.intervalToken) {
            this.window.clearInterval(this.intervalToken);
        }

        this.window.close();
    }
} // class ControlPanel


// Static class properties

ControlPanel.displayRefreshPeriod = 50; // ms
