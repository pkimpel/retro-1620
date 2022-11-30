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

import {ControlPanel} from "./ControlPanel.js";
import {Processor} from "../emulator/Processor.js";

//import {PaperTapeReader} from "./PaperTapeReader.js";
//import {PaperTapePunch} from "./PaperTapePunch.js";
//import {Typewriter} from "./Typewriter.js";

let globalLoad = (ev) => {
    //let config = new I1620SystemConfig(); // system configuration object
    let statusMsgTimer = 0;             // status message timer control cookie

    const context = {
        systemShutDown,
        window
    };


    /**************************************/
    function $$(id) {
        return document.getElementById(id);
    }

    /**************************************/
    function showConfigName() {
        /* Displays the name of the current system configuration */

        $$("ConfigName").textContent = config.getConfigName();
    }

    /**************************************/
    function configureSystem(ev) {
        /* Opens the system configuration UI */

        config.openConfigUI(showConfigName);
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
    function systemStartup(ev) {
        /* Establishes the system components */

        $$("StartUpBtn").disabled = true;
        //$$("ConfigureBtn").disabled = true;

        window.addEventListener("beforeunload", beforeUnload);

        context.processor = new Processor(context);
        context.controlPanel = new ControlPanel(context);
        //context.devices = {
        //    "paperTapeReader":          new PaperTapeReader(context),
        //    "paperTapePunch":           new PaperTapePunch(context),
        //    "typewriter":               new Typewriter(context)
        //}
    }

    /**************************************/
    function systemShutDown() {
        /* Powers down the Processor and shuts down all of the panels and I/O devices */
        let processor = context.processor;

        while (!processor.gateMANUAL.value) {
            processor.setManual();
            processor.releaseIO();
            setTimeout(systemShutDown, 1000);
            return;
        }

        /**********
        let devices = context.devices;
        for (const e in devices) {
            if (devices[e]) {
                devices[e].shutDown();
                devices[e] = null;
            }
        }

        **********/

        processor.powerDown();
        context.devices = null;
        context.controlPanel = null;
        context.processor = null;

        $$("StartUpBtn").disabled = false;
        $$("StartUpBtn").focus();
        window.removeEventListener("beforeunload", beforeUnload);
        //$$("ConfigureBtn").disabled = false;
        //config.flush();
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
    $$("EmulatorVersion").textContent = Version.i1620Version;
    if (checkBrowser()) {
        $$("StartUpBtn").disabled = false;
        $$("StartUpBtn").addEventListener("click", systemStartup, false);
        $$("StartUpBtn").focus();
        //$$("ConfigureBtn").disabled = false;
        //$$("ConfigureBtn").addEventListener("click", configureSystem, false);

        //$$("StatusMsg").textContent = "??";
        //clearStatusMsg(30);
    }
} // globalLoad

window.addEventListener("load", globalLoad, {once: true});
