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
import {Envir} from "../emulator/Envir.js";
import {FlipFlop} from "../emulator/FlipFlop.js";
import {Register} from "../emulator/Register.js";
import {Timer} from "../emulator/Timer.js";
import {openPopup} from "./PopupUtil.js";

import {AuxCEPanel} from "./AuxCEPanel.js";
import {ColoredLamp} from "./ColoredLamp.js";
import {GateLamp} from "./GateLamp.js";
import {MARSelectorKnob} from "./MARSelectorKnob.js";
import {PanelButton} from "./PanelButton.js";
import {PanelRegister} from "./PanelRegister.js";
import {ToggleSwitch} from "./ToggleSwitch.js";

class ControlPanel {

    // Static class properties

    static displayAlpha = 0.01;         // running average decay factor
    static displayRefreshPeriod = 50;   // ms
    static lampFreezeThreshold = FlipFlop.lampPersistence*2;
    static offSwitchImage = "./resources/ToggleLargeDown.png";
    static onSwitchImage = "./resources/ToggleLargeUp.png";
    static powerBtnOnImage = "./resources/PowerSwitchOn.png";
    static powerBtnOffImage = "./resources/PowerSwitchOff.png";
    static windowHeight = 560;          // window innerHeight, pixels
    static windowWidth = 1414;          // window innerWidth, pixels

    // Public instance properties

    doc = null;                         // window document object
    innerHeight = 0;                    // window specified innerHeight
    window = null;                      // window object

    avgInstructionRate = 0;             // running average instructions/sec
    auxCEPanel = null;                  // Aux CE Panel object
    diskResetLatch = 0;                 // RESET / RELEASE simultaneous sequence pending
    intervalToken = 0;                  // panel refresh timer cancel token
    lastETime = 0;                      // last emulation clock value
    lastInstructionCount = 0;           // prior total instruction count (for average)
    lastRunTime = 0;                    // prior total run time (for average), ms
    modifyLatch = 0;                    // MODIFY / CHECK RESET simultaneous sequence pending
    registerView = false;               // true if Register View is displaying

