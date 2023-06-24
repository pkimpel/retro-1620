/***********************************************************************
* retro-1620/webUI SystemConfig.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* IBM 1620 Model 2 Emulator System Configuration management object.
*
* Defines the system configuration used internally by the emulator and the
* methods used to manage that configuration data.
*
************************************************************************
* 2022-12-07  P.Kimpel
*   Original version, from retro-220 webUI/B220SystemConfig.js.
***********************************************************************/

export {SystemConfig};

import {openPopup} from "./PopupUtil.js";

class SystemConfig {

    // Static Properties

    static configStorageName = "retro-1620-Config";
    static configVersion = 1;
    static flushDelay = 30000;          // flush timer setting, ms

    static defaultConfig = {
        configName: "Default",
        version: SystemConfig.configVersion,
        memorySize: 40000,              // digits
        indexRegisters: 1,
        floatingPoint: 0,               // for now...
        binaryCapabilities: 0,
        persistentWindows: 0,
        multiScreen: 0,

        ControlPanel: {
            Program1SW: 0,              // Program Switches 0/1
            Program2SW: 0,
            Program3SW: 0,
            Program4SW: 0,
            DiskStopSW: 0,
            ParityStopSW: 0,
            IOStopSW: 0,
            OflowStopSW: 0,
            MARSelSW: 0,                // 0-relative knob position
            DebugView: 0                // display register Debug View panel
        },

        Typewriter: {
            marginLeft: 0,
            marginRight: 85,
            tabs: "9,17,25,33,41,49,57,65,73,81"
        },

        Card: {
            hasCard: 1,
            selectStop: 1,
            cpmRead: 500,
            cpmPunch: 250,
            stackerPunch: 10000
        },

        Printer: {
            hasPrinter: 0,
            lpm: 0
        },

        Disk: {
            hasDisk: 0,
            compareDisable: 0,
            module: [
                {exists: 0, started: 0, enabled: 0, imageName: null},
                {exists: 0, started: 0, enabled: 0, imageName: null},
                {exists: 0, started: 0, enabled: 0, imageName: null},
                {exists: 0, started: 0, enabled: 0, imageName: null}
            ]
        },

        WindowConfig: {
            mode: "Auto",
            modes: {
                Auto: {
                    ControlPanel: {
                        screenX: 0,             // dummy initial values
                        screenY: 0,
                        innerWidth: 400,
                        innerHeight: 250
                    }
                }
            }
        }

    };

    constructor() {
        /* Constructor for the SystemConfig configuration management object */

        this.configData = null;         // the configuration properties
        this.configReporter = null;     // callback function passed from main window
        this.flushTimerToken = 0;       // timer token for flushing configuration to localStorage
        this.window = null;             // configuration UI window object
        this.alertWin = window;         // current base window for alert/confirm/prompt

        this.boundFlushHandler = this.flushHandler.bind(this);
        this.boundChangeConfig = this.changeConfig.bind(this);
        this.boundSaveConfigDialog = this.saveConfigDialog.bind(this);
        this.boundCloseConfigUI = this.closeConfigUI.bind(this);
        this.boundWindowClose = (ev) => {this.window.close()};
        this.boundSetDefaultConfig = (ev) => {
                this.createConfigData();
                this.loadConfigDialog();
        };
    }

    /**************************************/
    $$(id) {
        return this.doc.getElementById(id);
    }

    /**************************************/
    async activate() {
        /* Initializes the configuration and determines the window-positioning
        mode. This is async because multi-screen window positioning, if enabled,
        must be requested asynchronously. Returns a message describing the
        window positioning mode */

        // Load or create the system configuration data
        let s = localStorage.getItem(SystemConfig.configStorageName);
        if (!s) {
            this.createConfigData();
        } else {
            this.loadConfigData(s);
        }

        return await this.determineWindowConfigMode();
    }

    /**************************************/
    createConfigData() {
        /* Creates and initializes a new configuration data object and stores it in
        localStorage */

        this.configData = SystemConfig.defaultConfig;
        this.flushHandler();
    }

