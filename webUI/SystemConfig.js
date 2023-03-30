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
            lpm: 240
        },

        Disk: {
            hasDisk: 0,
            units: [
                {enabled: 0},
                {enabled: 0},
                {enabled: 0},
                {enabled: 0}
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

        // Load or create the system configuration data
        let s = localStorage.getItem(SystemConfig.configStorageName);
        if (!s) {
            this.createConfigData();
        } else {
            this.loadConfigData(s);
        }

        this.determineWindowConfigMode();
    }

    /**************************************/
    $$(id) {
        return this.doc.getElementById(id);
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
        /* Both destNode and sourceNode must be non-null Objects and not Arrays
        or Functions. Recursively merges into destNode any properties of
        sourceNode missing in destNode. Does not alter any existing elementary
        properties of destNode or its sub-objects. If either parameter is not
        an object, does nothing. This isn't a complete recursive merge, but
        it's good enough for SystemConfig data */

        for (let key in sourceNode) {
            if (!(key in destNode)) {
                destNode[key] = structuredClone(sourceNode[key]);
            } else {
                let d = destNode[key];
                if (typeof d == "object" && d !== null && !Array.isArray(d) &&
                        Object.isExtensible(d) &&
                        !(Object.isSealed(d) || Object.isFrozen(d))) {
                    let s = sourceNode[key];
                    if (typeof s == "object" && s !== null && !Array.isArray(s)) {
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

        /**********/
        // ?? TEMP cleanup during development ??
        if ("cpm" in this.configData.Card) {
            this.configData.Card.cpmRead = this.configData.Card.cpm;
            this.configData.Card.cpmPunch = this.configData.Card.cpm/2;
            delete this.configData.Card.cpm;
        }

        for (let modeKey in this.configData.WindowConfig.modes) {
            const mode = this.configData.WindowConfig.modes[modeKey];
            for (let unitKey in mode) {
                const unit = mode[unitKey];
                for (let propKey in unit) {
                    switch (propKey) {
                    case "outerWidth":
                        if ("innerWidth" in unit) {
                            delete unit[propKey];
                        }
                        break;
                    case "outerHeight":
                        if ("innerHeight" in unit) {
                            delete unit[propKey];
                        }
                        break;
                    }
                }
            }
        }
        this.flush();
        // ?? TEMP end of cleanup ??
        /**********/

        // Recursively merge any new properties from the defaults.
        this.sortaDeepMerge(this.configData, SystemConfig.defaultConfig);
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
                lastNode[lastNode][index] = data;
            }

            if (!this.flushTimerToken) {
                this.flushTimerToken = setTimeout(this.boundFlushHandler, SystemConfig.flushDelay);
            }
        }
    }

    /**************************************/
    determineWindowConfigMode() {
        // Attempt to determine the browser's display configuration
        const cd = this.configData;

        if (!cd.persistentWindows) {
            this.putNode("WindowConfig.mode", "Auto");
        } else if (window.screen.isExtended) {
            this.putNode("WindowConfig.mode", "Multiple");
        } else {
            this.putNode("WindowConfig.mode", "Single");
        }
    }

    /**************************************/
    setWindowGeometry(win, id) {
        /* Sets the geometry for the specified window under the specified
        window/unit id. Returns true if the geometry was set, false if not (in
        which case the caller should do its automatic window placement). If the
        configuration has no data for the specified window or id, returns false */
        const cd = this.configData;
        let doAuto = false;

        if (cd.persistentWindows) {
            const mode = cd.WindowConfig.mode;
            if (mode in cd.WindowConfig.modes) {
                if (id in cd.WindowConfig.modes[mode]) {
                    const unit = WindowConfig.modes[mode][id];
                    win.moveTo(unit.screenX ?? 0, unit.screenY ?? 0);
                    win.resizeTo(unit.outerWidth ?? 250, unit.outerHeight ?? 250);
                    doAuto = true;
                }
            }
        }

        return doAuto;
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
            const mode = cd.WindowConfig.mode;
            if (mode in cd.WindowConfig.modes) {
                if (id in cd.WindowConfig.modes[mode]) {
                    const unit = cd.WindowConfig.modes[mode][id];
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
        //this.putNode(`${prefix}.outerWidth`, win.outerWidth);
        //this.putNode(`${prefix}.outerHeight`, win.outerHeight);
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

        // Typewriter
        this.$$("MarginLeft").textContent = x = cd.Typewriter.marginLeft;
        this.$$("MarginRight").textContent = y = cd.Typewriter.marginRight;
        this.$$("Columns").textContent = (y-x);
        this.$$("TabStops").textContent = cd.Typewriter.tabs;

        // Card Reader/Punch
        this.$$("CardInstalled").checked = cd.Card.hasCard;
        this.setListValue("CardSpeed", cd.Card.cpmRead);
        this.$$("CardSpeed").disabled = !cd.Card.hasCard;
        this.$$("CardPunchStackerLimit").value = cd.Card.stackerPunch;
        this.$$("CardPunchStackerLimit").disabled = !cd.Card.hasCard;

        // Printer
        this.$$("PrinterInstalled").checked = cd.Printer.hasPrinter;
        this.setListValue("PrinterSpeed", cd.Printer.lpm);
        this.$$("PrinterSpeed").disabled = !cd.Card.hasPrinter;

        // Disk
        this.$$("DiskInstalled").checked = cd.Disk.hasDisk;
        for (let x=0; x<4; ++x) {
            const id = `Disk${x}Enabled`;
            this.$$(id).checked = cd.Disk.units[x].enabled;
            this.$$(id).disabled = !cd.Card.hasDisk;
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
            this.putNode("persistentWindows", (ev.target.checked ? 1 : 0));
            this.determineWindowConfigMode();
            break;
        case "CardInstalled":
            this.putNode("Card.hasCard", (ev.target.checked ? 1 : 0));
            this.$$("CardSpeed").disabled = !cd.Card.hasCard;
            this.$$("CardPunchStackerLimit").disabled = !cd.Card.hasCard;
            break;
        case "PrinterInstalled":
            this.putNode("Printer.hasPrinter", (ev.target.checked ? 1 : 0));
            this.$$("PrinterSpeed").disabled = !cd.Printer.hasPrinter;
            break;
        case "DiskInstalled":
            this.putNode("Disk.hasDisk", (ev.target.checked ? 1 : 0));
            for (let x=0; x<4; ++x) {
                const id = `Disk${x}Enabled`;
                this.$$(id).disabled = !cd.Disk.hasDisk;
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

        // Typewriter
            // (nothing to do here -- settings changed on device)

        // Card Reader/Punch
        cd.Card.hasCard = (this.$$("CardInstalled").checked ? 1 : 0);
        e = this.$$("CardSpeed");
        x = parseInt(e.options[e.selectedIndex].value, 10);
        switch (x) {
        case 500:
            cd.Card.cpmRead = 500;
            cd.Card.cpmPunch = 250;
            break;
        default:
            cd.Card.cpmRead = 250;
            cd.Card.cpmPunch = 125;
            break;
        }

        x = parseInt(this.$$("CardPunchStackerLimit").value, 10);
        if (x < 100) {
            cd.Card.stackerPunch = 100;
        } else if (x > 999999) {
            cd.Card.stackerPunch = 999999;
        } else {
            cd.Card.stackerPunch = x;
        }

        // Printer
        cd.Printer.hasPrinter = (this.$$("PrinterInstalled").checked ? 1 : 0);
        e = this.$$("PrinterSpeed");
        x = parseInt(e.options[e.selectedIndex].value, 10);
        cd.Printer.lpm = (isNaN(x) ? 250 : x);

        // Disk
        cd.Disk.hasDisk = (this.$$("DiskInstalled").checked ? 1 : 0);
        cd.Disk.units[0].enabled = (this.$$("Disk0Enabled").checked ? 1 : 0);
        cd.Disk.units[1].enabled = (this.$$("Disk1Enabled").checked ? 1 : 0);
        cd.Disk.units[2].enabled = (this.$$("Disk2Enabled").checked ? 1 : 0);
        cd.Disk.units[3].enabled = (this.$$("Disk3Enabled").checked ? 1 : 0);

        this.flushHandler();            // store the configuration
        this.$$("MessageArea").textContent = "1620 System Configuration updated.";
        this.window.close();
    }

    /**************************************/
    closeConfigUI() {
        /* Closes the system configuration update dialog */

        this.alertWin = window;         // revert alerts to the global window
        window.focus();
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
    openConfigUI() {
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
        openPopup(window, "../webUI/SystemConfig.html", `retro-1620.${SystemConfig.configStorageName}`,
                "location=no,scrollbars,resizable,width=800,height=800",
                this, configUI_Load);
    }
} // SystemConfig class