    /**************************************/
    constructor(context) {
        /* Constructs the 1620 control panel controls and wires up their events.
        "context" is an object passing other objects and callback functions from
        the global script:
            processor is the Processor object
            systemShutDown() shuts down the emulator
        */

        this.context = context;
        this.config = context.config;
        this.systemShutdown = context.systemShutdown;

        this.boundUpdatePanel = this.updatePanel.bind(this);
        this.boundMARSelectorChange = this.marSelectorChange.bind(this);
        this.boundBeforeUnload = this.beforeUnload.bind(this);
        this.boundControlSwitchClick = this.controlSwitchClick.bind(this);
        this.boundSimultaneousButtonDrag = this.simultaneousButtonDrag.bind(this);
        this.boundToggleRegisterView = this.toggleRegisterView.bind(this);
        this.boundOpenDebugPanel = this.openDebugPanel.bind(this);
        this.boundEmergencyOffClick = this.emergencyOffClick.bind(this);
        this.boundPanelUnload = this.panelUnload.bind(this);
        this.boundShutDown = this.shutDown.bind(this);

        // Create the Control Panel window
        let geometry = this.config.formatWindowGeometry("ControlPanel");
        if (geometry.length) {
            [this.innerWidth, this.innerHeight, this.windowLeft, this.windowTop] =
                    this.config.getWindowGeometry("ControlPanel");
        } else {
            this.innerHeight = ControlPanel.windowHeight;
            this.innerWidth =  ControlPanel.windowWidth;
            this.windowLeft =  screen.availWidth - ControlPanel.windowWidth;
            this.windowTop =   0;
            geometry = `,left=${this.windowLeft},top=${this.windowTop}` +
                       `,innerWidth=${this.innerWidth},innerHeight=${this.innerHeight}`;
        }

        openPopup(window, "../webUI/ControlPanel.html", "retro-1620.ControlPanel",
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
    alert(msg) {
        /* Displays an alert from the Control Panel window. This method allows
        Processor and other components to generate alerts without having direct
        access to the UI */

        this.window.alert(msg);
    }

    /**************************************/
    panelOnLoad(ev) {
        /* Initializes the Control Panel window and user interface */
        const p = this.context.processor;
        let panel = null;               // panel DOM object

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
                    caption = idText.replace(/\|/g, "<br>").replace("1ST ", "1<sup class=tiny>st</sup>");
                    idText = idText.replace(/\s/g, "_").replace(/\-/g, "_").replace(/\|/g, "_").replace(/[/]/g, "");
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
        let marCaptions = [
                "OR-1", "OR-2", "OR-3", "OR-4", "OR-5", "CR-1",
                "PR-1", "PR-2", "IR-1", "IR-2", "IR-3", "IR-4"];
        let marPositions = [];
        for (let a=0; a<360; a+=30) {
            marPositions.push((a+315)%360);
        }

        p.marSelectorKnob = this.config.getNode("ControlPanel.MARSelSW");
        this.marSelectorKnob = new MARSelectorKnob(this.$$("MARSelectorDiv"),
                "MARSelectorCupDiv", p.marSelectorKnob, marPositions, marCaptions);

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
        this.regMBR = new PanelRegister(panel, 2, true, 0, "MBR_");
        this.regMBR.lamps[0].setCaption("|<br>1<br>|", false);
        this.regMBR.lamps[1].setCaption("|<br>2<br>|", false);
        this.regMBR.lamps[2].setCaption("|<br>4<br>|", false);
        this.regMBR.lamps[3].setCaption("|<br>8<br>|", false);
        this.regMBR.lamps[4].setCaption("|<br>F<br>|", false);
        this.regMBR.lamps[5].setCaption("|<br>C<br>|", false);

        this.regDummy1 = new PanelRegister(panel, 1, true, 2, "DUMMY1_");

        this.regMIR = new PanelRegister(panel, 2, true, 3, "MIR_");
        this.regMIR.lamps[0].setCaption("|<br>1<br>|", false);
        this.regMIR.lamps[1].setCaption("|<br>2<br>|", false);
        this.regMIR.lamps[2].setCaption("|<br>4<br>|", false);
        this.regMIR.lamps[3].setCaption("|<br>8<br>|", false);
        this.regMIR.lamps[4].setCaption("|<br>F<br>|", false);
        this.regMIR.lamps[5].setCaption("|<br>C<br>|", false);

        // Operation, Multiplier/Quotient, and Data Registers
        panel = this.$$("Panel4Blue");
        this.regOP = new PanelRegister(panel, 2, false, 0, "OR_");
        this.regOP.lamps[0].setCaption("|<br>1<br>|", false);
        this.regOP.lamps[1].setCaption("|<br>2<br>|", false);
        this.regOP.lamps[2].setCaption("|<br>4<br>|", false);
        this.regOP.lamps[3].setCaption("|<br>8<br>|", false);
        this.regOP.lamps[5].setCaption("|<br>C<br>|", false);           // no lamp[4] for flag

        this.regMQ = new PanelRegister(panel, 1, false, 2, "MQ_");
        this.regMQ.lamps[0].setCaption("1", false);
        this.regMQ.lamps[1].setCaption("2", false);
        this.regMQ.lamps[2].setCaption("4", false);
        this.regMQ.lamps[3].setCaption("8", false);
        this.regMQ.lamps[5].setCaption("C", false);                     // no lamp[4] for flag

        this.regDR = new PanelRegister(panel, 2, false, 3, "DR_");
        this.regDR.lamps[0].setCaption("|<br>1<br>|", false);
        this.regDR.lamps[1].setCaption("|<br>2<br>|", false);
        this.regDR.lamps[2].setCaption("|<br>4<br>|", false);
        this.regDR.lamps[3].setCaption("|<br>8<br>|", false);
        this.regDR.lamps[5].setCaption("|<br>C<br>|", false);           // no lamp[4] for flag

        // Instruction & Execution Cycle
        buildGatePanel("Panel3Gray", 3, [
            "I-1", "I-6",  "E-1",
            "I-2", "IA-1", "E-2",
            "I-3", "IA-2", "E-3",
            "I-4", "IA-3", "E-4",
            "I-5", "IX",   "E-5"]);

        // Input-Output
        buildGatePanel("Panel2Blue", 7, [
            "RD", "WR", "CHAR|GATE", "RDR|FEED", "PCH|FEED", "I/O|FLAG", "RESP|GATE",
            "REL", "DISK|OP", "DISK LD|ZERO", "DISK|ADDR", "SCTR|COUNT", "MEM|ADDR", "SCTR|CYC",
            null, null, null, "DISK|HUND", "DISK|UNIT", "SIMO|HOLD", "SIMO|30",
            null, null, null, null, null, null, null,
            null, "PC|H/P", "PC|E/Z", "PC|OFLO", "PC|TR 8", "PC|IND", "PC|6XXX"]);

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
        this.thermalLamp = new ColoredLamp(panel, null, null, "ThermalLamp", "THERMAL", "panel orangeLamp", "panel orangeLamp orangeLit");
        this.writeInterlockLamp = new ColoredLamp(panel, null, null, "WriteInterlockLamp", "WRITE<br>INTERLOCK", "panel orangeLamp", "panel orangeLamp orangeLit");
        this.readInterlockLamp = new ColoredLamp(panel, null, null, "ReadInterlockLamp", "READ<br>INTERLOCK", "panel orangeLamp", "panel orangeLamp orangeLit");
        this.saveLamp = new ColoredLamp(panel, null, null, "SaveLamp", "SAVE", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.twprSelectLamp = new ColoredLamp(panel, null, null, "TypewriterSelectLamp", "TWPR<br>SELECT", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.RFE1Lamp = new ColoredLamp(panel, null, null, "RFE1Lamp", "&nbsp;", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.RFE2Lamp = new ColoredLamp(panel, null, null, "RFE2Lamp", "&nbsp;", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.RFE3Lamp = new ColoredLamp(panel, null, null, "RFE3Lamp", "&nbsp;", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.automaticLamp = new ColoredLamp(panel, null, null, "AutomaticLamp", "AUTOMATIC", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.manualLamp = new ColoredLamp(panel, null, null, "ManualLamp", "MANUAL", "panel whiteLamp", "panel whiteLamp whiteLit");
        this.checkStopLamp = new ColoredLamp(panel, null, null, "CheckStopLamp", "CHECK<br>STOP", "panel orangeLamp", "panel orangeLamp orangeLit");

        this.powerBtn = this.$$("PowerBtn");
        //this.powerBtn = new PanelButton(panel, null, null, "PowerBtn", "POWER", "panel darkBlueButton", "darkBlueButtonDown");
        this.powerBtn.src = ControlPanel.powerBtnOffImage;
        this.powerBtn.title = "Double-click to power off and shut down the emulator";
        this.resetBtn = new PanelButton(panel, null, null, "ResetBtn", "RESET", "panel darkBlueButton", "darkBlueButtonDown");
        this.modifyBtn = new PanelButton(panel, null, null, "ModifyBtn", "MODIFY", "panel darkBlueButton", "darkBlueButtonDown");
        this.checkResetBtn = new PanelButton(panel, null, null, "CheckResetBtn", "CHECK<br>RESET", "panel darkBlueButton", "darkBlueButtonDown");
        this.displayMARBtn = new PanelButton(panel, null, null, "DisplayMARBtn", "DISPLAY<br>MAR", "panel darkBlueButton", "darkBlueButtonDown");
        this.saveBtn = new PanelButton(panel, null, null, "SaveBtn", "SAVE", "panel darkBlueButton", "darkBlueButtonDown");
        this.releaseBtn = new PanelButton(panel, null, null, "ReleaseBtn", "RELEASE", "panel darkBlueButton", "darkBlueButtonDown");
        this.insertBtn = new PanelButton(panel, null, null, "InsertBtn", "INSERT", "panel darkBlueButton", "darkBlueButtonDown");
        this.RFE1Btn = new PanelButton(panel, null, null, "RFE1Btn", "&nbsp;", "panel darkBlueButton", "darkBlueButtonDown");
        this.RFE2Btn = new PanelButton(panel, null, null, "RFE2Btn", "&nbsp;", "panel darkBlueButton", "darkBlueButtonDown");
        this.startBtn = new PanelButton(panel, null, null, "StartBtn", "START", "panel darkBlueButton", "darkBlueButtonDown");
        this.stopSIEBtn = new PanelButton(panel, null, null, "StopSIEBtn", "STOP<br>SIE", "panel darkBlueButton", "darkBlueButtonDown");
        this.stopSCEBtn = new PanelButton(panel, null, null, "StopSCEBtn", "INSTANT<br>STOP<br>SCE", "panel darkBlueButton", "darkBlueButtonDown");

        // Check Stop Panel Switches & Lamps
        panel = this.$$("CheckStopPanel");
        this.dummy1Lamp = new GateLamp(panel, null, null, "Dummy1Lamp");
        this.diskAddrCheckLamp = new GateLamp(panel, null, null, "DiskAddrCheckLamp");
        this.diskAddrCheckLamp.setCaption("ADDR CHK", false);
        this.parityMARCheckLamp = new GateLamp(panel, null, null, "ParityMARCheckLamp");
        this.parityMARCheckLamp.setCaption("MAR CHK", false);
        this.ioPrinterCheckLamp = new GateLamp(panel, null, null, "IOPrinterCheckLamp");
        this.ioPrinterCheckLamp.setCaption("PR CHK", false);
        this.oflowDummyCheckLamp = new GateLamp(panel, null, null, "OflowDummyCheckLamp");

        this.dummy2Lamp = new GateLamp(panel, null, null, "Dummy2Lamp");
        this.diskWLRRBCCheckLamp = new GateLamp(panel, null, null, "DiskWLRRBCCheckLamp");
        this.diskWLRRBCCheckLamp.setCaption("WLR RBC", false);
        this.parityMBREvenCheckLamp = new GateLamp(panel, null, null, "ParityMBREvenCheckLamp");
        this.parityMBREvenCheckLamp.setCaption("MBR-E CHK", false);
        this.ioReadCheckLamp = new GateLamp(panel, null, null, "IOReadCheckLamp");
        this.ioReadCheckLamp.setCaption("RD CHK", false);
        this.oflowExpCheckLamp = new GateLamp(panel, null, null, "OflowExpCheckLamp");
        this.oflowExpCheckLamp.setCaption("EXP CHK", false);

        this.dummy3Lamp = new GateLamp(panel, null, null, "Dummy3Lamp");
        this.diskCylOflowCheckLamp = new GateLamp(panel, null, null, "DiskCylOflowCheckLamp");
        this.diskCylOflowCheckLamp.setCaption("|<br>|<br>CYL OFLO", false);
        this.parityMBROddCheckLamp = new GateLamp(panel, null, null, "ParityMBROddCheckLamp");
        this.parityMBROddCheckLamp.setCaption("|<br>|<br>MBR-O CHK", false);
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
        this.diskStopSwitch.set(this.config.getNode("ControlPanel.DiskStopSW"));
        p.diskStopSwitch = this.diskStopSwitch.state;

        this.parityStopSwitch = new ToggleSwitch(panel, null, null, "ParityStopSwitch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.parityStopSwitch.setCaption("|<br>|<br>STOP", false);
        this.parityStopSwitch.setCaption("PROGRAM", true);
        this.parityStopSwitch.set(this.config.getNode("ControlPanel.ParityStopSW"));
        p.parityStopSwitch = this.parityStopSwitch.state;

        this.ioStopSwitch = new ToggleSwitch(panel, null, null, "IOStopSwitch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.ioStopSwitch.setCaption("|<br>|<br>STOP", false);
        this.ioStopSwitch.setCaption("PROGRAM", true);
        this.ioStopSwitch.set(this.config.getNode("ControlPanel.IOStopSW"));
        p.ioStopSwitch = this.ioStopSwitch.state;

        this.oflowStopSwitch = new ToggleSwitch(panel, null, null, "OflowStopSwitch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.oflowStopSwitch.setCaption("|<br>|<br>STOP", false);
        this.oflowStopSwitch.setCaption("PROGRAM", true);
        this.oflowStopSwitch.set(this.config.getNode("ControlPanel.OflowStopSW"));
        p.oflowStopSwitch = this.oflowStopSwitch.state;

        this.program1Switch = new ToggleSwitch(panel, null, null, "Program1Switch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.program1Switch.setCaption("1<br>ON", false);
        this.program1Switch.setCaption("OFF", true);
        this.program1Switch.set(this.config.getNode("ControlPanel.Program1SW"));
        p.program1Switch = this.program1Switch.state;

        this.program2Switch = new ToggleSwitch(panel, null, null, "Program2Switch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.program2Switch.setCaption("2<br>ON", false);
        this.program2Switch.setCaption("OFF", true);
        this.program2Switch.set(this.config.getNode("ControlPanel.Program2SW"));
        p.program2Switch = this.program2Switch.state;

        this.program3Switch = new ToggleSwitch(panel, null, null, "Program3Switch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.program3Switch.setCaption("3<br>ON", false);
        this.program3Switch.setCaption("OFF", true);
        this.program3Switch.set(this.config.getNode("ControlPanel.Program3SW"));
        p.program3Switch = this.program3Switch.state;

        this.program4Switch = new ToggleSwitch(panel, null, null, "Program4Switch",
                ControlPanel.offSwitchImage, ControlPanel.onSwitchImage);
        this.program4Switch.setCaption("4<br>ON", false);
        this.program4Switch.setCaption("OFF", true);
        this.program4Switch.set(this.config.getNode("ControlPanel.Program4SW"));
        p.program4Switch = this.program4Switch.state;

        this.registerView = !this.config.getNode("ControlPanel.RegisterView");  // negate for toggling
        this.toggleRegisterView(ev);
        if (this.config.getNode("ControlPanel.AuxCEPanelView")) {
            this.openAuxCEPanel();
        }

        this.$$("EmulatorVersion").textContent = Version.retro1620Version;
        this.window.addEventListener("beforeunload", this.boundBeforeUnload);
        this.window.addEventListener("unload", this.boundPanelUnload);
        this.$$("OperatorContainer").addEventListener("click", this.boundControlSwitchClick);
        this.$$("OperatorContainer").addEventListener("mouseover", this.boundSimultaneousButtonDrag);
        this.$$("OperatorContainer").addEventListener("mouseout", this.boundSimultaneousButtonDrag);
        this.$$("OperatorContainer").addEventListener("mousedown", this.boundSimultaneousButtonDrag);
        this.$$("OperatorContainer").addEventListener("mouseup", this.boundSimultaneousButtonDrag);
        this.powerBtn.addEventListener("dblclick", this.boundControlSwitchClick);
        this.marSelectorKnob.setChangeListener(this.boundMARSelectorChange);
        this.$$("EmergencyOffSwitch").addEventListener("dblclick", this.boundEmergencyOffClick);
        this.$$("IBMLogo").addEventListener("dblclick", this.boundOpenDebugPanel);

        // Power up and initialize the system.
        this.powerOnLamp.set(0);
        this.powerReadyLamp.set(0);
        this.window.setTimeout(() => {
            this.powerBtn.src = ControlPanel.powerBtnOnImage;
            p.powerUp();
            this.$$("PowerOnLampFX").classList.add("powerUp");
            this.window.setTimeout(() => {      // wait for the DC power supplies...
                p.gatePOWER_READY.value = 1;
                this.$$("PowerOnLampFX").classList.remove("powerUp");
                this.powerOnLamp.set(1);
                this.powerReadyLamp.set(1);
                this.intervalToken = this.window.setTimeout(this.boundUpdatePanel, ControlPanel.displayRefreshPeriod);
            }, 4000);
        }, 500);

        // Recalculate scaling and offsets after initial window resize.
        this.config.restoreWindowGeometry(this.window,
                this.innerWidth, this.innerHeight, this.windowLeft, this.windowTop);
    }

    /**************************************/
    openDebugPanel(ev) {
        /* Opens the DebugPanelDiv and wires up its events */
        const p = this.context.processor;
        const MM = p.MM;
        const memSize = p.envir.memorySize;

        //----------------------------
        const formatDumpHeader = (dumpType) => {
            /* Formats the current state of the system as a string and returns
            the string */
            const config = p.context.config.configData;
            let line = "";
            let text = "";

            const putLine = (line) => {
                text += line + "\n";
            };

            putLine(`// retro-1620 ${dumpType} Dump - ${(new Date()).toString()}`);
            putLine("");

            putLine(`// OR1=${p.regOR1.binaryValue.toString().padStart(5, "0")}` +
                     `  OR2=${p.regOR2.binaryValue.toString().padStart(5, "0")}` +
                     `  OR3=${p.regOR3.binaryValue.toString().padStart(5, "0")}` +
                     `  OR4=${p.regOR4.binaryValue.toString().padStart(5, "0")}` +
                     `  OR5=${p.regOR5.binaryValue.toString().padStart(5, "0")}` +
                     `  CR1=${p.regCR1.binaryValue.toString().padStart(5, "0")}` +
                     `  MAR=${p.regMAR.binaryValue.toString().padStart(5, "0")}`);
            putLine(`// IR1=${p.regIR1.binaryValue.toString().padStart(5, "0")}` +
                     `  IR2=${p.regIR2.binaryValue.toString().padStart(5, "0")}` +
                     `  IR3=${p.regIR3.binaryValue.toString().padStart(5, "0")}` +
                     `  IR4=${p.regIR4.binaryValue.toString().padStart(5, "0")}` +
                     `  PR1=${p.regPR1.binaryValue.toString().padStart(5, "0")}` +
                     `  PR2=${p.regPR2.binaryValue.toString().padStart(5, "0")}` +
                     `  XBR=${p.regXBR.binaryValue.toString().padStart(5, "0")}`);
            putLine(`// OP=${p.regOP.binaryValue.toString().padStart(2, "0")}  ` +
                       `DR=${p.gateFL_2.value ? "~" : " "}${p.regDR.even & Register.bcdMask}` +
                          `${p.gateFL_1.value ? "~" : " "}${p.regDR.odd  & Register.bcdMask}  ` +
                       `MQ=${p.regMQ.binaryValue}  IA=${p.gateIA_SEL.value}  ` +
                       `XR=${p.regXR.binaryValue}  BAND=${p.gateIX_BAND_2.value*2 + p.gateIX_BAND_1.value}`);
            putLine("//");

            line = "// Annunciators: ";
            if (p.gateTHERMAL.value)            {line += "THERMAL "}
            if (p.gateWRITE_INTERLOCK.value)    {line += "WRITE-INTERLOCK "}
            if (p.gateREAD_INTERLOCK.value)     {line += "READ-INTERLOCK "}
            if (p.gateSAVE.value)               {line += "SAVE "}
            if (p.gateTWPR_SELECT.value)        {line += "TWPR-SELECT "}
            if (p.gateAUTOMATIC.value)          {line += "AUTOMATIC "}
            if (p.gateMANUAL.value)             {line += "MANUAL "}
            if (p.gateCHECK_STOP.value)         {line += "CHECK-STOP "}
            putLine(line);

            line = "// Checks: ";
            if (p.diskAddrCheck.value)          {line += "DISK-ADDR "}
            if (p.diskCylOflowCheck.value)      {line += "CYL-OFLOW "}
            if (p.diskWLRRBCCheck.value)        {line += "WLRRBC "}
            if (p.ioPrinterCheck.value)         {line += "PRINTER "}
            if (p.ioReadCheck.value)            {line += "READ "}
            if (p.ioWriteCheck.value)           {line += "WRITE "}
            if (p.oflowArithCheck.value)        {line += "ARITH-OFLOW "}
            if (p.oflowExpCheck.value)          {line += "EXP-OFLOW "}
            if (p.parityMARCheck.value)         {line += "MAR-PARITY "}
            if (p.parityMBREvenCheck.value)     {line += "MBR-E-PARITY "}
            if (p.parityMBROddCheck.value)      {line += "MBR-O-PARITY "}
            putLine(line);

            putLine(`// PS1=${p.program1Switch}, PS2=${p.program2Switch}, PS3=${p.program3Switch}, PS4=${p.program4Switch}, ` +
                    `Stop: Disk=${p.diskStopSwitch}, Parity=${p.parityStopSwitch}, I/O=${p.ioStopSwitch}, Oflow=${p.oflowStopSwitch}, ` +
                    `MARS: ${p.marSelectorKnob}`);

            line = `// Config: ${config.configName}, Memory ${memSize}`;
            if (p.xrInstalled) {line += ", Index Registers"}
            if (p.fpInstalled) {line += ", Floating Point"}
            if (p.bcInstalled) {line += ", Binary Capabilities"}
            putLine(line);

            line = "// Devices:";
            if (config.Card.hasCard) {line += ` Card ${config.Card.cpmRead}/${config.Card.cpmPunch} CPM,`}
            if (config.Printer.hasPrinter) {line += ` Printer ${config.Printer.lpm} LPM,`}
            if (config.Plotter.hasPlotter) {line += ` Plotter Model 1,`}
            if (config.Disk.hasDisk) {
                line += " Disk modules ";
                for (let x=0; x<config.Disk.module.length; ++x) {
                    if (config.Disk.module[x].enabled) {line += `${x},`}
                }
            }
            putLine(line.slice(0, -1));
            return text;
        };

        //----------------------------
        const formatCMEMDump = (putLine) => {
            /* Formats the contents of memory in CMEM format and outputs it
            through the putLine() function parameter */
            const dpl = 20;             // digits per line
            const xtra = Math.floor((dpl-1)/10) + 8;    // overhead chars on digit line
            let addr = 0;               // current memory address
            let alpha = "";             // alpha interpretation of digit pairs
            let digit = 0;              // current memory digit
            let digits = dpl;           // digits on current line
            let lastDigit = 0;          // prior digit output
            let line = "";              // line assembly buffer
            let lineAddr = 0;           // address of start of line
            let pair = MM[0];           // current memory cell digit pair
            let state = 0;              // FSA state variable
            let zeroes = 0;             // count of contiguous zero digits

            const pairMask = ((Register.notParityMask << Register.digitBits) | Register.notParityMask);

            const startLine = (addr) => {
                line = addr.toString().padStart(5, "0") + ":";
                lineAddr = addr;
                digits = 0;
                alpha = "";
            };

            const endLine = () => {
                if (alpha.length) {
                    putLine(line.padEnd(dpl*3+xtra, " ") + "// " + alpha);
                } else {
                    putLine(line);
                }
            };

            const putDigit = (digit) => {
                line += digit.toString(16).toUpperCase().padStart((digits > 0 && digits%10 == 0 ? 4 : 3), " ");
                if (digits & 1) {
                    alpha += Envir.alphaGlyphs[(lastDigit & Register.bcdMask)*16 + (digit & Register.bcdMask)];
                }

                lastDigit = digit;
                ++digits;
            };

            while (addr < memSize) {
                pair = MM[addr >> 1];
                if ((pair & pairMask) == 0) {
                    zeroes += 2;                // count contiguous unflagged zeroes
                } else {
                    // Fill in any unflagged zeros that will fit on the line.
                    while (zeroes && digits < dpl) {
                        putDigit(0);
                        --zeroes;
                    }

                    // If there are remaining zeroes, skip to the line with the current address.
                    if (zeroes) {
                        endLine();
                        if (zeroes >= dpl) {    // at least one line of zeroes
                            putLine("");
                        }

                        zeroes = 0;
                        startLine(Math.floor(addr/dpl)*dpl);
                        while (lineAddr+digits < addr) {// output any leading zeroes
                            putDigit(0);
                        }
                    }

                    // Output the current non-zero pair, starting a new line as needed.
                    if (digits >= dpl) {
                        endLine();
                        startLine(addr);
                    }

                    putDigit((pair >> Register.digitBits) & Register.notParityMask);
                    putDigit(pair & Register.notParityMask);
                }

                // Increment memory address.
                addr += 2;
            }

            if (digits) {
                endLine();
            }

            putLine("");
            putLine("// End CMEM Dump");
        };

        //----------------------------
        const buildCMEMView = (ev) => {
            /* Handles the onLoad event for the CMEM view pop-up window and
            populates the window with the CMEM dump */
            const doc = ev.target;
            const win = doc.defaultView;
            const text = doc.getElementById("Paper");
            const title = "retro-1620 CMEM Memory Dump";

            const putLine = (line) => {
                text.appendChild(doc.createTextNode(line.trimEnd() + "\n"));
            };

            doc.title = title;
            win.moveTo((screen.availWidth-win.outerWidth)/2, (screen.availHeight-win.outerHeight)/2);
            putLine(formatDumpHeader("CMEM"));
            formatCMEMDump(putLine);
        };

        //----------------------------
        const initiateCMEMView = (ev) => {
            /* Formats the contents of core memory to a pop-up window, from which the
            user can copy/save/print it as they desire */
            const title = "retro-1620 CMEM Memory Dump";

            openPopup(this.window, "./FramePaper.html", "",
                    "scrollbars,resizable,width=640,height=500", this, buildCMEMView);
            closeDebugPanel(ev);
        };

        //----------------------------
        const saveCMEMFile = (ev) => {
            /* Formats the contents of core memory to a text file in CMEM format */
            let text = "";
            const title = "retro-1620 CMEM Memory Dump.cmem";

            const putLine = (line) => {
                text += line.trimEnd() + "\n";
            };

            putLine(formatDumpHeader("CMEM"));
            formatCMEMDump(putLine);

            const url = `data:text/plain,${encodeURIComponent(text)}`;
            const hiddenLink = this.doc.createElement("a");

            hiddenLink.setAttribute("download", title);
            hiddenLink.setAttribute("href", url);
            hiddenLink.click();
            closeDebugPanel(ev);
        };

        //----------------------------
        const initiateCMEMLoad = (ev) => {
            /* Handle the <input type=file> onchange event when a file is selected
            to initiate a CMEM load */

            const fileLoader_onLoad = (ev) => {
                /* Handle the onLoad event for a Text FileReader and pass the text
                of the file to the processsor for loading into memory */

                const msg = this.context.processor.loadCMEMFile(ev.target.result);
                if (msg.length) {
                    this.window.alert(msg);
                }

                closeDebugPanel(ev);
            };

            const reader = new FileReader();
            reader.onload = fileLoader_onLoad;
            reader.readAsText(ev.target.files[0]);
        };

        //----------------------------
        const formatMemDump = (putLine) => {
            /* Formats the contents of memory in MemDump format and outputs it
            through the putLine() function parameter */
            const dpl = 50;             // digits per line
            const xtra = Math.floor((dpl-1)/10) + 9;    // overhead chars on digit line
            let addr = 0;               // current memory address
            let alpha = "";             // alpha interpretation of digit pairs
            let digit = 0;              // current memory digit
            let digits = dpl;           // digits on current line
            let flagLine = "";          // formatting line for digit flags
            let lastDigit = 0;          // prior digit output
            let line = "";              // line assembly buffer
            let lineAddr = 0;           // address of start of line
            let pair = MM[0];           // current memory cell digit pair
            let state = 0;              // FSA state variable
            let zeroes = 0;             // count of contiguous zero digits

            const pairMask = ((Register.notParityMask << Register.digitBits) | Register.notParityMask);

            const startLine = (addr) => {
                line = addr.toString().padStart(5, "0") + ": ";
                lineAddr = addr;
                digits = 0;
                alpha = "";
                flagLine = (" ").repeat(line.length);
            };

            const endLine = () => {
                putLine(flagLine);
                if (alpha.length) {
                    putLine(line.padEnd(dpl+xtra, " ") + "// " + alpha);
                } else {
                    putLine(line);
                }
            };

            const putDigit = (digit) => {
                line += (digit & Register.bcdMask).toString(16).toUpperCase();
                flagLine += (digit & Register.flagMask) ? "_" : " ";
                if (digits & 1) {
                    alpha += Envir.alphaGlyphs[(lastDigit & Register.bcdMask)*16 + (digit & Register.bcdMask)];
                }

                lastDigit = digit;
                ++digits;
                if (digits%10 == 0) {
                    flagLine += " ";
                    line += " ";
                }
            };

            while (addr < memSize) {
                pair = MM[addr >> 1];
                if ((pair & pairMask) == 0) {
                    zeroes += 2;                // count contiguous unflagged zeroes
                } else {
                    // Fill in any unflagged zeros that will fit on the line.
                    while (zeroes && digits < dpl) {
                        putDigit(0);
                        --zeroes;
                    }

                    // If there are remaining zeroes, skip to the line with the current address.
                    if (zeroes) {
                        endLine();
                        if (zeroes >= dpl) {    // at least one line of zeroes
                            putLine("");
                            putLine("");
                        }

                        zeroes = 0;
                        startLine(Math.floor(addr/dpl)*dpl);
                        while (lineAddr+digits < addr) {// output any leading zeroes
                            putDigit(0);
                        }
                    }

                    // Output the current non-zero digit pair, starting a new line as needed.
                    if (digits >= dpl) {
                        endLine();
                        startLine(addr);
                    }

                    putDigit((pair >> Register.digitBits) & Register.notParityMask);
                    putDigit(pair & Register.notParityMask);
                }

                // Increment memory address.
                addr += 2;
            }

            if (digits) {
                endLine();
            }

            putLine("");
            putLine("// End Memory Dump");
        };

        //----------------------------
        const buildMemDumpView = (ev) => {
            /* Handles the onLoad event for the MemDump view pop-up window and
            populates the window with the MemDump */
            const doc = ev.target;
            const win = doc.defaultView;
            const text = doc.getElementById("Paper");
            const title = "retro-1620 Memory Dump";

            const putLine = (line) => {
                text.appendChild(doc.createTextNode(line.trimEnd() + "\n"));
            };

            doc.title = title;
            win.moveTo((screen.availWidth-win.outerWidth)/2, (screen.availHeight-win.outerHeight)/2);
            putLine(formatDumpHeader("Memory Dump"));
            formatMemDump(putLine);
        };

        //----------------------------
        const initiateMemDumpView = (ev) => {
            /* Formats the contents of core memory to a pop-up window, from which the
            user can copy/save/print it as they desire */
            const title = "retro-1620 Memory Dump";

            openPopup(this.window, "./FramePaper.html", "",
                    "scrollbars,resizable,width=700,height=500", this, buildMemDumpView);
            closeDebugPanel(ev);
        };

        //----------------------------
        const toggleRegisterView = (ev) => {
            /* Handle the click event on the RegisterView check box */

            this.toggleRegisterView();
        };

        //----------------------------
        const toggleAuxCEPanelView = (ev) => {
            /* Handle the click event on the AuxCEPanelView check box */

            if (ev.target.checked) {
                this.openAuxCEPanel();
            } else {
                this.closeAuxCEPanel();
            }
        };

        //----------------------------
        const closeDebugPanel = (ev) => {
            /* Unwires the local events and closes the load panel */

            this.$$("DebugCloseBtn").removeEventListener("click", closeDebugPanel);
            this.$$("RegisterViewCheck").removeEventListener("click", toggleRegisterView);
            this.$$("AuxCEPanelViewCheck").removeEventListener("click", toggleAuxCEPanelView);
            this.$$("MemoryDumpBtn").removeEventListener("click", initiateMemDumpView);
            this.$$("CMEMSaveBtn").removeEventListener("click", saveCMEMFile);
            this.$$("CMEMDumpBtn").removeEventListener("click", initiateCMEMView);
            this.$$("CMEMSelector").removeEventListener("change", initiateCMEMLoad);
            this.$$("CMEMSelector").value = null;       // reset the file-picker control
            this.$$("DebugPanelDiv").style.display = "none";
        };

        //----------------------------
        this.$$("RegisterViewCheck").checked = this.registerView;
        this.$$("AuxCEPanelViewCheck").checked = this.auxCEPanel !== null;

        this.$$("DebugPanelDiv").style.display = "block";
        this.$$("RegisterViewCheck").addEventListener("click", toggleRegisterView);
        this.$$("AuxCEPanelViewCheck").addEventListener("click", toggleAuxCEPanelView);
        this.$$("CMEMSelector").addEventListener("change", initiateCMEMLoad);
        this.$$("CMEMDumpBtn").addEventListener("click", initiateCMEMView);
        this.$$("CMEMSaveBtn").addEventListener("click", saveCMEMFile);
        this.$$("MemoryDumpBtn").addEventListener("click", initiateMemDumpView);
        this.$$("DebugCloseBtn").addEventListener("click", closeDebugPanel);
    }

    /**************************************/
    emergencyOffClick(ev) {
        /* Handles the don't-you-dare-do-this double-click of the Emergency Off switch */
        const p = this.context.processor;

        this.window.clearTimeout(this.intervalToken);
        p.enterManual();
        p.manualReset();
        p.powerDown();
        this.powerReadyLamp.set(0);
        this.powerOnLamp.set(0);
        this.updatePanel();
        this.$$("AlarmSound").volume = 1.0;
        this.$$("AlarmSound").play();
    }

    /**************************************/
    openAuxCEPanel() {
        /* Opens the AuxCEPanel */

        if (!this.auxCEPanel) {
           this.auxCEPanel = new AuxCEPanel(this.context);
           this.config.putNode("ControlPanel.AuxCEPanelView", 1);
        }
    }

    /**************************************/
    closeAuxCEPanel() {
        /* Closes the AuxCEPanel */

        if (this.auxCEPanel) {
            this.auxCEPanel.shutDown();
            this.auxCEPanel = null;
            this.config.putNode("ControlPanel.AuxCEPanelView", 0);
        }
    }

    /**************************************/
    postAuxCEPanelClosed() {
        /* Handles notification that the AuxCEPanel has been closed manually */

        this.auxCEPanel = null;
        this.config.putNode("ControlPanel.AuxCEPanelView", 0);
    }

    /**************************************/
    toggleRegisterView(ev) {
        /* Toggles display of the Register View and RunStats panels */

        this.registerView = !this.registerView;
        if (this.registerView) {
           this.$$("RegisterViewTable").style.display = "table";
           this.$$("RunStatsTable").style.display = "table";
           this.config.putNode("ControlPanel.RegisterView", 1);
        } else {
           this.$$("RegisterViewTable").style.display = "none";
           this.$$("RunStatsTable").style.display = "none";
           this.config.putNode("ControlPanel.RegisterView", 0);
        }
    }

    /**************************************/
    toggleTracing(ev) {
        /* Toggles the Processor's tracing option */
        const p = this.context.processor;

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
        const p = this.context.processor;

        if (!p) {
            return;                     // probably got caught in a shutdown
        } else {
            const eTime = p.envir.eTime;
            if (eTime - this.lastETime <= ControlPanel.lampFreezeThreshold) {
                p.updateLampGlow(1);    // Processor is not executing: freeze lamps
            } else {
                this.lastETime = eTime;
                p.updateLampGlow(0);
            }
        }

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
        this.gateX_4.set(p.regXR.glow[2]);
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
        this.gateX_2.set(p.regXR.glow[1]);
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
        this.gateX_1.set(p.regXR.glow[0]);
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

        /********** PC_* registers used on IBM 1710 only **********
        //this.gatePC_HP.set(p.gatePC_HP.glow);
        //this.gatePC_EZ.set(p.gatePC_EZ.glow);
        //this.gatePC_OFLO.set(p.gatePC_OFLO.glow);
        //this.gatePC_TR_8.set(p.gatePC_TR_8.glow);
        //this.gatePC_IND.set(p.gatePC_IND.glow);
        //this.gatePC_6XXX.set(p.gatePC_6XXX.glow);
        **********************************************************/

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
        this.regOP.updateLampGlow(p.regOP.glow);
        this.regMQ.updateLampGlow(p.regMQ.glow);
        this.regDR.updateLampGlow(p.regDR.glow);
        this.regMBR.updateLampGlow(p.regMBR.glow);
        //this.regDummy1.updateLampGlow(p.regDummy1.glow);
        this.regMIR.updateLampGlow(p.regMIR.glow);
        this.regMAR.updateLampGlow(p.regMAR.glow);

        // Operator Control Panel lamps
        // Note: this.powerOnLamp and this.powerReadyLamp are not updated, since they are on constantly
        this.thermalLamp.set(p.gateTHERMAL.glow);
        this.writeInterlockLamp.set(p.gateWRITE_INTERLOCK.glow);
        this.readInterlockLamp.set(p.gateREAD_INTERLOCK.glow);
        this.saveLamp.set(p.gateSAVE.glow);
        this.twprSelectLamp.set(p.gateTWPR_SELECT.glow);
        //this.RFE1Lamp.set(p.gateRFE1Lamp.glow);
        //this.RFE2Lamp.set(p.gateRFE2Lamp.glow);
        //this.RFE3Lamp.set(p.gateRFE3Lamp.glow);
        this.automaticLamp.set(p.gateAUTOMATIC.glow);
        this.manualLamp.set(p.gateMANUAL.glow);
        this.checkStopLamp.set(p.gateCHECK_STOP.glow);

        // Check Indicators panel
        //this.dummy1Lamp.set(p.dummy1Lamp.glow);
        this.diskAddrCheckLamp.set(p.diskAddrCheck.glow);
        this.parityMARCheckLamp.set(p.parityMARCheck.glow);
        this.ioPrinterCheckLamp.set(p.ioPrinterCheck.glow);
        //this.oflowDummyCheckLamp.set(p.oflowDummyCheck.glow);
        //this.dummy2Lamp.set(p.dummy2Lamp.glow);
        this.diskWLRRBCCheckLamp.set(p.diskWLRRBCCheck.glow);
        this.parityMBREvenCheckLamp.set(p.parityMBREvenCheck.glow);
        this.ioReadCheckLamp.set(p.ioReadCheck.glow);
        this.oflowExpCheckLamp.set(p.oflowExpCheck.glow);
        //this.dummy3Lamp.set(p.dummy3Lamp.glow);
        this.diskCylOflowCheckLamp.set(p.diskCylOflowCheck.glow);
        this.parityMBROddCheckLamp.set(p.parityMBROddCheck.glow);
        this.ioWriteCheckLamp.set(p.ioWriteCheck.glow);
        this.oflowArithCheckLamp.set(p.oflowArithCheck.glow);

        // Register View & Delay Stats Tables **DEBUG**
        if (this.registerView) {
            this.$$("ViewOR1").textContent = p.regOR1.toBCDString();
            this.$$("ViewOR2").textContent = p.regOR2.toBCDString();
            this.$$("ViewOR3").textContent = p.regOR3.toBCDString();
            this.$$("ViewOR4").textContent = p.regOR4.toBCDString();
            this.$$("ViewOR5").textContent = p.regOR5.toBCDString();
            this.$$("ViewCR1").textContent = p.regCR1.toBCDString();
            this.$$("ViewMAR").textContent = p.regMAR.toBCDString();
            this.$$("ViewIR1").textContent = p.regIR1.toBCDString();
            this.$$("ViewIR2").textContent = p.regIR2.toBCDString();
            this.$$("ViewIR3").textContent = p.regIR3.toBCDString();
            this.$$("ViewIR4").textContent = p.regIR4.toBCDString();
            this.$$("ViewPR1").textContent = p.regPR1.toBCDString();
            this.$$("ViewPR2").textContent = p.regPR2.toBCDString();
            this.$$("ViewXBR").textContent = p.regXBR.toBCDString();

            const now = performance.now();
            let runTime = p.runTime;
            while (runTime < 0) {
                runTime += now;
            }

            this.$$("AvgDelay").textContent =       p.avgThrottleDelay.toFixed(2);
            this.$$("AvgDelayDelta").textContent =  p.avgThrottleDelta.toFixed(2);
            this.$$("TotalRunTime").textContent =   (runTime/1000).toFixed(2);
            if (runTime != this.lastRunTime) {
                this.avgInstructionRate = this.avgInstructionRate*(1-ControlPanel.displayAlpha) +
                        ((p.instructionCount-this.lastInstructionCount)/
                            ((runTime-this.lastRunTime)/1000))*ControlPanel.displayAlpha;
                this.$$("AvgInstructionRate").textContent = this.avgInstructionRate.toFixed(2);
                this.lastRunTime = runTime;
                this.lastInstructionCount = p.instructionCount;
            }
        }

        this.intervalToken = this.window.setTimeout(this.boundUpdatePanel, ControlPanel.displayRefreshPeriod);
    }

    /**************************************/
    controlSwitchClick(ev) {
        /* Event handler for the pane's switch controls */
        let e = ev.target;
        let modifyClicked = false;      // MODIFY button was pressed this time
        let resetClicked = false;       // RESET button was pressed this time
        const p = this.context.processor;

        if (e.tagName == "IMG" && e.parentElement.id.endsWith("Switch")) {
            e = e.parentElement;        // adjust for clicking image of ToggleSwitch objects
        }

        switch (e.id) {
        case "PowerBtn":
            if (ev.type == "dblclick") {
                this.shutDown();
            }
            break;
        case "ResetBtn":
            p.manualReset();
            break;
        case "ModifyBtn":
            modifyClicked = true;
            this.modifyLatch = 1;
            this.modifyBtn.setButtonDown();     // show that it's now armed
            break;
        case "CheckResetBtn":
            if (!this.modifyLatch) {
                p.checkReset();
            } else {
                p.enableMemoryClear();
                this.modifyBtn.setButtonUp();   // clear the armed appearance
            }
            break;
        case "DisplayMARBtn":
            p.displayMAR();
            break;
        case "SaveBtn":
            p.saveIR1();
            break;
        case "InsertBtn":
            p.insert(false);
            break;
        case "ReleaseBtn":
            p.release();
            break;
        case "StartBtn":
            p.start();
            break;
        case "StopSIEBtn":
            p.stopSIE();
            break;
        case "StopSCEBtn":
            p.stopSCE();
            break;
        case "Dummy1Switch":            // non-functional, just turn it back off
            this.dummy1Switch.flip();
            this.window.setTimeout(() => {this.dummy1Switch.flip()}, 250);
            break;
        case "DiskStopSwitch":
            this.diskStopSwitch.flip();
            this.config.putNode("ControlPanel.DiskStopSW", this.diskStopSwitch.state);
            p.diskStopSwitch = this.diskStopSwitch.state;
            p.verifyCheckStop();
            break;
        case "ParityStopSwitch":
            this.parityStopSwitch.flip();
            this.config.putNode("ControlPanel.ParityStopSW", this.parityStopSwitch.state);
            p.parityStopSwitch = this.parityStopSwitch.state;
            p.verifyCheckStop();
            break;
        case "IOStopSwitch":
            this.ioStopSwitch.flip();
            this.config.putNode("ControlPanel.IOStopSW", this.ioStopSwitch.state);
            p.ioStopSwitch = this.ioStopSwitch.state;
            p.verifyCheckStop();
            break;
        case "OflowStopSwitch":
            this.oflowStopSwitch.flip();
            this.config.putNode("ControlPanel.OflowStopSW", this.oflowStopSwitch.state);
            p.oflowStopSwitch = this.oflowStopSwitch.state;
            p.verifyCheckStop();
            break;
        case "Program1Switch":
            this.program1Switch.flip();
            this.config.putNode("ControlPanel.Program1SW", this.program1Switch.state);
            p.program1Switch = this.program1Switch.state;
            break;
        case "Program2Switch":
            this.program2Switch.flip();
            this.config.putNode("ControlPanel.Program2SW", this.program2Switch.state);
            p.program2Switch = this.program2Switch.state;
            break;
        case "Program3Switch":
            this.program3Switch.flip();
            this.config.putNode("ControlPanel.Program3SW", this.program3Switch.state);
            p.program3Switch = this.program3Switch.state;
            break;
        case "Program4Switch":
            this.program4Switch.flip();
            this.config.putNode("ControlPanel.Program4SW", this.program4Switch.state);
            p.program4Switch = this.program4Switch.state;
            break;
        }

        if (!modifyClicked) {           // reset latch if any key other than MODIFY was pressed
            this.modifyLatch = 0;
        }

        if (!resetClicked) {            // reset latch if any key other than RESET was pressed
            this.diskResetLatch = 0;
        }
    }

    /**************************************/
    simultaneousButtonDrag(ev) {
        /* Event handler simulating the simultaneous press of two buttons on the
        lower panel of the Control Panel. If there is a mouse-down on button A
        and the very next mouse-up on the lower panel is on button B, then that
        is interpreted as a simultaneous press of the two buttons. This approach
        was suggested by Dave Babcock. It currently works for these combinations:
            Button A: MODIFY, Button B: CHECK RESET -- clear memory
            Burron A: RESET,  Button B: RELEASE     -- reset Disk Check indicators
        For MODIFY and CHECK RESET, this mechanism works independently of the
        original method, clicking MODIFY and then clicking CHECK RESET, which
        still works */
        let e = ev.target;

        switch (e.id) {
        case "ModifyBtn":
            switch (ev.type) {
            case "mousedown":
                this.modifyLatch = 1;
                break;
            case "mouseover":
                if (this.modifyLatch) {
                    this.modifyBtn.setButtonDown();
                    break;
                }
            }
            break;

        case "CheckResetBtn":
            if (this.modifyLatch) {
                switch (ev.type) {
                case "mouseup":
                    this.modifyBtn.setButtonUp();       // cancel the effect of its mousedown
                    this.modifyLatch = 0;
                    this.context.processor.enableMemoryClear();
                    break;
                case "mouseover":
                    this.checkResetBtn.setButtonDown();
                    this.modifyBtn.setButtonDown();     // make sure the MODIFY button shows down
                    break;
                case "mouseout":
                    this.checkResetBtn.setButtonUp();
                    break;
                }
            }
            break;

        case "ResetBtn":
            switch (ev.type) {
            case "mousedown":
                this.diskResetLatch = 1;
                break;
            case "mouseover":
                if (this.diskResetLatch) {
                    this.resetBtn.setButtonDown();
                    break;
                }
            }
            break;

        case "ReleaseBtn":
            if (this.diskResetLatch) {
                switch (ev.type) {
                case "mouseup":
                    this.resetBtn.setButtonUp();        // cancel the effect of its mousedown
                    this.diskResetLatch = 0;
                    this.context.processor.diskReset();
                    break;
                case "mouseover":
                    this.releaseBtn.setButtonDown();
                    this.resetBtn.setButtonDown();      // make sure the RESET button shows down
                    break;
                case "mouseout":
                    this.releaseBtn.setButtonUp();
                    break;
                }
            }
            break;

        default:
            switch (ev.type) {
            case "mousedown":
            case "mouseup":
                if (this.modifyLatch) {
                    this.modifyBtn.setButtonUp();
                    this.modifyLatch = 0;
                }
                break;
            }
        }
    }

    /**************************************/
    marSelectorChange(position) {
        /* Handler for changes in the MARS Selector knob position */

        this.context.processor.marSelectorKnob = position;
        this.config.putNode("ControlPanel.MARSelSW", position);
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
    panelUnload(ev) {
        /* Event handler for the window unload event */

        this.shutDown();
    }

    /**************************************/
    shutDown() {
        /* Shuts down the panel */

        if (this.intervalToken) {
            this.window.clearTimeout(this.intervalToken);
            this.intervalToken = 0;
        }

        this.powerBtn.src = ControlPanel.powerBtnOffImage;
        this.powerReadyLamp.set(0);
        this.powerOnLamp.set(0);
        this.$$("PowerOnLampFX").classList.add("powerDown");
        this.window.setTimeout(() => {
            this.$$("PowerOnLampFX").classList.remove("powerDown");
            if (this.auxCEPanel) {
                this.auxCEPanel.shutDown();
                this.auxCEPanel = null;
            }

            this.$$("OperatorContainer").removeEventListener("click", this.boundControlSwitchClick);
            this.$$("OperatorContainer").removeEventListener("mouseover", this.boundSimultaneousButtonDrag);
            this.$$("OperatorContainer").removeEventListener("mouseout", this.boundSimultaneousButtonDrag);
            this.$$("OperatorContainer").removeEventListener("mousedown", this.boundSimultaneousButtonDrag);
            this.$$("OperatorContainer").removeEventListener("mouseup", this.boundSimultaneousButtonDrag);
            this.powerBtn.removeEventListener("dblclick", this.boundControlSwitchClick);
            this.marSelectorKnob.removeChangeListener(this.boundMARSelectorChange);
            this.$$("EmergencyOffSwitch").removeEventListener("dblclick", this.boundEmergencyOffClick);
            this.$$("AlarmSound").pause();
            this.$$("IBMLogo").removeEventListener("dblClick", this.boundOpenDebugPanel);
            this.config.putWindowGeometry(this.window, "ControlPanel");
            this.window.removeEventListener("beforeunload", this.boundBeforeUnload);
            this.window.removeEventListener("unload", this.boundPanelUnload);
            this.context.systemShutDown();
            this.window.setTimeout(() => {
                this.window.close();
            }, 500);
        }, 2000);
    }
} // class ControlPanel
