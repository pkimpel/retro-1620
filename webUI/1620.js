/***********************************************************************
* retro-1620/webUI 1620.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* IBM 1620 emulator top page routines.
************************************************************************
* 2022-07-22  P.Kimpel
*   Original version, from retro-g15 G15.js.
***********************************************************************/

import * as Version from "../emulator/Version.js";
import {Processor} from "../emulator/Processor.js";

import {CardReader} from "./CardReader.js";
import {CardPunch} from "./CardPunch.js";
import {DiskDrive} from "./DiskDrive.js";
import {LinePrinter} from "./LinePrinter.js";
import {PaperTapeReader} from "./PaperTapeReader.js";
import {PaperTapePunch} from "./PaperTapePunch.js";
import {Plotter} from "./Plotter.js";
import {ControlPanel} from "./ControlPanel.js";
import {SystemConfig} from "./SystemConfig.js";
import {Typewriter} from "./Typewriter.js";


const globalLoad = (ev) => {
    const config = new SystemConfig();  // system configuration object
    let statusMsgTimer = 0;             // status message timer control cookie

    const context = {
        config,
        systemShutDown,
        window
    };


    /**************************************/
    function $$(id) {
        return document.getElementById(id);
    }

    /**************************************/
    function configReporter(msg) {
        /* Displays a configuration result message */

        $$("ConfigMsg").textContent = msg;
    }

    /**************************************/
    function configureSystem(ev) {
        /* Opens the system configuration UI */

        config.openConfigUI(configReporter);
    }

    /**************************************/
    function clearStatusMsg(inSeconds) {
        /* Delays for "inSeconds" seconds, then clears the StatusMsg element */

        if (statusMsgTimer) {
            clearTimeout(statusMsgTimer);
        }

        statusMsgTimer = setTimeout(function(ev) {
            $$("StatusMsg").textContent = "";
            statusMsgTimer = 0;
        }, inSeconds*1000);
    }

    /**************************************/
    function beforeUnload(ev) {
        var msg = "Closing this window will terminate the emulator";

        ev.preventDefault();
        ev.returnValue = msg;
        return msg;
    }

    /**************************************/
    async function systemInitialize() {
        /* Activates the system configuration object (asynchronously) and
        enables the Start and Configure buttons on the window */

        const msg = await config.activate();
        configReporter(msg);

        $$("StartUpBtn").disabled = false;
        $$("StartUpBtn").addEventListener("click", systemStartup, false);
        $$("StartUpBtn").focus();
        $$("ConfigureBtn").disabled = false;
        $$("ConfigureBtn").addEventListener("click", configureSystem, false);
    }

    /**************************************/
    async function systemStartup(ev) {
        /* Establishes the system components */

        const msg = await config.activate();
        configReporter(msg);

        $$("StartUpBtn").disabled = true;
        $$("ConfigureBtn").disabled = true;

        window.addEventListener("beforeunload", beforeUnload);

        context.processor = new Processor(context);
        context.devices = {};
        if (config.getNode("Card.hasCard")) {
            context.devices.cardReader = new CardReader(context);
            context.devices.cardPunch = new CardPunch(context);
        }

        if (config.getNode("Disk.hasDisk")) {
            context.devices.diskDrive = new DiskDrive(context);
        }

        if (config.getNode("Printer.hasPrinter")) {
            context.devices.linePrinter = new LinePrinter(context);
        }

        if (config.getNode("PaperTapePunch.hasPaperTapePunch")) {
            context.devices.paperPunch = new PaperTapePunch(context);
        } else if (config.getNode("Plotter.hasPlotter")) {
            context.devices.paperPunch = new Plotter(context);
        }

        if (config.getNode("PaperTapeReader.hasPaperTapeReader")) {
            context.devices.paperReader = new PaperTapeReader(context);
        }

        context.devices.typewriter = new Typewriter(context);
        context.controlPanel = new ControlPanel(context);
    }

    /**************************************/
    function systemShutDown() {
        /* Powers down the Processor and shuts down all of the panels and I/O devices */
        const processor = context.processor;

        if (!processor.gateMANUAL.value) {
            processor.enterManual();
            processor.ioExit();
            setTimeout(systemShutDown, 1000);
            return;
        }

        for (const e in context.devices) {
            if (context.devices[e]) {
                context.devices[e].shutDown();
                context.devices[e] = null;
            }
        }

        processor.powerDown();
        context.devices = null;
        context.controlPanel = null;
        context.processor = null;

        $$("StartUpBtn").disabled = false;
        $$("StartUpBtn").focus();
        $$("ConfigureBtn").disabled = false;
        config.flush();
        window.removeEventListener("beforeunload", beforeUnload);
    }

    /**************************************/
    function checkBrowser() {
        /* Checks whether this browser can support the necessary stuff */
        let missing = "";

        if (!window.ArrayBuffer) {missing += ", ArrayBuffer"}
        if (!window.DataView) {missing += ", DataView"}
        if (!window.Blob) {missing += ", Blob"}
        if (!window.File) {missing += ", File"}
        if (!window.FileReader) {missing += ", FileReader"}
        if (!window.FileList) {missing += ", FileList"}
        if (!window.indexedDB) {missing += ", IndexedDB"}
        if (!window.JSON) {missing += ", JSON"}
        if (!window.localStorage) {missing += ", LocalStorage"}
        if (!(window.performance && "now" in performance)) {missing += ", performance.now"}
        if (!window.Promise) {missing += ", Promise"}

        if (missing.length == 0) {
            return true;
        } else {
            alert("The emulator cannot run...\n" +
                "your browser does not support the following features:\n\n" +
                missing.substring(2));
            return false;
        }
    }

    /***** globalLoad() outer block *****/

    $$("StartUpBtn").disabled = true;
    $$("EmulatorVersion").textContent = Version.retro1620Version;
    if (checkBrowser()) {
        systemInitialize();
        //$$("StatusMsg").textContent = "??";
        //clearStatusMsg(30);
    }
} // globalLoad

window.addEventListener("load", globalLoad, {once: true});
