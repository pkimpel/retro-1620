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
import {openPopup} from "./PopupUtil.js";

import {ColoredLamp} from "./ColoredLamp.js";
import {GateLamp} from "./GateLamp.js";
import {MARSelectorKnob} from "./MARSelectorKnob.js";
import {PanelRegister} from "./PanelRegister.js";
import {ToggleSwitch} from "./ToggleSwitch.js";

class ControlPanel {

    /**************************************/
    constructor(context) {
        /* Constructs the 1620 control panel controls and wires up their events.
        "context" is an object passing other objects and callback functions from
        the global script:
            processor is the Processor object
            systemShutDown() shuts down the emulator
        */
        const h = 560;
        const w = 1414;

        this.context = context;
        this.p = context.processor;
        this.systemShutdown = context.systemShutdown
        this.intervalToken = 0;         // interval timer cancel token

        this.boundUpdatePanel = this.updatePanel.bind(this);
        this.boundBeforeUnload = this.beforeUnload.bind(this);
        this.boundControlSwitchClick = this.controlSwitchClick.bind(this);
        this.boundShutDown = this.shutDown.bind(this);

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

        // MAR Selector Switch
        let captions = ["OR-3", "OR-4", "OR-5", "CR-1", "CR-2", "PR-2", "IR-1", "IR-2", "IR-3", "IR-4", "OR-1", "OR-2"];
        let positions = [];
        for (let a=15; a<360; a+=30) {
            positions.push(a);
        }

        let marSelectorKnob = new MARSelectorKnob(this.$$("MARSelectorDiv"), "MARSelectorCupDiv", 10, positions, captions);

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
            "REL", "DISK|OP", "DISK LD|ZERO", "DISK|ADDR", "SCTR|COUNT", "MEM|ADDR", "SCTR|CYC",
            null, null, null, "DISK|HUND", "DISK|UNIT", "SIMO|HOLD", "SIMO|30",
            null, null, null, null, null, null, null,
            null, "PC|H/P", "PC|E/Z", "PC|OFLOW", "PC|TR 8", "PC|IND", "PC|6XXX"]);

        // Control Gates
        buildGatePanel("Panel1Gray", 12, [
            "I CYC|ENT", "IX|ENT", "E CYC|ENT", "RM", "1ST|CYC", "ADD|ENT", "RECOMP", "MASK", "INT|ENT", "CLR|MEM", null, "IA|SEL",
            "BR|EXEC", "IX|EXEC", null, "FIELD|MK-1", "1ST CYC|DELAYD", "ADD|MODE", "CARRY|IN", "EXP|OFLO", "INT|MODE", null, null, "IX|BAND 1",
            "IA|ENT", "X-4", "EXMIT|ENT", "FIELD|MK-2", "1ST MPLY|CYCLE", "2 DIG|CNTRL", "CARRY|OUT", "EXP|UFLO", "BR|OUT", "RUN", "STOP", "IX|BAND 2",
            "IA|REQ", "X-2", "EXMIT|MODE", "FL-1", "DIV-1|CYC", "COMP", "MC-1", "DVD|SIGN", null, "$$$|OFLO", "LAST|CARD", "H/P",
            "P", "X-1", null, "FL-2", "DVD|L-CYC", "P|COMP", "MC-2", "LAST|LD CYC", null, "EOR$", null, "E/Z"]);

        // Check Stop Panel Switches & Lamps
        panel = this.$$("CheckStopPanel");
        this.dummy1Lamp = new GateLamp(panel, null, null, "Dummy1Lamp");
        this.diskAddrCheckLamp = new GateLamp(panel, null, null, "DiskAddrCheckLamp");
        this.diskAddrCheckLamp.setCaption("ADDR CHK", false);
        this.parityMARCheckLamp = new GateLamp(panel, null, null, "ParityMARCheckLamp");
        this.parityMARCheckLamp.setCaption("ADDR CHK", false);
        this.IOPrinterCheckLamp = new GateLamp(panel, null, null, "IOPrinterCheckLamp");
        this.IOPrinterCheckLamp.setCaption("PR CHK", false);
        this.OflowDummyCheckLamp = new GateLamp(panel, null, null, "OflowDummyCheckLamp");

        this.dummy2Lamp = new GateLamp(panel, null, null, "Dummy2Lamp");
        this.diskWRLWBCCheckLamp = new GateLamp(panel, null, null, "DiskWRLWBCCheckLamp");
        this.diskWRLWBCCheckLamp.setCaption("WRL WBC", false);
        this.parityMBRECheckLamp = new GateLamp(panel, null, null, "ParityMBRECheckLamp");
        this.parityMBRECheckLamp.setCaption("MBR-E CHK", false);
        this.IOReadCheckLamp = new GateLamp(panel, null, null, "IOReadCheckLamp");
        this.IOReadCheckLamp.setCaption("RD CHK", false);
        this.OflowExpCheckLamp = new GateLamp(panel, null, null, "OflowExpCheckLamp");
        this.OflowExpCheckLamp.setCaption("EXP CHK", false);

        this.dummy3Lamp = new GateLamp(panel, null, null, "Dummy3Lamp");
        this.diskCylOflowCheckLamp = new GateLamp(panel, null, null, "DiskCylOflowCheckLamp");
        this.diskCylOflowCheckLamp.setCaption("|<br>|<br>CYL OFLO", false);
        this.ParityMBROCheckLamp = new GateLamp(panel, null, null, "ParityMBROCheckLamp");
        this.ParityMBROCheckLamp.setCaption("|<br>|<br>MBR-O CHK", false);
        this.ioWriteCheckLamp = new GateLamp(panel, null, null, "IOWriteCheckLamp");
        this.ioWriteCheckLamp.setCaption("|<br>|<br>WR CHK", false);
        this.OflowArithCheckLamp = new GateLamp(panel, null, null, "OflowArithCheckLamp");
        this.OflowArithCheckLamp.setCaption("ARITH CHK", false);

        this.dummy1Switch = new ToggleSwitch(panel, null, null, "Dummy1Switch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.diskStopSwitch = new ToggleSwitch(panel, null, null, "DiskStopSwitch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.diskStopSwitch.setCaption("|<br>|<br>STOP", false);
        this.diskStopSwitch.setCaption("PROGRAM", true);
        this.parityStopSwitch = new ToggleSwitch(panel, null, null, "ParityStopSwitch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.parityStopSwitch.setCaption("|<br>|<br>STOP", false);
        this.parityStopSwitch.setCaption("PROGRAM", true);
        this.ioStopSwitch = new ToggleSwitch(panel, null, null, "IOStopSwitch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.ioStopSwitch.setCaption("|<br>|<br>STOP", false);
        this.ioStopSwitch.setCaption("PROGRAM", true);
        this.oflowStopSwitch = new ToggleSwitch(panel, null, null, "OflowStopSwitch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.oflowStopSwitch.setCaption("|<br>|<br>STOP", false);
        this.oflowStopSwitch.setCaption("PROGRAM", true);
        this.program1Switch = new ToggleSwitch(panel, null, null, "Program1Switch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.program1Switch.setCaption("1<br>ON", false);
        this.program1Switch.setCaption("OFF", true);
        this.program2Switch = new ToggleSwitch(panel, null, null, "Program2Switch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.program2Switch.setCaption("2<br>ON", false);
        this.program2Switch.setCaption("OFF", true);
        this.program3Switch = new ToggleSwitch(panel, null, null, "Program3Switch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.program3Switch.setCaption("3<br>ON", false);
        this.program3Switch.setCaption("OFF", true);
        this.program4Switch = new ToggleSwitch(panel, null, null, "Program4Switch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.program4Switch.setCaption("4<br>ON", false);
        this.program4Switch.setCaption("OFF", true);

        this.$$("EmulatorVersion").textContent = Version.i1620Version;
        this.window.addEventListener("beforeunload", this.boundBeforeUnload);
        setTimeout(() => {
            this.$$("PowerOnLamp").classList.add("greenLit");
            setTimeout(() => {
                this.$$("PowerReadyLamp").classList.add("whiteLit");
                this.$$("OperatorContainer").addEventListener("click", this.boundControlSwitchClick);
            }, 2000);
        }, 1000);

        /**********
        if (!this.intervalToken) {
            this.intervalToken = setInterval(this.boundUpdatePanel, ControlPanel.displayRefreshPeriod);
        }
        **********/
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
    controlSwitchClick(ev) {
        /* Event handler for the pane's switch controls */
        let e = ev.target;
        let p = this.context.processor; // local copy of Processor reference

        if (e.tagName == "IMG") {
            e = e.parentElement;        // adjust for clicking image in ToggleSwitch objects
        }

        switch (e.id) {
        case "PowerBtn":
            this.shutDown();
            break;
        case "Dummy1Switch":            // non-functional, just turn it back off
            this.dummy1Switch.flip();
            setTimeout(() => {this.dummy1Switch.flip()}, 250);
            break;
        case "DiskStopSwitch":
            this.diskStopSwitch.flip();
            break;
        case "ParityStopSwitch":
            this.parityStopSwitch.flip();
            break;
        case "IOStopSwitch":
            this.ioStopSwitch.flip();
            break;
        case "OflowStopSwitch":
            this.oflowStopSwitch.flip();
            break;
        case "Program1Switch":
            this.program1Switch.flip();
            break;
        case "Program2Switch":
            this.program2Switch.flip();
            break;
        case "Program3Switch":
            this.program3Switch.flip();
            break;
        case "Program4Switch":
            this.program4Switch.flip();
            break;
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

        this.$$("OperatorContainer").removeEventListener("click", this.boundControlSwitchClick);
        this.window.removeEventListener("beforeunload", this.boundBeforeUnload);
        this.$$("PowerReadyLamp").classList.remove("whiteLit");
        this.$$("PowerOnLamp").classList.remove("greenLit");
        if (this.intervalToken) {
            this.window.clearInterval(this.intervalToken);
            this.intervalToken = 0;
        }

        this.context.systemShutDown();
        this.window.close();
    }
} // class ControlPanel


// Static class properties

ControlPanel.displayRefreshPeriod = 50; // ms
ControlPanel.offSwitchImage = "./resources/ToggleDown.png";
ControlPanel.onSwitchImage = "./resources/ToggleUp.png";
