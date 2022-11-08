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

import * as Version from "../emulator/Version.js";
import {Register} from "../emulator/Register.js";
import {Timer} from "../emulator/Timer.js";
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
        this.systemShutdown = context.systemShutdown
        this.intervalToken = 0;         // interval timer cancel token

        this.boundUpdatePanel = this.updatePanel.bind(this);
        this.boundMARSelectorChange = this.marSelectorChange.bind(this);
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
        let p = this.context.processor;
        let panel = null;               // panel DOM object
        //var prefs = this.config.getNode("ControlPanel");

        let buildGatePanel = (panelID, gateCols, gateIDs) => {
            let caption = "";           // panel caption text
            let i = -1;                 // horizontal index
            let idText = "";            // object id
            let j = -1;                 // vertical index
            let panel = this.$$(panelID);
            let x = 0;                  // horizontal lamp offset
            let y = PanelRegister.vOffset - PanelRegister.vSpacing;                     // vertical lamp offset
            let xOffset = panel.clientWidth - (PanelRegister.hSpacing*(gateCols-1) +    // horizontal row offset
                            PanelRegister.hOffset + PanelRegister.lampDiameter);
            const prefix = "gate";

            for (let k=0; k<gateIDs.length; ++k) {
                if (k % gateCols > 0) {
                    ++i;
                    x += PanelRegister.hSpacing;
                } else {
                    i = 0;
                    ++j;
                    x = xOffset;
                    y += PanelRegister.vSpacing;
                }

                idText = gateIDs[k];
                if (idText) {
                    caption = idText.replace("|", "<br>").replace("1ST ", "1<sup class=tiny>st</sup>");
                    idText = idText.replace(" ", "_").replace("-", "_").replace("|", "_").replace("/", "");
                } else {
                    caption = null;
                    idText = `${panelID}_${j}_${i}`;
                }

                idText = prefix + idText;
                this[idText] = new GateLamp(panel, x, y, idText);
                this[idText].setCaption(caption, false);
            }
        };

        this.doc = ev.target;
        this.window = this.doc.defaultView;
        let body = this.doc.body;

        // MAR Selector Switch
        let captions = ["OR-1", "OR-2", "OR-3", "OR-4", "OR-5", "CR-1", "CR-2", "PR-2", "IR-1", "IR-2", "IR-3", "IR-4"];
        let positions = [];
        for (let a=0; a<360; a+=30) {
            positions.push((a+315)%360);
        }

        this.marSelectorKnob = new MARSelectorKnob(this.$$("MARSelectorDiv"), "MARSelectorCupDiv", 0, positions, captions);
        p.marSelectorKnob = this.marSelectorKnob.position;

        // Memory Address Register
        panel = this.$$("Panel6Blue");
        this.regMAR = new PanelRegister(panel, 5, false, 0, "MAR_");
        for (let y=0; y<5; ++y) {
            let z = y*Register.digitBits;
            this.regMAR.lamps[z+0].setCaption("1", false);
            this.regMAR.lamps[z+1].setCaption("2", false);
            this.regMAR.lamps[z+2].setCaption("4", false);
            this.regMAR.lamps[z+3].setCaption("8", false);
            this.regMAR.lamps[z+5].setCaption("C", false);              // no lamp[4] for flag
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
        this.regOROdd.lamps[5].setCaption("|<br>C<br>|", false);        // no lamp[4] for flag

        this.regMQ = new PanelRegister(panel, 1, false, 2, "MQ_");
        this.regMQ.lamps[0].setCaption("1", false);
        this.regMQ.lamps[1].setCaption("2", false);
        this.regMQ.lamps[2].setCaption("4", false);
        this.regMQ.lamps[3].setCaption("8", false);
        this.regMQ.lamps[5].setCaption("C", false);                     // no lamp[4] for flag

        this.regDREven = new PanelRegister(panel, 1, false, 3, "DRE_");
        this.regDROdd =  new PanelRegister(panel, 1, false, 4, "DRO_");
        this.regDROdd.lamps[0].setCaption("|<br>1<br>|", false);
        this.regDROdd.lamps[1].setCaption("|<br>2<br>|", false);
        this.regDROdd.lamps[2].setCaption("|<br>4<br>|", false);
        this.regDROdd.lamps[3].setCaption("|<br>8<br>|", false);
        this.regDROdd.lamps[5].setCaption("|<br>C<br>|", false);        // no lamp[4] for flag

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

        // Operator Control Panel Buttons & Lamps
        panel = this.$$("IndicatorButtonPanel");
        this.powerOnLamp = new ColoredLamp(panel, null, null, "PowerOnLamp", "POWER<br>ON", "panel greenLamp", "panel greenLamp greenLit");
        this.powerReadyLamp = new ColoredLamp(panel, null, null, "PowerReadyLamp", "POWER<br>READY", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.thermalLamp = new ColoredLamp(panel, null, null, "ThermalLamp", "THERMAL", "panel redLamp", "panel redLamp redLit");
        this.writeInterlockLamp = new ColoredLamp(panel, null, null, "WriteInterlockLamp", "WRITE<br>INTERLOCK", "panel redLamp", "panel redLamp redLit");
        this.readInterlockLamp = new ColoredLamp(panel, null, null, "ReadInterlockLamp", "READ<br>INTERLOCK", "panel redLamp", "panel redLamp redLit");
        this.saveLamp = new ColoredLamp(panel, null, null, "SaveLamp", "SAVE", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.typewriterSelectedLamp = new ColoredLamp(panel, null, null, "TypewriterSelectedLamp", "TWPR<br>SELECTED", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.rfe1Lamp = new ColoredLamp(panel, null, null, "RFE1Lamp", "&nbsp;", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.rfe2Lamp = new ColoredLamp(panel, null, null, "RFE2Lamp", "&nbsp;", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.rfe3Lamp = new ColoredLamp(panel, null, null, "RFE3Lamp", "&nbsp;", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.automaticLamp = new ColoredLamp(panel, null, null, "AutomaticLamp", "AUTOMATIC", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.manualLamp = new ColoredLamp(panel, null, null, "ManualLamp", "MANUAL", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.checkStopLamp = new ColoredLamp(panel, null, null, "CheckStopLamp", "CHECK<br>STOP", "panel redLamp", "panel redLamp redLit");

        // Check Stop Panel Switches & Lamps
        panel = this.$$("CheckStopPanel");
        this.dummy1Lamp = new GateLamp(panel, null, null, "Dummy1Lamp");
        this.diskAddrCheckLamp = new GateLamp(panel, null, null, "DiskAddrCheckLamp");
        this.diskAddrCheckLamp.setCaption("ADDR CHK", false);
        this.parityMARCheckLamp = new GateLamp(panel, null, null, "ParityMARCheckLamp");
        this.parityMARCheckLamp.setCaption("ADDR CHK", false);
        this.ioPrinterCheckLamp = new GateLamp(panel, null, null, "IOPrinterCheckLamp");
        this.ioPrinterCheckLamp.setCaption("PR CHK", false);
        this.oflowDummyCheckLamp = new GateLamp(panel, null, null, "OflowDummyCheckLamp");

        this.dummy2Lamp = new GateLamp(panel, null, null, "Dummy2Lamp");
        this.diskWRLWBCCheckLamp = new GateLamp(panel, null, null, "DiskWRLWBCCheckLamp");
        this.diskWRLWBCCheckLamp.setCaption("WRL WBC", false);
        this.parityMBRECheckLamp = new GateLamp(panel, null, null, "ParityMBRECheckLamp");
        this.parityMBRECheckLamp.setCaption("MBR-E CHK", false);
        this.ioReadCheckLamp = new GateLamp(panel, null, null, "IOReadCheckLamp");
        this.ioReadCheckLamp.setCaption("RD CHK", false);
        this.oflowExpCheckLamp = new GateLamp(panel, null, null, "OflowExpCheckLamp");
        this.oflowExpCheckLamp.setCaption("EXP CHK", false);

        this.dummy3Lamp = new GateLamp(panel, null, null, "Dummy3Lamp");
        this.diskCylOflowCheckLamp = new GateLamp(panel, null, null, "DiskCylOflowCheckLamp");
        this.diskCylOflowCheckLamp.setCaption("|<br>|<br>CYL OFLO", false);
        this.parityMBROCheckLamp = new GateLamp(panel, null, null, "ParityMBROCheckLamp");
        this.parityMBROCheckLamp.setCaption("|<br>|<br>MBR-O CHK", false);
        this.ioWriteCheckLamp = new GateLamp(panel, null, null, "IOWriteCheckLamp");
        this.ioWriteCheckLamp.setCaption("|<br>|<br>WR CHK", false);
        this.oflowArithCheckLamp = new GateLamp(panel, null, null, "OflowArithCheckLamp");
        this.oflowArithCheckLamp.setCaption("ARITH CHK", false);

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
        this.$$("OperatorContainer").addEventListener("click", this.boundControlSwitchClick);
        this.marSelectorKnob.setChangeListener(this.boundMARSelectorChange);

        // Power up and initialize the system.
        setTimeout(() => {
            p.powerUp();
            this.powerOnLamp.set(1);
            setTimeout(() => {
                this.powerReadyLamp.set(1);
                this.intervalToken = this.window.setInterval(this.boundUpdatePanel, ControlPanel.displayRefreshPeriod);
            }, 2000);
        }, 1000);

        // Resize the window to take into account the difference between inner and outer heights (Safari).
        this.window.resizeBy(0, this.doc.body.scrollHeight-this.doc.body.offsetHeight);
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
        let p = this.context.processor;

        p.updateLampGlow(0);

        // Control Gates panel
        this.gateI_CYC_ENT.set(p.gateI_CYC_ENT.glow);
        this.gateIX_ENT.set(p.gateIX_ENT.glow);
        this.gateE_CYC_ENT.set(p.gateE_CYC_ENT.glow);
        this.gateRM.set(p.gateRM.glow);
        this.gate1ST_CYC.set(p.gate1ST_CYC.glow);
        this.gateADD_ENT.set(p.gateADD_ENT.glow);
        this.gateRECOMP.set(p.gateRECOMP.glow);
        this.gateMASK.set(p.gateMASK.glow);
        this.gateINT_ENT.set(p.gateINT_ENT.glow);
        this.gateCLR_MEM.set(p.gateCLR_MEM.glow);
        //this.gatePanel1Gray_0_10.set(p.gatePanel1Gray_0_10.glow);
        this.gateIA_SEL.set(p.gateIA_SEL.glow);
        this.gateBR_EXEC.set(p.gateBR_EXEC.glow);
        this.gateIX_EXEC.set(p.gateIX_EXEC.glow);
        //this.gatePanel1Gray_1_2.set(p.gatePanel1Gray_1_2.glow);
        this.gateFIELD_MK_1.set(p.gateFIELD_MK_1.glow);
        this.gate1ST_CYC_DELAYD.set(p.gate1ST_CYC_DELAYD.glow);
        this.gateADD_MODE.set(p.gateADD_MODE.glow);
        this.gateCARRY_IN.set(p.gateCARRY_IN.glow);
        this.gateEXP_OFLO.set(p.gateEXP_OFLO.glow);
        this.gateINT_MODE.set(p.gateINT_MODE.glow);
        //this.gatePanel1Gray_1_9.set(p.gatePanel1Gray_1_9.glow);
        //this.gatePanel1Gray_1_10.set(p.gatePanel1Gray_1_10.glow);
        this.gateIX_BAND_1.set(p.gateIX_BAND_1.glow);
        this.gateIA_ENT.set(p.gateIA_ENT.glow);
        this.gateX_4.set(p.gateX_4.glow);
        this.gateEXMIT_ENT.set(p.gateEXMIT_ENT.glow);
        this.gateFIELD_MK_2.set(p.gateFIELD_MK_2.glow);
        this.gate1ST_MPLY_CYCLE.set(p.gate1ST_MPLY_CYCLE.glow);
        this.gate2_DIG_CNTRL.set(p.gate2_DIG_CNTRL.glow);
        this.gateCARRY_OUT.set(p.gateCARRY_OUT.glow);
        this.gateEXP_UFLO.set(p.gateEXP_UFLO.glow);
        this.gateBR_OUT.set(p.gateBR_OUT.glow);
        this.gateRUN.set(p.gateRUN.glow);
        this.gateSTOP.set(p.gateSTOP.glow);
        this.gateIX_BAND_2.set(p.gateIX_BAND_2.glow);
        this.gateIA_REQ.set(p.gateIA_REQ.glow);
        this.gateX_2.set(p.gateX_2.glow);
        this.gateEXMIT_MODE.set(p.gateEXMIT_MODE.glow);
        this.gateFL_1.set(p.gateFL_1.glow);
        this.gateDIV_1_CYC.set(p.gateDIV_1_CYC.glow);
        this.gateCOMP.set(p.gateCOMP.glow);
        this.gateMC_1.set(p.gateMC_1.glow);
        this.gateDVD_SIGN.set(p.gateDVD_SIGN.glow);
        //this.gatePanel1Gray_3_8.set(p.gatePanel1Gray_3_8.glow);
        this.gate$$$_OFLO.set(p.gate$$$_OFLO.glow);
        this.gateLAST_CARD.set(p.gateLAST_CARD.glow);
        this.gateHP.set(p.gateHP.glow);
        this.gateP.set(p.gateP.glow);
        this.gateX_1.set(p.gateX_1.glow);
        //this.gatePanel1Gray_4_2.set(p.gatePanel1Gray_4_2.glow);
        this.gateFL_2.set(p.gateFL_2.glow);
        this.gateDVD_L_CYC.set(p.gateDVD_L_CYC.glow);
        this.gateP_COMP.set(p.gateP_COMP.glow);
        this.gateMC_2.set(p.gateMC_2.glow);
        this.gateLAST_LD_CYC.set(p.gateLAST_LD_CYC.glow);
        //this.gatePanel1Gray_4_8.set(p.gatePanel1Gray_4_8.glow);
        this.gateEOR$.set(p.gateEOR$.glow);
        //this.gatePanel1Gray_4_10.set(p.gatePanel1Gray_4_10.glow);
        this.gateEZ.set(p.gateEZ.glow);

        // Input-Output panel
        this.gateRD.set(p.gateRD.glow);
        this.gateWR.set(p.gateWR.glow);
        this.gateCHAR_GATE.set(p.gateCHAR_GATE.glow);
        this.gateRDR_FEED.set(p.gateRDR_FEED.glow);
        this.gatePCH_FEED.set(p.gatePCH_FEED.glow);
        this.gateIO_FLAG.set(p.gateIO_FLAG.glow);
        this.gateRESP_GATE.set(p.gateRESP_GATE.glow);
        this.gateREL.set(p.gateREL.glow);
        this.gateDISK_OP.set(p.gateDISK_OP.glow);
        this.gateDISK_LD_ZERO.set(p.gateDISK_LD_ZERO.glow);
        this.gateDISK_ADDR.set(p.gateDISK_ADDR.glow);
        this.gateSCTR_COUNT.set(p.gateSCTR_COUNT.glow);
        this.gateMEM_ADDR.set(p.gateMEM_ADDR.glow);
        this.gateSCTR_CYC.set(p.gateSCTR_CYC.glow);
        //this.gatePanel2Blue_2_0.set(p.gatePanel2Blue_2_0.glow);
        //this.gatePanel2Blue_2_1.set(p.gatePanel2Blue_2_1.glow);
        //this.gatePanel2Blue_2_2.set(p.gatePanel2Blue_2_2.glow);
        this.gateDISK_HUND.set(p.gateDISK_HUND.glow);
        this.gateDISK_UNIT.set(p.gateDISK_UNIT.glow);
        this.gateSIMO_HOLD.set(p.gateSIMO_HOLD.glow);
        this.gateSIMO_30.set(p.gateSIMO_30.glow);
        //this.gatePanel2Blue_3_0.set(p.gatePanel2Blue_3_0.glow);
        //this.gatePanel2Blue_3_1.set(p.gatePanel2Blue_3_1.glow);
        //this.gatePanel2Blue_3_2.set(p.gatePanel2Blue_3_2.glow);
        //this.gatePanel2Blue_3_3.set(p.gatePanel2Blue_3_3.glow);
        //this.gatePanel2Blue_3_4.set(p.gatePanel2Blue_3_4.glow);
        //this.gatePanel2Blue_3_5.set(p.gatePanel2Blue_3_5.glow);
        //this.gatePanel2Blue_3_6.set(p.gatePanel2Blue_3_6.glow);
        //this.gatePanel2Blue_4_0.set(p.gatePanel2Blue_4_0.glow);
        this.gatePC_HP.set(p.gatePC_HP.glow);
        this.gatePC_EZ.set(p.gatePC_EZ.glow);
        this.gatePC_OFLOW.set(p.gatePC_OFLOW.glow);
        this.gatePC_TR_8.set(p.gatePC_TR_8.glow);
        this.gatePC_IND.set(p.gatePC_IND.glow);
        this.gatePC_6XXX.set(p.gatePC_6XXX.glow);

        // Instruction & Execution Cycle panel
        this.gateI_1.set(p.gateI_1.glow);
        this.gateI_4.set(p.gateI_4.glow);
        this.gateI_2.set(p.gateI_2.glow);
        this.gateI_3.set(p.gateI_3.glow);
        this.gateI_5.set(p.gateI_5.glow);
        this.gateI_6.set(p.gateI_6.glow);
        this.gateIA_1.set(p.gateIA_1.glow);
        this.gateIA_2.set(p.gateIA_2.glow);
        this.gateIA_3.set(p.gateIA_3.glow);
        this.gateIX.set(p.gateIX.glow);
        this.gateE_1.set(p.gateE_1.glow);
        this.gateE_2.set(p.gateE_2.glow);
        this.gateE_3.set(p.gateE_3.glow);
        this.gateE_4.set(p.gateE_4.glow);
        this.gateE_5.set(p.gateE_5.glow);

        // Register Panels
        this.regOREven.updateLampGlow(p.regOREven.glow);
        this.regOROdd.updateLampGlow(p.regOROdd.glow);
        this.regMQ.updateLampGlow(p.regMQ.glow);
        this.regDREven.updateLampGlow(p.regDREven.glow);
        this.regDROdd.updateLampGlow(p.regDROdd.glow);
        this.regMBREven.updateLampGlow(p.regMBREven.glow);
        this.regMBROdd.updateLampGlow(p.regMBROdd.glow);
        //this.regDummy1.updateLampGlow(p.regDummy1.glow);
        this.regMIREven.updateLampGlow(p.regMIREven.glow);
        this.regMIROdd.updateLampGlow(p.regMIROdd.glow);
        this.regMAR.updateLampGlow(p.regMAR.glow);

        // Operator Control Panel lamps
        this.thermalLamp.set(p.thermal.glow);
        this.writeInterlockLamp.set(p.writeInterlock.glow);
        this.readInterlockLamp.set(p.readInterlock.glow);
        this.saveLamp.set(p.save.glow);
        this.typewriterSelectedLamp.set(p.typewriterSelected.glow);
        //this.rfe1Lamp.set(p.rfe1Lamp.glow);
        //this.rfe2Lamp.set(p.rfe2Lamp.glow);
        //this.rfe3Lamp.set(p.rfe3Lamp.glow);
        this.automaticLamp.set(p.automatic.glow);
        this.manualLamp.set(p.manual.glow);
        this.checkStopLamp.set(p.checkStop.glow);

        // Check Indicators panel
        //this.dummy1Lamp.set(p.dummy1Lamp.glow);
        this.diskAddrCheckLamp.set(p.diskAddrCheck.glow);
        this.parityMARCheckLamp.set(p.parityMARCheck.glow);
        this.ioPrinterCheckLamp.set(p.ioPrinterCheck.glow);
        //this.oflowDummyCheckLamp.set(p.oflowDummyCheck.glow);
        //this.dummy2Lamp.set(p.dummy2Lamp.glow);
        this.diskWRLWBCCheckLamp.set(p.diskWRLWBCCheck.glow);
        this.parityMBRECheckLamp.set(p.parityMBRECheck.glow);
        this.ioReadCheckLamp.set(p.ioReadCheck.glow);
        this.oflowExpCheckLamp.set(p.oflowExpCheck.glow);
        //this.dummy3Lamp.set(p.dummy3Lamp.glow);
        this.diskCylOflowCheckLamp.set(p.diskCylOflowCheck.glow);
        this.parityMBROCheckLamp.set(p.parityMBROCheck.glow);
        this.ioWriteCheckLamp.set(p.ioWriteCheck.glow);
        this.oflowArithCheckLamp.set(p.oflowArithCheck.glow);
    }

    /**************************************/
    controlSwitchClick(ev) {
        /* Event handler for the pane's switch controls */
        let e = ev.target;
        let p = this.context.processor;

        if (e.tagName == "IMG") {
            e = e.parentElement;        // adjust for clicking image of ToggleSwitch objects
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
    marSelectorChange(position) {
        /* Handler for changes in the MARS Selector knob position */

        this.context.processor.marSelectorKnob = position;
        this.context.processor.regMAR.binaryValue = position;   // **DEBUG ** //
    }

    /**************************************/
    async systemReset(ev) {
        /* Event handler for the RESET button */
        let timer = new Timer();

        if (this.context.processor.STOP.value) {  // system halted
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
        this.marSelectorKnob.removeChangeListener(this.boundMARSelectorChange);
        this.powerReadyLamp.set(0);
        this.powerOnLamp.set(0);
        if (this.intervalToken) {
            this.window.clearInterval(this.intervalToken);
            this.intervalToken = 0;
        }

        setTimeout(() => {
            this.context.systemShutDown();
            this.window.removeEventListener("beforeunload", this.boundBeforeUnload);
            this.window.close();
        }, 1000);
    }
} // class ControlPanel


// Static class properties

ControlPanel.displayRefreshPeriod = 50; // ms
ControlPanel.offSwitchImage = "./resources/ToggleDown.png";
ControlPanel.onSwitchImage = "./resources/ToggleUp.png";
