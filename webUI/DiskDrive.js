/***********************************************************************
* retro-1620/webUI DiskDrive.js
************************************************************************
* Copyright (c) 2023, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* Disk drive module for the 1311 Disk Storage subsystem.
*
* Defines a disk subsystem (control and up to 4 drives) device type.
*
************************************************************************
* 2023-05-27  P.Kimpel
*   Original version, from CardPunch.js.
***********************************************************************/

export {DiskDrive};

import {Envir} from "../emulator/Envir.js";
import {DiskModule} from "./DiskModule.js";
import {Register} from "../emulator/Register.js";
import {Timer} from "../emulator/Timer.js";
import {ToggleButton} from "./ToggleButton.js";
import {WaitSignal} from "../emulator/WaitSignal.js";
import {openPopup} from "./PopupUtil.js";

class DiskDrive {

    // Static Properties

    static moduleMax = 4;               // max disk modules allowed
    static diskDriveTop = 0;            // initial top coordinate of DiskDrive window
    static diskModuleTop = 42;          // height of top panel controls
    static diskModuleHeight = 34;       // height of small disk module panel
    static storageName = "retro-1620-Disk-Storage-DB";
    static storageVersion = 1;          // IndexedDB schema version
    static windowHeight = 30;           // window innerHeight, pixels
    static windowWidth = 350;           // window innerWidth, pixels


    // Public Instance Properties

    db = null;                          // IndexedDB data base object (after open)
    doc = null;                         // window document object
    window = null;                      // window object
    driveReady = false;                 // true if drive is ready
    driveIdle = false;                  // true if drive is not busy with an I/O
    innerHeight = 0;                    // window specified innerHeight
    module = new Array(4);              // disk drive module objects
    moduleCount = 0;                    // number of enabled modules
    compareDisable = 0;                 // disk drive compare disable enabled
    writeAddress = 0;                   // disk drive write address enabled

    selectedModule = null;              // currently selected module object
    selectedModuleNr = 0;               // currently selected module number 0-3
    sectorAddr = 0;                     // current BCD sector address
    moduloCompare = false;              // current address comparison mode (true=>cyl/track/sector only)

    timer = new Timer();                // delay management timer


    constructor(context) {
        /* Initializes and wires up events for the disk storage device, supporting
        up to four disk drive modules.
        "context" is an object passing other objects and callback functions from
        the global script:
            config is the SystemConfig object
            processor is the Processor object
        */

        this.context = context;
        this.config = context.config;
        this.processor = context.processor;

        this.waitForIdle = new WaitSignal();

        this.boundCompareDisableClick = this.compareDisableClick.bind(this);
        this.boundWriteAddressClick = this.writeAddressClick.bind(this);

        let geometry = this.config.formatWindowGeometry("DiskDrive");
        if (geometry.length) {
            [this.innerWidth, this.innerHeight, this.windowLeft, this.windowTop] =
                    this.config.getWindowGeometry("DiskDrive");
        } else {
            this.innerWidth  = DiskDrive.windowWidth;
            this.innerHeight = DiskDrive.windowHeight;
            this.windowLeft =  0;
            this.windowTop =   DiskDrive.diskDriveTop;
            geometry = `,left=${this.windowLeft},top=${this.windowTop}` +
                       `,innerWidth=${this.innerWidth},innerHeight=${this.innerHeight}`;
        }

        this.openDatabase().then((result) => {
            openPopup(window, "../webUI/DiskDrive.html", "retro-1620.Disk Drive",
                    "location=no,scrollbars,resizable" + geometry,
                    this, this.diskDriveOnLoad);
        });
    }


    /**************************************/
    $$(id) {
        /* Returns a DOM element from its id property. Must not be called until
        punchOnLoad is called */

        return this.doc.getElementById(id);
    }