    /**************************************/
    sortaDeepMerge(destNode, sourceNode) {
        /* Both destNode and sourceNode must be non-null Objects and not
        Functions. Recursively merges into destNode any properties of
        sourceNode missing in destNode. Does not alter any existing elementary
        properties of destNode or its sub-objects. If either parameter is not
        an Object or Array, does nothing. This isn't a complete recursive merge,
        but it's good enough for SystemConfig data */

        for (let key in sourceNode) {
            if (!(key in destNode)) {
                destNode[key] = structuredClone(sourceNode[key]);
            } else {
                let d = destNode[key];
                let s = sourceNode[key];
                if (Array.isArray(s) && Array.isArray(d)) {
                    for (let i=0; i<s.length; ++i) {
                        if (s[i] !== undefined) {
                            if (d[i] === undefined) {
                                d[i] = structuredClone(s[i]);
                            } else {
                                this.sortaDeepMerge(d[i], s[i]);
                            }
                        }
                    }
                } else if (d !== null && typeof d == "object" && !Array.isArray(d) &&
                        Object.isExtensible(d) && !(Object.isSealed(d) || Object.isFrozen(d))) {
                    if (s !== null && typeof s == "object" && !Array.isArray(s)) {
                        this.sortaDeepMerge(d, s);
                    }
                }
            }
        }
    }

    /**************************************/
    loadConfigData(jsonConfig) {
        /* Attempts to parse the JSON configuration data string and store it in
        this.configData. If the parse is unsuccessful, recreates the default
        configuration. Applies any necessary updates to older configurations */

        try {
            this.configData = JSON.parse(jsonConfig);
        } catch (e) {
            alert("Could not parse system configuration data:\n" +
                  e.message + "\nReinitializing configuration");
            this.createConfigData();
        }

        // Apply structural updates if necessary.
        if (SystemConfig.configVersion != this.configData.version) {
            // Reserved for future use
        }

        // Recursively merge any new properties from the defaults.
        if (this.configData.Disk.units) {       // renamed 2023-06-10
            this.configData.Disk.module = this.configData.Disk.units;
            delete this.configData.Disk.units;
        }

        this.sortaDeepMerge(this.configData, SystemConfig.defaultConfig);
    }

    /**************************************/
    async determineWindowConfigMode() {
        /* Attempt to determine the browser's display configuration */
        const cd = this.configData;
        let msg = "";

        if (!cd.persistentWindows) {
            cd.WindowConfig.mode = "Auto";
        } else {
            cd.WindowConfig.mode = "Single";    // default to this if anything below fails
            msg = "-screen persistent";
            if (cd.multiScreen && window.screen.isExtended && ("getScreenDetails" in window)) {
                // Check that permission has not already been denied.
                let permission = null;
                try { // check the newer permission name
                    permission = await navigator.permissions.query({name: "window-management"});
                } catch (e) {
                    try { // fall back to the older permission name
                        permission = await navigator.permissions.query({name: "window-placement"});
                    } catch (e) {
                        msg += ": Multi-screen positioning NOT AVAILABLE";
                    }
                }

                if (permission) {
                    if (permission.state === "denied") {
                        msg += ": Multi-screen positioning DISALLOWED";
                    } else {
                        // Calling getScreenDetails() is what actually triggers the permission.
                        // The result object can be saved globally if needed.
                        try {
                            const screenDetails = await window.getScreenDetails();
                            if (screenDetails !== null) {
                                cd.WindowConfig.mode = "Multiple";
                            }
                        } catch (e) {
                            msg += ": Multi-screen positioning REFUSED";
                        }
                    }
                }
            }
        }

        return `Window positioning is ${cd.WindowConfig.mode}${msg}.`;
    }

    /**************************************/
    flushHandler() {
        /* Callback function for the flush timer. Stores the configuration data */

        this.flushTimerToken = 0;
        localStorage.setItem(SystemConfig.configStorageName, JSON.stringify(this.configData));
    }

    /*************************************/
    flush() {
        /* If the current configuration data object has been modified, stores it to
        localStorage and resets the flush timer */

        if (this.flushTimerToken) {
            clearTimeout(this.flushTimerToken);
            this.flushHandler();
        }
    }

    /*******************************************************************
    *   Configuration Node Management                                  *
    *******************************************************************/

    /**************************************/
    getNode(nodeName, index) {
        /* Retrieves a specified node of the configuration data object tree.
        "nodeName" specifies the node using dotted-path format. A blank name
        retrieves the entire tree. If the "index" parameter is specified, the
        final node in the path is assumed to be an array or object, and "index"
        used to return that element of the array or object. If a node does not
        exist, returns undefined */
        let node = this.configData;

        const name = nodeName.trim();
        if (name.length > 0) {
            const names = name.split(".");
            for (let name of names) {
                if (name in node) {
                    node = node[name];
                } else {
                    node = undefined;
                    break; // out of for loop
                }
            }
        }

        if (index === undefined) {
            return node;
        } else {
            return node[index];
        }
    }

