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

    constructor() {
        /* Constructor for the SystemConfig configuration management object */

        this.configData = null;         // the configuration properties
        this.flushTimerToken = 0;       // timer token for flushing configuration to localStorage
        this.window = null;             // configuration UI window object
        this.alertWin = window;         // current base window for alert/confirm/prompt
        this.boundFlushHandler = this.flushHandler.bind(this);

        // Load or create the system configuration data
        let s = localStorage.getItem(SystemConfig.configStorageName);
        if (!s) {
            this.createConfigData();
        } else {
            this.loadConfigData(s);
        }
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
        this.configData. If the parse is unsuccessful, recreates the default configuration.
        Applies any necessary updates to older configurations */

        try {
            this.configData = JSON.parse(jsonConfig);
        } catch (e) {
            alert("Could not parse system configuration data:\n" +
                  e.message + "\nReinitializing configuration");
            this.createConfigData();
        }

        // Apply structural updates if necessary
        if (SystemConfig.configVersion != this.configData.version) {
            // Reserved for future use
        }

        // Recursively merge any new properties from defaults
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

        let name = nodeName.trim();
        if (name.length > 0) {
            let names = name.split(".");
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

        let name = nodeName.trim();
        if (name.length > 0) {
            let lastName = name;
            let lastNode = node;
            let names = name.split(".");
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

    /***********************************************************************
    *   System Configuration UI Support                                    *
    ***********************************************************************/

    /**************************************/
    setListValue(id, value) {
        /* Sets the selection of the <select> list with the specified "id" to the
        entry with the specified "value". If no such value exists, the list
        selection is not changed */
        let e = this.$$(id);
        let opt;
        let x;

        if (e && e.tagName == "SELECT") {
            opt = e.options;
            for (x=0; x<opt.length; ++x) {
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
        let cd = this.configData;       // local configuration reference
        let mask;                       // unit mask bits
        let prefix;                     // unit id prefix
        let unit;                       // unit configuration object
        let x;                          // unit index
        let y;                          // secondary index

        // System Properties
        this.setListValue("SystemMemorySize", cd.memorySize.toString());
        this.$$("SystemIndexRegisters").checked = cd.indexRegisters;
        this.$$("SystemFloatingPoint").checked = cd.floatingPoint;
        this.$$("SystemBinaryCaps").checked = cd.binaryCapabilities;

        // Typewriter
        this.$$("MarginLeft").textContent = x = cd.Typewriter.marginLeft;
        this.$$("MarginRight").textContent = y = cd.Typewriter.marginRight;
        this.$$("Columns").textContent = (y-x);
        this.$$("TabStops").textContent = cd.Typewriter.tabs;

        // Card Reader/Punch
        this.$$("CardInstalled").checked = cd.Card.hasCard;
        this.setListValue("CardSpeed", cd.Card.cpm);

        // Printer
        this.$$("PrinterInstalled").checked = cd.Printer.hasPrinter;
        this.setListValue("PrinterSpeed", cd.Printer.lpm);

        // Disk
        this.$$("DiskInstalled").checked = cd.Disk.hasDisk;
        this.$$("Disk0Enabled").checked = cd.Disk.units[0].enabled;
        this.$$("Disk1Enabled").checked = cd.Disk.units[1].enabled;
        this.$$("Disk2Enabled").checked = cd.Disk.units[2].enabled;
        this.$$("Disk3Enabled").checked = cd.Disk.units[3].enabled;

        this.$$("MessageArea").textContent = "1620 System Configuration loaded.";
        this.window.focus();
    }

    /**************************************/
    saveConfigDialog() {
        /* Saves the configuration UI window settings to this.configData and flushes
        the updated configuration to localStorage */
        let cd = this.configData;       // local configuration reference
        let e = null;                   // local element reference
        let mask;                       // unit mask
        let prefix;                     // unit id prefix
        let unit = null;                // unit configuration object
        let x = 0;                      // unit index
        let y = 0;                      // secondary index

        function getNumber(id, caption, min, max) {
            let n;
            let text = this.$$(id).value;

            n = parseInt(text, 10);
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

        // Typewriter
            // (nothing to do here -- changed on device)

        // Card Reader/Punch
        cd.Card.hasCard = (this.$$("CardInstalled").checked ? 1 : 0);
        e = this.$$("CardSpeed");
        x = parseInt(e.options[e.selectedIndex].value, 10);
        cd.Card.cpm = (isNaN(x) ? 250 : x);

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
            this.$$("SaveBtn").addEventListener("click",
                    this.saveConfigDialog.bind(this), false);
            this.$$("CancelBtn").addEventListener("click",
                    function(ev) {this.window.close()}.bind(this), false);
            this.$$("DefaultsBtn").addEventListener("click",
                    function(ev) {
                        this.createConfigData();
                        this.loadConfigDialog();
            }.bind(this), false);
            this.window.addEventListener("unload",
                    this.closeConfigUI.bind(this), false);
            this.loadConfigDialog();
        }

        this.doc = null;
        this.window = null;
        openPopup(window, "../webUI/SystemConfig.html", SystemConfig.configStorageName,
                "location=no,scrollbars,resizable,width=800,height=800",
                this, configUI_Load);
    }
} // SystemConfig class


// Static Properties

SystemConfig.configStorageName = "retro-1620-Config";
SystemConfig.configVersion = 1;
SystemConfig.flushDelay = 30000;        // flush timer setting, ms

SystemConfig.defaultConfig = {
    configName: "Default",
    version: SystemConfig.configVersion,
    memorySize: 40000,                  // digits
    indexRegisters: 1,
    floatingPoint: 0,                   // for now...
    binaryCapabilities: 0,

    ControlPanel: {
        Program1SW: 0,                  // Program Switches 0/1
        Program2SW: 0,
        Program3SW: 0,
        Program4SW: 0,
        DiskStopSW: 0,
        ParityStopSW: 0,
        IOStopSW: 0,
        OflowStopSW: 0,
        MARSelSW: 0
    },

    Typewriter: {
        marginLeft: 0,
        marginRight: 85,
        tabs: "9,17,25,33,41,49,57,65,73,81"
    },

    Card: {
        hasCard: 0,
        cpm: 500
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
    }
};