    /**************************************/
    diskDriveOnLoad(ev) {
        /* Initializes the disk drive window and user interface */
        const diskConfig = this.config.getNode("Disk");

        this.doc = ev.target;           // now we can use this.$$()
        this.doc.title = "retro-1620 Disk Drive";
        this.window = this.doc.defaultView;
        this.origin = `${this.window.location.protocol}//${this.window.location.host}`;
        this.innerHeight = DiskDrive.diskModuleTop;

        this.compareDisableSwitch = this.$$("DiskCompareDisableSwitch");
        this.compareDisableSwitch.checked = false;      // always initializes to off
        this.compareDisableSwitch.addEventListener("click", this.boundCompareDisableClick);

        this.writeAddressBtn = new ToggleButton(this.$$("DiskDrivePanel"), null, null,
                "DiskWriteAddressBtn", "WRITE<br>ADDRESS", "device yellowButton", "yellowLit");
        this.writeAddressBtn.set(0);                    // always initializes to off
        this.writeAddressBtn.addEventListener("click", this.boundWriteAddressClick);

        const panel = this.$$("ControlsDiv");
        for (let moduleNr=0; moduleNr<diskConfig.module.length; ++moduleNr) {
            const mod = diskConfig.module[moduleNr];
            if (mod.exists) {
                ++this.moduleCount;
                this.innerHeight += DiskDrive.diskModuleHeight;
                this.$$(`DiskModule${moduleNr}`).style.display = "block";
                this.module[moduleNr] = new DiskModule(this.context, this.doc, this.db, this, moduleNr);
            }
        }

        this.window.addEventListener("beforeunload", this.beforeUnload);

        // Resize the window to take into account the number of modules, then
        // open the modules, initializing them if necessary.
        this.window.setTimeout(async () => {
            this.config.restoreWindowGeometry(this.window,
                    this.innerWidth, this.innerHeight, this.windowLeft, this.windowTop);

            for (const mod of this.module) {
                if (mod && mod.started) {
                    await mod.openDiskModule();
                }
            }

            this.driveIdle = true;
        }, 250);
    }

    /**************************************/
    compareDisableClick(ev) {
        /* Click handler for the Compare Disable toggle switch */

        this.compareDisable = (ev.target.checked ? 1 : 0);
        this.config.putNode("Disk.compareDisable", this.compareDisable);
    }

    /**************************************/
    writeAddressClick(ev) {
        /* Click handler for the Write Address toggle button. Writing addresses
        (full track writes) are only enabled if the Compare Disable switch is on */

        if (this.driveReady) {
            this.writeAddressBtn.flip();
            this.writeAddress = this.writeAddressBtn.state;
        }
    }

    /**************************************/
    setDriveReadyStatus() {
        /* Sets the drive ready status from the module status states */

        this.driveReady = (this.moduleCount > 0 && this.module[0].enabled);
    }

    /**************************************/
    genericIDBError(ev) {
        // Formats a generic alert message when an otherwise-unhandled data base error occurs */

        alert("DiskDrive storage UNHANDLED ERROR: " + ev.target.error.message);
    }

    /**************************************/
    openDatabase() {
        /* Attempts to open the DiskDrive storage database specified by
        DiskDrive.storageName. If successful, sets this.db to the IDB object and
        fulfills the async Promise with value true */

        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DiskDrive.storageName, DiskDrive.storageVersion);

            req.onerror = (ev) => {
                alert("Cannot open DiskDrive storage\ndata base \"" +
                      DiskDrive.storageName + "\":\n" + ev.target.error);
            };

            req.onblocked = (ev) => {
                alert(DiskDrive.storageName + " DiskDrive storage open is blocked -- CANNOT CONTINUE");
            };