    /**************************************/
    putNode(nodeName, data, index) {
        /* Creates or replace a specified node of the configuration data object tree.
        "nodeName" specifies the node using dotted.path format. A blank name
        results in nothing being set. If a node does not exist, it and any necessary
        parent nodes are created. If the "index" parameter is specified, the final
        node in the path is assumed to be an array, and "index" is used to access
        that element of the array. Setting the value of a node starts a timer  (if it
        is not already started). When that timer expires, the configuration data will
        be flushed to the localStorage object. This delayed storage is done so that
        several configuration changes into short order can be grouped in one flush */
        let node = this.configData;

        const name = nodeName.trim();
        if (name.length > 0) {
            let lastName = name;
            let lastNode = node;
            const names = name.split(".");
            for (let name of names) {
                lastName = name;
                lastNode = node;
                if (name in node) {
                    node = node[name];
                } else {
                    node = node[name] = {};
                }
            } // for x

            if (index === undefined) {
                lastNode[lastName] = data;
            } else {
                lastNode[lastName][index] = data;
            }

            if (!this.flushTimerToken) {
                this.flushTimerToken = setTimeout(this.boundFlushHandler, SystemConfig.flushDelay);
            }
        }
    }

    /**************************************/
    getWindowProperty(id, prop) {
        /* Returns a WindowConfig property value based on the specified unit/
        window id and the property name. If the property does not exist,
        returns undefined */
        const wc = this.configData.WindowConfig;
        let value;                      // undefined by default

        const mode = wc.mode;
        if (mode in wc.modes) {
            if (id in wc.modes[mode]) {
                const unit = wc.modes[mode][id];
                if (prop in unit) {
                    value = unit[prop];
                }
            }
        }

        return value;
    }

    /**************************************/
    formatWindowGeometry(id) {
        /* Formats a string fragment for the window.open() method to set the
        geometry for the specified window/unit id. Returns an empty string if
        persistent window positions is not enabled (in which case the caller
        should do its automatic window placement), otherwise returns the
        geometry string */
        const cd = this.configData;
        let geometry = "";

        if (cd.persistentWindows) {
            const wc = cd.WindowConfig;
            const mode = wc.mode;
            if (mode in wc.modes) {
                if (id in wc.modes[mode]) {
                    const unit = wc.modes[mode][id];
                    geometry = `,left=${unit.screenX ?? 0}` +
                               `,top=${unit.screenY ?? 0}` +
                               `,width=${unit.innerWidth ?? 250}` +
                               `,height=${unit.innerHeight ?? 250}`;
                }
            }
        }

        return geometry;
    }

    /**************************************/
    putWindowGeometry(win, id) {
        /* Stores the geometry for the specified window under the specified
        window/unit id */
        const cd = this.configData;
        const prefix = `WindowConfig.modes.${cd.WindowConfig.mode}.${id}`;

        this.putNode(`${prefix}.screenX`, win.screenX);
        this.putNode(`${prefix}.screenY`, win.screenY);
        this.putNode(`${prefix}.innerWidth`, win.innerWidth);
        this.putNode(`${prefix}.innerHeight`, win.innerHeight);
    }

    /***********************************************************************
    *   System Configuration UI Support                                    *
    ***********************************************************************/

    /**************************************/
    setListValue(id, value) {
        /* Sets the selection of the <select> list with the specified "id" to the
        entry with the specified "value". If no such value exists, the list
        selection is not changed */
        const e = this.$$(id);

        if (e && e.tagName == "SELECT") {
            const opt = e.options;
            for (let x=0; x<opt.length; ++x) {
                if (opt[x].value == value) {
                    e.selectedIndex = x;
                    break; // out of for loop
                }
            } // for x
        }
    }

    /**************************************/
    loadConfigDialog() {
        /* Loads the configuration UI window with the settings from this.configData */
        const cd = this.configData;     // local configuration reference
        let x;                          // scratch
        let y;                          // scratch

        // System Properties
        this.setListValue("SystemMemorySize", cd.memorySize.toString());
        this.$$("SystemIndexRegisters").checked = cd.indexRegisters;
        this.$$("SystemFloatingPoint").checked = cd.floatingPoint;
        this.$$("SystemBinaryCaps").checked = cd.binaryCapabilities;
        this.$$("SystemPersistentWin").checked = cd.persistentWindows;
        this.$$("SystemMultiScreen").checked = cd.multiScreen;
        this.$$("SystemMultiScreen").disabled = !cd.persistentWindows;

        // Typewriter
        this.$$("MarginLeft").textContent = x = cd.Typewriter.marginLeft;
        this.$$("MarginRight").textContent = y = cd.Typewriter.marginRight;
        this.$$("Columns").textContent = (y-x);
        this.$$("TabStops").textContent = cd.Typewriter.tabs;

        // Card Reader/Punch
        this.setListValue("CardSpeed", cd.Card.cpmRead);
        this.$$("CardPunchStackerLimit").value = cd.Card.stackerPunch;
        this.$$("CardPunchStackerLimit").disabled = !cd.Card.hasCard;

        // Printer
        this.setListValue("PrinterSpeed", cd.Printer.lpm);

        // Disk
        this.$$("DiskCompareDisable").checked = cd.Disk.compareDisable;
        this.$$("DiskCompareDisable").disabled = !cd.Disk.module[0].exists;
        for (let x=0; x<4; ++x) {
            this.$$(`Disk${x}Exists`).checked = cd.Disk.module[x].exists;
            this.$$(`Disk${x}Started`).checked = cd.Disk.module[x].started;
            this.$$(`Disk${x}Enabled`).checked = cd.Disk.module[x].enabled;
            this.$$(`Disk${x}ImageName`).textContent = cd.Disk.module[x].imageName;
            if (x > 0) {
                this.$$(`Disk${x}Exists`).disabled = !cd.Disk.module[0].exists;
            }

            this.$$(`Disk${x}Started`).disabled = !cd.Disk.module[0].exists;
            this.$$(`Disk${x}Enabled`).disabled = !cd.Disk.module[0].exists;
        }

        this.$$("MessageArea").textContent = "1620 System Configuration loaded.";
        this.window.focus();
    }

    /**************************************/
    changeConfig(ev) {
        /* Handles the onChange event for elements in the configDiv element */
        const cd = this.configData;     // local configuration reference
        const id = ev.target.id;        // id of changed element

        switch (id) {
        case "SystemPersistentWin":
            this.$$("SystemMultiScreen").disabled = !ev.target.checked;
            break;
        case "CardSpeed":
            this.$$("CardPunchStackerLimit").disabled = !ev.target.selectedIndex <= 0;
            break;
        case "PrinterInstalled":
            break;
        case "Disk0Exists":
            this.$$("DiskCompareDisable").disabled = !ev.target.checked;
            for (let x=0; x<4; ++x) {
                if (x > 0) {
                    this.$$(`Disk${x}Exists`).disabled = !ev.target.checked;
                }

                this.$$(`Disk${x}Started`).disabled = !ev.target.checked;
                this.$$(`Disk${x}Enabled`).disabled = !ev.target.checked;
            }
            break;
        }
    }