            req.onupgradeneeded = (ev) => {
                /* Handles the onupgradeneeded event for the IDB data base. Upgrades
                the schema to the current version. For a new data base, creates the default
                configuration. "ev" is the upgradeneeded event */
                const req = ev.target;
                const db = req.result;
                const txn = req.transaction;

                txn.onabort = (ev) => {
                    alert("Aborted DB upgrade to DiskDrive storage\ndata base \"" +
                          DiskDrive.storageName + "\":\n" + ev.target.error);
                };

                txn.onerror = (ev) => {
                    alert("Error in DB upgrade to DataFile storage\ndata base \"" +
                          DiskDrive.storageName + "\":\n" + ev.target.error);
                };

                if (ev.oldVersion < 1) {
                    // New data base: create stores for each possible disk module
                    db.createObjectStore("Module0");
                    db.createObjectStore("Module1");
                    db.createObjectStore("Module2");
                    db.createObjectStore("Module3");
                    console.log(`DiskDrive data base initialized to version=${ev.newVersion}`);
                }

                if (ev.newVersion > DiskDrive.storageVersion) {
                    alert("DiskDrive storage upgrade unsupported IDB version: old=" +
                          ev.oldVersion + ", new=" + ev.newVersion);
                    txn.abort();
                }
            };

            req.onsuccess = (ev) => {
                /* Handles a successful IDB open result */
                const idbError = this.genericIDBError.bind(this);

                // Save the DB object reference globally for later use
                this.db = ev.target.result;
                // Set up the generic error handlers
                this.db.onerror = idbError;
                this.db.onabort = idbError;
                resolve(true);
                console.debug(`DiskDrive data base opened successfully, version=${DiskDrive.storageVersion}`);
            };
        });
    }

    /**************************************/
    selectModule(driveCode, sectorAddr) {
        /* Determines the disk module number from the DCF drive code and
        possibly from the high-order digit of the sectorAddr. Sets the current
        module object and number, sector address, and the flag used when
        comparing BCD addresses. Returns true on successful selection */
        let result = true;              // assume success

        this.selectedModuleNr = 0;
        this.moduloCompare = true;
        this.sectorAddr = sectorAddr;

        if (this.moduleCount > 1) {     // count==0 => module 0
            switch (driveCode) {
            case 0:     // determine module from disk address
            case 2:
            case 4:
            case 6:
                this.moduloCompare = false;
                let driveDigit = (sectorAddr >> Register.digitBits*4) & Register.bcdMask;
                if (driveDigit < 2) {
                    this.selectedModuleNr = 0;
                } else if (driveDigit < 4) {
                    this.selectedModuleNr = 1;
                } else if (driveDigit < 6) {
                    this.selectedModuleNr = 2;
                } else if (driveDigit < 8) {
                    this.selectedModuleNr = 3;
                } else {
                    result = false;
                    this.selectedModuleNr = 9;
                }
                break;
            case 1:
            case 3:
            case 5:
            case 7:
                this.selectedModuleNr = driveCode >> 1;
                break;
            default:
                result = false;
                this.selectedModuleNr = 9;
                break;
            }
        }

        if (!result) {
            this.selectedModule = null;
        } else {
            this.selectedModule = this.module[this.selectedModuleNr];
            if (!(this.selectedModule && this.selectedModule.moduleReady)) {
                result = false;
                this.selectedModule = null;
            }
        }

        return result;
    }

    /**************************************/
    async initiateSeek() {
        /* Initiates a seek for the currently-selected module and BCD sector
        address. Returns immediately, but the drive will stay busy until the
        seek completes */

        if (!this.driveReady) {
            return;
        }

        if (!this.driveIdle) {
            if (await this.waitForIdle.request()) {
                return;                 // wait canceled
            }
        }

        if (this.selectedModule) {
            this.driveIdle = false;
            await this.selectedModule.seek(this.sectorAddr);
            this.driveIdle = true;
            this.waitForIdle.signal(false);
        }
    }

    /**************************************/
    async readSectors(storeSector) {
        /* Initiates a read for the currently-selected module and BCD sector
        address. "storeSector" is a callback function to store or compare the
        data in core memory. Returns once the read completes */

        if (!this.driveReady) {
            return;
        }

        if (!this.driveIdle) {
            if (await this.waitForIdle.request()) {
                return;                 // wait canceled
            }
        }

        if (this.selectedModule) {
            this.driveIdle = false;
            await this.selectedModule.readSectors(this.sectorAddr, this.moduloCompare, storeSector);
            this.driveIdle = true;
            this.waitForIdle.signal(false);
        }
    }

    /**************************************/
    async readTrack(storeSector) {
        /* Initiates a read a full track for the currently-selected module and
        BCD sector address. "storeSector" is a callback function to store the
        data in core memory. Returns once the read completes */

        if (!this.driveReady) {
            return;
        }

        if (!this.driveIdle) {
            if (await this.waitForIdle.request()) {
                return;                 // wait canceled
            }
        }

        if (this.selectedModule) {
            this.driveIdle = false;
            await this.selectedModule.readTrack(this.sectorAddr, storeSector);
            this.driveIdle = true;
            this.waitForIdle.signal(false);
        }
    }

    /**************************************/
    async checkTrack(storeSector) {
        /* Initiates a read a full track for the currently-selected module and
        BCD sector address. "storeSector" is a callback function to compare the
        data in core memory. Returns once the read completes */

        if (!this.driveReady) {
            return;
        }

        if (!this.driveIdle) {
            if (await this.waitForIdle.request()) {
                return;                 // wait canceled
            }
        }

        if (this.selectedModule) {
            this.driveIdle = false;
            await this.selectedModule.checkTrack(this.sectorAddr, storeSector);
            this.driveIdle = true;
            this.waitForIdle.signal(false);
        }
    }

    /**************************************/
    async writeSectors(storeSector) {
        /* Initiates a write for the currently-selected module and BCD sector
        address. "storeSector" is a callback function to store or compare the
        data in core memory. Returns once the write completes */

        if (!this.driveReady) {
            return;
        }

        if (!this.driveIdle) {
            if (await this.waitForIdle.request()) {
                return;                 // wait canceled
            }
        }

        if (this.selectedModule) {
            this.driveIdle = false;
            await this.selectedModule.writeSectors(this.sectorAddr, this.moduloCompare, storeSector);
            this.driveIdle = true;
            this.waitForIdle.signal(false);
        }
    }

    /**************************************/
    async writeTrack(storeSector) {
        /* Initiates a write a full track for the currently-selected module and
        BCD sector address. "storeSector" is a callback function to store the
        data in core memory. Returns once the write completes */

        if (!this.driveReady) {
            return;
        }

        if (!this.driveIdle) {
            if (await this.waitForIdle.request()) {
                return;                 // wait canceled
            }
        }

        if (this.selectedModule) {
            this.driveIdle = false;
            await this.selectedModule.writeTrack(this.sectorAddr, this.moduloCompare, storeSector);
            this.driveIdle = true;
            this.waitForIdle.signal(false);
        }
    }

    /**************************************/
    release() {
        /* Called by Processor to indicate the device has been released.
        Not used with DiskDrive */
    }

    /**************************************/
    manualRelease() {
        /* Called by Processor to indicate the device has been released manually.
        Not used with DiskDrive */
    }

    /**************************************/
    diskReset() {
        /* Called by Processor to indicate the device has been RESET-RELEASEd */

        this.driveIdle = true;
        this.waitForIdle.signal(true);  // cancel any pending wait
    }

    /**************************************/
    shutDown() {
        /* Shuts down the device */

        this.config.putWindowGeometry(this.window, "DiskDrive");
        this.window.removeEventListener("beforeunload", this.beforeUnload, false);
        this.compareDisableSwitch.removeEventListener("click", this.boundCompareDisableClick);
        this.writeAddressBtn.removeEventListener("click", this.boundWriteAddressClick);
        for (let x=0; x<DiskDrive.maxModules; ++x) {
            this.module[x]?.shutDown();
}

        this.window.close();
    }

} // end class DiskDrive