    /**************************************/
    saveConfigDialog() {
        /* Saves the configuration UI window settings to this.configData and flushes
        the updated configuration to localStorage */
        const cd = this.configData;     // local configuration reference
        let e = null;                   // local element reference
        let x = 0;                      // scratch

        function getNumber(id, caption, min, max) {
            let text = this.$$(id).value;
            let n = parseInt(text, 10);

            if (isNaN(n)) {
                alert(caption + " must be numeric");
            } else if (n < min || n > max) {
                alert(caption + " must be in the range (" + min + ", " + max + ")");
                n = Number.NaN;
            }

            return n;
        }

        // System Properties
        e = this.$$("SystemMemorySize");
        x = parseInt(e.options[e.selectedIndex].value, 10);
        cd.memorySize = (isNaN(x) ? 20000 : x);

        cd.indexRegisters =     (this.$$("SystemIndexRegisters").checked ? 1 : 0);
        cd.floatingPoint =      (this.$$("SystemFloatingPoint").checked ? 1 : 0);
        cd.binaryCapabilities = (this.$$("SystemBinaryCaps").checked ? 1 : 0);
        cd.persistentWindows =  (this.$$("SystemPersistentWin").checked ? 1 : 0);
        this.$$("SystemMultiScreen").enabled = !cd.persistentWindows;
        cd.multiScreen =        (this.$$("SystemMultiScreen").checked ? 1 : 0);

        // Typewriter
            // (nothing to do here -- settings changed on device)

        // Card Reader/Punch
        e = this.$$("CardSpeed");
        cd.Card.hasCard = (e.selectedIndex > 0 ? 1 : 0);
        x = parseInt(e.options[e.selectedIndex].value, 10);
        switch (x) {
        case 250:
            cd.Card.cpmRead = 250;
            cd.Card.cpmPunch = 125;
       case 500:
            cd.Card.cpmRead = 500;
            cd.Card.cpmPunch = 250;
            break;
        default:
            cd.Card.cpmRead = 0;
            cd.Card.cpmPunch = 0;
            break;
        }

        e = this.$$("CardPunchStackerLimit");
        e.disabled = !cd.Card.hasCard;
        x = parseInt(e.value, 10) || 100;
        if (x < 100) {
            cd.Card.stackerPunch = 100;
        } else if (x > 999999) {
            cd.Card.stackerPunch = 999999;
        } else {
            cd.Card.stackerPunch = x;
        }

        // Printer
        e = this.$$("PrinterSpeed");
        cd.Printer.hasPrinter = (e.selectedIndex > 0 ? 1 : 0);
        x = parseInt(e.options[e.selectedIndex].value, 10);
        cd.Printer.lpm = (isNaN(x) ? 250 : x);

        // Disk
        cd.Disk.hasDisk = (this.$$("Disk0Exists").checked ? 1 : 0);
        cd.Disk.compareDisable = (this.$$("DiskCompareDisable").checked ? 1 : 0);
        for (x=0; x<4; ++x) {
            cd.Disk.module[x].exists = (this.$$(`Disk${x}Exists`).checked ? 1 : 0);
            cd.Disk.module[x].started = (this.$$(`Disk${x}Started`).checked ? 1 : 0);
            cd.Disk.module[x].enabled = (this.$$(`Disk${x}Enabled`).checked ? 1 : 0);
        }

        this.determineWindowConfigMode().then((msg) => {
            this.flushHandler();        // store the configuration
            this.$$("MessageArea").textContent = msg;
            this?.configReporter(msg);
            this.window.close();
        });
    }

    /**************************************/
    closeConfigUI() {
        /* Closes the system configuration update dialog */

        this.alertWin = window;         // revert alerts to the global window
        window.focus();
        this.configReporter = null;
        this.$$("SaveBtn").removeEventListener("click", this.boundSaveConfigDialog, false);
        this.$$("CancelBtn").removeEventListener("click", this.boundWindowClose, false);
        this.$$("DefaultsBtn").removeEventListener("click", this.boundSetDefaultConfig, false);
        this.$$("configDiv").removeEventListener("change", this.boundChangeConfig, false);
        this.window.removeEventListener("unload", this.boundCloseConfigUI, false);
        if (this.window) {
            if (!this.window.closed) {
                this.window.close();
            }
            this.window = null;
        }
    }

    /**************************************/
    openConfigUI(configReporter) {
        /* Opens the system configuration update dialog and displays the current
        system configuration */

        function configUI_Load(ev) {
            this.doc = ev.target;
            this.window = this.doc.defaultView;
            this.window.moveTo(screen.availWidth-this.window.outerWidth-40,
                    (screen.availHeight-this.window.outerHeight)/2);
            this.window.focus();
            this.alertWin = this.window;
            this.$$("SaveBtn").addEventListener("click", this.boundSaveConfigDialog, false);
            this.$$("CancelBtn").addEventListener("click", this.boundWindowClose, false);
            this.$$("DefaultsBtn").addEventListener("click", this.boundSetDefaultConfig, false);
            this.$$("configDiv").addEventListener("change", this.boundChangeConfig, false);
            this.window.addEventListener("unload", this.boundCloseConfigUI, false);
            this.loadConfigDialog();
        }

        this.doc = null;
        this.window = null;
        this.configReporter = configReporter;
        openPopup(window, "../webUI/SystemConfig.html", `retro-1620.${SystemConfig.configStorageName}`,
                "location=no,scrollbars,resizable,width=544,height=800",
                this, configUI_Load);
    }
} // SystemConfig class
