/***********************************************************************
* retro-1620/webUI DiskModule.js
************************************************************************
* Copyright (c) 2023, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* Disk drive module (unit) for the 1311 Disk Storage subsystem.
*
* Defines a single 1311 Model 2 or 3 disk drive using a 1316 disk pack
* with a storage capacity of 2,000,000 digits. DiskModule objects are
* created and owned by the DiskDrive object, which contains the
* interface to the 1620 processor and memory.
*
************************************************************************
* 2023-06-10  P.Kimpel
*   Original version, from DiskDrive.js.
***********************************************************************/

export {DiskModule};

import {Envir} from "../emulator/Envir.js";
import {Register} from "../emulator/Register.js";
import {DiskStorage} from "./DiskStorage.js";
import {DiskDrive} from "./DiskDrive.js";
import {openPopup} from "./PopupUtil.js";
import {Timer} from "../emulator/Timer.js";
import {ToggleButton} from "./ToggleButton.js";

class DiskModule {

    // Static Properties

    static rpm = 1500;                  // rotational speed, revolutions/minute
    static latency = 60000/DiskModule.rpm; // rotational latency, ms/disk revolution
    static sectorPeriod = DiskModule.latency/DiskStorage.trackSectors;   // sector transfer time, ms
    static seekTurnaroundTime = 75;     // time for seek turnaround at home position, ms
    static seekUpdateTime = 15;         // time between seek progress updates, ms

    static seekToCylinderTime = [       // time to seek from home to a cylinder,  ms
          0,  11,  22,  33,  44,  56,  67,  78,  89, 100,
         97,  94,  90,  87,  84,  81,  78,  74,  71,  68,
         69,  70,  71,  72,  73,  74,  75,  76,  77,  78,
         80,  81,  83,  84,  86,  87,  89,  90,  92,  93,
         95,  96,  98,  99, 101, 103, 104, 106, 107, 109,
        111, 112, 114, 115, 117, 119, 120, 122, 123, 125,
        127, 128, 130, 131, 133, 134, 136, 137, 139, 140,
        142, 143, 145, 147, 149, 150, 152, 154, 155, 157,
        159, 160, 162, 163, 165, 167, 168, 170, 171, 173,
        175, 176, 178, 179, 181, 182, 184, 185, 187, 188];

    static seekToHomeTime(fromCyl) {
        /* Determines the time in ms to seek from a cylinder to the home position */

        return fromCyl*1.29;
    }


    // Public Instance Properties

    db = null;                          // IndexedDB data base reference
    enabled = 0;                        // module enabled
    started = 0;                        // module started
    moduleName = "";                    // module object store name
    moduleReady = 0;                    // module ready status
    sectorKey = 0;                      // current sector address, binary
    sectorNr = 0;                       // current sector number within track, binary
    trackNr = 0;                        // current track/head number, binary
    cylinderNr = 0;                     // current cylinder number, binary
    seekCylinderNr = 0;                 // last cylinder number seeked to

    timer = new Timer();                // delay management timer


    constructor(context, doc, store, drive, moduleNr) {
        /* Initializes and wires up events for the disk storage module.
        "context" is an object passing other objects and callback functions from
        the global script:
            config is the SystemConfig object
            processor is the Processor object
        "doc" is the document object for the DiskDrive window.
        "db" is a reference to the (opened) IndexedDB object
        "drive" is a reference to the DiskDrive module
        "moduleNr" is the 0-relative number of this disk module.
        */

        this.context = context;
        this.config = context.config;
        this.processor = context.processor;
        this.doc = doc;
        this.store = store;
        this.db = store.db;
        this.drive = drive;
        this.moduleNr = moduleNr;

        const moduleConfig = this.config.getNode("Disk.module", moduleNr);
        this.enabled = moduleConfig.enabled;
        this.started = moduleConfig.started;
        this.moduleName = store.moduleName[moduleNr];
        this.sectorBuf = new Uint8Array(DiskStorage.sectorSize);

        this.boundEnableClick = this.enableClick.bind(this);
        this.boundStartClick = this.startClick.bind(this);

        this.panel = this.doc.getElementById(`DiskModule${moduleNr}`);
        this.statusLamp = this.panel.querySelector(".diskModuleStatus");
        this.sectorAddrBox = this.panel.querySelector(".diskModuleSectorNr");
        this.seekPositionMeter = this.panel.querySelector(".diskModuleSeekPosition");
        this.enableSwitch = this.panel.querySelector(`#DiskModule${moduleNr}EnableSwitch`);
        this.enableSwitch.addEventListener("click", this.boundEnableClick);

        this.startBtn = new ToggleButton(this.panel, null, null,
                `DiskModule${moduleNr}StartBtn`, "START<br>STOP", "device whiteButton", "whiteLit");
        this.startBtn.addEventListener("click", this.boundStartClick);
    }


    /**************************************/
    parseSectorAddress(sectorAddr) {
        /* Converts "sectorAddr" (in digit BCD format) to a binary number and
        decomposes that number into cylinder, track, and sector fields */
        let addr = 0;
        let bcd = sectorAddr & Register.bcdValueMask;
        let power = 1;

        while (bcd) {
            let d = bcd & 0x0F;
            if (d > 9) {
                this.processor.setIndicator(36, `Invalid sector address digit ${d.toString(16)} in ${sectorAddr.toString(8)}`);
                d &= 9;                 // convert it to an 8 or 9
            }

            addr += d*power;
            power *= 10;
            bcd >>= Register.digitBits;
        }

        this.sectorKey = addr;
        this.sectorNr = addr % DiskStorage.trackSectors;
        addr = (addr-this.sectorNr)/DiskStorage.trackSectors;
        this.trackNr = addr % DiskStorage.cylinderTracks;
        addr = (addr-this.trackNr)/DiskStorage.cylinderTracks;
        this.cylinderNr = addr % DiskStorage.maxCylinders;
    }

    /**************************************/
    setSectorAddrBox(addr) {
        /* Sets a BCD sector address into this.sectorAddrBox */

        this.sectorAddrBox.value = DiskStorage.convertSectorAddress(addr);
    }

    /**************************************/
    setModuleReadyStatus() {
        /* Evaluates the status of the module and sets ready if possible */

        this.moduleReady = (this.enabled && this.started && this.drive.module[0].enabled);
        if (this.moduleReady) {
            this.statusLamp.classList.add("diskReady");
        } else {
            this.statusLamp.classList.remove("diskReady");
        }

        this.drive.setDriveReadyStatus();
    }

    /**************************************/
    enableClick(ev) {
        /* Click handler for the Enable switch */

        this.enabled = (this.enableSwitch.checked ? 1 : 0);
        const config = this.config.getNode("Disk.module", this.moduleNr);
        config.enabled = this.enabled;
        this.config.putNode("Disk.module", config, this.moduleNr);
        this.setModuleReadyStatus();

        // If this is module 0 (the control unit), turning off enable will turn
        // off the ready status of all other modules.
        if (this.moduleNr == 0) {
            for (let x=1; x<this.drive.module.length; ++x) {
                if (x != this.moduleNr && this.drive.module[x]) {
                    this.drive.module[x].setModuleReadyStatus();
                }
            }
        }
    }

    /**************************************/
    startClick(ev) {
        /* Click handler for the Start/Stop toggle button. Opens the dialog box
        and wires up the events for the disk module functions */
        let deltaHeight = 0;
        let deltaWidth = 0;

        const initiateExtract = this.extractModule.bind(this);
        const initiateSave = this.saveModule.bind(this);

        const initiateLoad = (ev) => {
            const reader = new FileReader();
            const f = ev.target.files[0];       // the selected file

            const fileLoader_onLoad = (ev) => {
                /* Handle the onLoad event for a Text FileReader and pass the text
                of the file to the processsor for loading into memory */
                const image = ev.target.result;

                if (this.drive.window.confirm(`Are you sure you want to OVERWRITE THE CONTENTS of module ${this.moduleNr} and load new data from a disk pack image file?`)) {
                    this.store.loadModule(this.moduleNr, image).then((result) => {
                        if (result) {
                            this.drive.window.alert("Error during disk pack image load");
                        } else {
                            this.started = true;
                            const config = this.config.getNode("Disk.module", this.moduleNr);
                            config.imageName = f.name;
                            this.config.putNode("Disk.module", config, this.moduleNr);
                            setStatus();
                            closeDialog();
                        }
                    });
                }
            };

            reader.onload = fileLoader_onLoad;
            reader.readAsText(f);
        };

        const initiateInitialize = (ev) => {
                if (this.drive.window.confirm(`Are you sure you want to COMPLETELY ERASE and reinitialize module ${this.moduleNr}?`)) {
                this.store.initializeModule(this.moduleNr).then(() => {
                    const config = this.config.getNode("Disk.module", this.moduleNr);
                    config.imageName = "(initialized)";
                    this.config.putNode("Disk.module", config, this.moduleNr);
                    this.started = true;
                    setStatus();
                    closeDialog();
                });
            }
        };

        const setStatus = () => {
            const config = this.config.getNode("Disk.module", this.moduleNr);
            config.started = this.started;
            this.config.putNode("Disk.module", config, this.moduleNr);
            this.startBtn.set(this.started);
            this.setModuleReadyStatus();
        };

        const closeDialog = (ev) => {
            this.drive.$$("DiskPackCloseBtn").removeEventListener("click", closeDialog);
            this.drive.$$("DiskPackInitializeBtn").removeEventListener("click", initiateInitialize);
            this.drive.$$("DiskPackExtractBtn").removeEventListener("click", initiateExtract);
            this.drive.$$("DiskPackSaveBtn").removeEventListener("click", initiateSave);
            this.drive.$$("DiskPackSelector").removeEventListener("change", initiateLoad);
            this.drive.$$("DiskPackSelector").value = null;       // reset the file-picker control
            this.drive.$$("DiskPackDiv").style.display = "none";
            this.drive.window.resizeBy(-deltaWidth, -deltaHeight);
        };

        if (!this.started) {
            this.started = true;
            this.openDiskModule();
            setStatus();
        } else {
            this.started = false;
            setStatus();
            this.setModuleReadyStatus();
            this.drive.$$("DiskPackDiv").style.display = "block";
            this.drive.$$("DiskPackSelector").addEventListener("change", initiateLoad);
            this.drive.$$("DiskPackExtractBtn").addEventListener("click", initiateExtract);
            this.drive.$$("DiskPackSaveBtn").addEventListener("click", initiateSave);
            this.drive.$$("DiskPackInitializeBtn").addEventListener("click", initiateInitialize);
            this.drive.$$("DiskPackCloseBtn").addEventListener("click", closeDialog);

            const rect = this.drive.$$("DiskPackDiv").getBoundingClientRect();
            deltaHeight = Math.max(rect.height + 64 - this.drive.window.innerHeight, 0);
            deltaWidth = Math.max(rect.width + 64 - this.drive.window.innerWidth, 0);
            this.drive.window.resizeBy(deltaWidth, deltaHeight);
        }
    }

    /**************************************/
    extractModule() {
        /* Extracts the contents of the module storage and converts it to text
        in a new temporary window so it can be copied, printed, or saved by the
        user */
        const title = "retro-1620 Disk Image Extract";

        const extractDiskImage = (ev) => {
            const doc = ev.target;
            const win = doc.defaultView;
            const content = doc.getElementById("Paper");

            const onerror = (ev) => {
                this.processor.setIndicator(36, `Disk extractModule ${this.moduleName} error: ${ev.target.error.name}`);
            };

            const onabort = (ev) => {
                this.processor.setIndicator(36, `Disk extractModule ${this.moduleName} abort: ${ev.target.error.name}`);
            };

            doc.title = title;
            win.moveTo((screen.availWidth-win.outerWidth)/2, (screen.availHeight-win.outerHeight)/2);

            this.store.serializeModuleData(this.moduleNr, "extractModule", onerror, onabort, (text) => {
                content.textContent = text;
            });
        };

        openPopup(this.drive.window, "./FramePaper.html", "",
                "scrollbars,resizable,width=660,height=500",
                this, extractDiskImage);
    }

    /**************************************/
    saveModule() {
        /* Extracts the contents of the module storage, converts it to text,
        and saves it in the local file system as directed by the user */
        const title = "retro-1620-Disk-Image.pack";

        const onerror = (ev) => {
            this.processor.setIndicator(36, `Disk saveModule ${this.moduleName} error: ${ev.target.error.name}`);
        };

        const onabort = (ev) => {
            this.processor.setIndicator(36, `Disk saveModule ${this.moduleName} abort: ${ev.target.error.name}`);
        };

        this.store.serializeModuleData(this.moduleNr, "saveModule", onerror, onabort, (text) => {
            const url = `data:text/plain,${encodeURIComponent(text)}`;
            const hiddenLink = this.doc.createElement("a");

            hiddenLink.setAttribute("download", title);
            hiddenLink.setAttribute("href", url);
            hiddenLink.click();
        });
    }

    /**************************************/
    async openDiskModule() {
        /* Opens, and if necessary initializes, the disk storage medium for this
        disk module. Determines and updates the status of the module */

        let count = await this.store.countSectors(this.moduleNr);

        if (count <= 0) {
            this.panel.classList.add("dimmed");
            await this.store.initializeModule(this.moduleNr);
            this.panel.classList.remove("dimmed");
        }

        this.enableSwitch.checked = this.enabled;
        this.startBtn.set(this.started);

        this.setModuleReadyStatus();
        console.debug(`DiskModule ${this.moduleName} opened successfully, ${count} sectors`);
    }

    /**************************************/
    async seek(sectorAddr) {
        /* Performs a seek by positioning the access arm to the cylinder
        specified by the BCD "sectorAddr". This does not involve any access
        to the IDB data base */

        if (!this.moduleReady) {
            return;
        }

        this.parseSectorAddress(sectorAddr);
        this.setSectorAddrBox(sectorAddr);

        // Seek from current cylinder to home position.
        let seekTime = DiskModule.seekToHomeTime(this.seekCylinderNr);
        let elapsed = 0;
        while (elapsed < seekTime) {
            let rem = seekTime - elapsed;
            elapsed -= performance.now();
            await this.timer.delayFor(Math.min(DiskModule.seekUpdateTime, rem));
            elapsed += performance.now();
            this.seekPositionMeter.value = Math.max(1-elapsed/seekTime, 0)*this.seekCylinderNr;
        }

        // Turnaround delay at the home position.
        seekTime = DiskModule.seekTurnaroundTime + seekTime - elapsed;
        elapsed = -performance.now();
        await this.timer.delayFor(seekTime);
        elapsed += performance.now();

        // Seek from home to new cylinder position.
        seekTime = DiskModule.seekToCylinderTime[this.cylinderNr] + seekTime - elapsed;
        elapsed = 0;
        while (elapsed < seekTime) {
            let rem = seekTime - elapsed;
            elapsed -= performance.now();
            await this.timer.delayFor(Math.min(DiskModule.seekUpdateTime, rem));
            elapsed += performance.now();
            this.seekPositionMeter.value = Math.min(elapsed/seekTime, 1)*this.cylinderNr;
        }

        this.seekCylinderNr = this.cylinderNr;
    }

    /**************************************/
    findSector(store, sectorAddr, startTime, moduloCompare, successor) {
        /* Attempts to locate the sector on a disk module's object store:
            store:          the object store for that disk module
            sectorAddr:     BCD sector address to find
            startTime:      starting clock time, ms
            moduloCompare:  true indicates that addresses should be compared
                            without regard to any module number in the
                            high-order digits of either address.
            successor:      function to call on completion
        The cylinder number in "sectorAddr" is ignored and the currently-seeked
        cylinder is used instead. Returns an object with the results of the search.
        The routine first tries the most common case where the sectorAddr matches
        the store's primary key value. If that doesn't work, it reads the entire
        track and searches sector by sector for an address match */
        const trackStartKey = (this.seekCylinderNr*DiskStorage.cylinderTracks + this.trackNr)*DiskStorage.trackSectors;
        const result = {
            error: false,               // true if an error occurred (not found or worse)
            key: 0,                     // primary key of the matching sector
            addr: sectorAddr,           // BCD sector address as passed in
            timing: 0,                  // time for the search, ms
            data: null                  // for a successful find, the sector data
        };

        // Compute a random starting sector number within the current track.
        const startSectorNr = (Math.floor((startTime % DiskModule.latency)/DiskModule.latency * DiskStorage.trackSectors) +
                               1) % DiskStorage.trackSectors;  // add one sector for head-select time

        result.key = this.sectorKey = trackStartKey + this.sectorNr;
        store.get(this.sectorKey).onsuccess = (ev) => {
            const data = ev.target.result;

            if (!data) {                // nothing found (unlikely)
                this.processor.setIndicator(36, `Disk findSector key not found=${this.sectorKey} in ${this.moduleName}`);
                result.error = true;
                result.timing = (DiskStorage.trackSectors*2-startSectorNr)*DiskModule.sectorPeriod;
                successor(result);
            } else {
                result.timing = ((this.sectorKey-trackStartKey-startSectorNr+DiskStorage.trackSectors) %
                                 DiskStorage.trackSectors)*DiskModule.sectorPeriod;
                result.sectorAddr = DiskStorage.getSectorAddress(data);
                if (DiskStorage.compareSectorAddress(sectorAddr, result.sectorAddr, moduloCompare)) {
                    result.data = data; // found it... we're done
                    successor(result);
                } else {
                    // No address match, so do it the hard way... search for sectorAddr on the track
                    const trackEndKey = trackStartKey + DiskStorage.trackSectors-1;
                    const range = IDBKeyRange.bound(trackStartKey, trackEndKey);
                    let found = false;  // sectorAddr was found within track
                    let timing = 0;     // additional track search time, ms

                    store.getAll(range).onsuccess = (ev) => {
                        const sectors = ev.target.result;
                        if (!sectors) { // nothing found (should never happen)
                            this.processor.setIndicator(36, `Disk findSector track not found=${trackStartKey} in ${this.moduleName}`);
                            result.error = true;
                            result.timing += DiskModule.latency;
                        } else {
                            // First search the track starting after the random sector
                            for (let x=startSectorNr+1; x<DiskStorage.trackSectors; ++x) {
                                timing += DiskModule.sectorPeriod;
                                result.sectorAddr = DiskStorage.getSectorAddress(sectors[x]);
                                if (DiskStorage.compareSectorAddress(sectorAddr, result.sectorAddr, moduloCompare)) {
                                    found = true;
                                    result.key = trackStartKey+x;
                                    result.data = sectors[x];
                                    break;
                                }
                            }

                            // Not found after startSectorNr, so wrap around to start of the track
                            if (!found) {
                                for (let x=0; x<DiskStorage.trackSectors; ++x) {
                                    timing += DiskModule.sectorPeriod;
                                    result.sectorAddr = DiskStorage.getSectorAddress(data);
                                    if (DiskStorage.compareSectorAddress(sectorAddr, result.sectorAddr, moduloCompare)) {
                                        found = true;
                                        result.key = trackStartKey+x;
                                        result.data = sectors[x];
                                        break;
                                    }
                                }
                            }

                            this.sectorKey = result.key;
                            result.timing += timing;
                            if (!found) {
                                this.processor.setIndicator(36, `Disk findSector key not on track ${trackStartKey} for ${DiskStorage.convertSectorAddress(sectorAddr)} in ${this.moduleName}`);
                                result.error = true;
                            }
                        }

                        successor(result);
                    };
                }
            }
        };
    }

    /**************************************/
    readSectors(sectorAddr, moduloCompare, storeSector) {
        /* Attempts to read one or more sectors on the currently-seeked cylinder:
            sectorAddr:     starting BCD sector address
            moduloCompare:  true indicates that addresses should be compared
                            without regard to any module number in their
                            high-order digits.
            storeSector:    function to call passing each sector's data with params:
                                Boolean finished: end of cursor
                                Boolean error: fatal error occurred
                                Uint8Array data: 105 digits of sector data (or null)
                            Returns true if no more sectors to read
        The cylinder number in "sectorAddr" is ignored and the currently-seeked
        cylinder is used instead. Returns a Promise that resolves on completion */
        const startTime = performance.now();

        this.parseSectorAddress(sectorAddr);
        this.setSectorAddrBox(sectorAddr);

        // Construct and return a Promise for an IDB transaction to read the sectors.
        return new Promise((resolve, reject) => {
            const txn = this.db.transaction(this.moduleName, "readonly");
            const store = txn.objectStore(this.moduleName);
            let timing = 0;

            txn.onerror = (ev) => {
                this.processor.setIndicator(36, `Disk read ${this.moduleName} error: addr=${this.sectorKey}, ${ev.target.error.name}`);
            };

            txn.onabort = (ev) => {
                this.processor.setIndicator(36, `Disk read ${this.moduleName} abort: addr=${this.sectorKey}, ${ev.target.error.name}`);
            };

            txn.oncomplete = (ev) => {
                const delay = startTime + timing - performance.now();
                setTimeout(resolve, delay);     // delay for disk rotation time before resolve
            };

            this.findSector(store, sectorAddr, startTime, moduloCompare, (findResult) => {
                let lastKey = findResult.key;
                timing = findResult.timing;
                // Store the first sector; returns false if count not exhausted.
                if (!storeSector(false, findResult.error, findResult.data)) {
                    // More sectors needed, so open a cursor for the rest of the cylinder.
                    const cylinderEndKey = (this.seekCylinderNr+1)*DiskStorage.cylinderTracks*DiskStorage.trackSectors - 1;
                    if (lastKey >= cylinderEndKey) {
                        this.processor.setIndicator(38, `Disk read cylinder overflow at key ${lastKey}`);
                        return;
                    }

                    const range = IDBKeyRange.bound(lastKey+1, cylinderEndKey);
                    store.openCursor(range).onsuccess = (ev) => {
                        const cursor = ev.target.result;
                        if (!cursor) {
                            this.processor.setIndicator(38, `Disk read cylinder overflow after key ${lastKey}`);
                            storeSector(true, false, null);     // end of cylinder
                        } else {
                            const data = cursor.value;
                            const diskAddr = DiskStorage.getSectorAddress(data);
                            this.setSectorAddrBox(diskAddr);
                            timing += DiskModule.sectorPeriod;
                            if (++lastKey != cursor.key) {
                                this.processor.setIndicator(36, `Disk read cursor key not sequential=${cursor.key} in ${this.moduleName}`);
                                storeSector(false, true, data);
                            } else if (!DiskStorage.compareSectorAddress(this.drive.sectorAddr, diskAddr, moduloCompare)) {
                                this.processor.setIndicator(36, `Disk read sector address mismatch ${DiskStorage.convertSectorAddress(diskAddr)}`);
                                storeSector(false, true, data);
                            } else {
                                if (!storeSector(false, false, data)) {         //store this sector
                                    cursor.continue();                          // advance to next sector
                                }
                            }
                        }
                    };
                }
            });
        });
    }

    /**************************************/
    readTrack(sectorAddr, storeSector) {
        /* Attempts to read a full track on the currently-seeked cylinder:
            sectorAddr:     starting BCD sector address
            storeSector:    function to call passing each sector's data with params:
                                Boolean finished: end of cursor
                                Boolean error: fatal error occurred
                                Uint8Array data: 105 digits of sector data (or null)
                            Returns true if no more sectors to read
        The cylinder number in "sectorAddr" is ignored and the currently-seeked
        cylinder is used instead. The track number is taken from "sectorAddr".
        This type of read does not check the sector addresses recorded on the
        disk -- it just blindly reads the track. Returns a Promise that resolves
        on completion */
        const startTime = performance.now();

        this.parseSectorAddress(sectorAddr);
        this.setSectorAddrBox(sectorAddr);

        // Compute a random starting sector number.
        const startSectorNr = (Math.floor((startTime % DiskModule.latency)/DiskModule.latency * DiskStorage.trackSectors) +
                               1) % DiskStorage.trackSectors;  // add one sector for head-select time

        // Construct and return a Promise for an IDB transaction to read the track.
        return new Promise((resolve, reject) => {
            const txn = this.db.transaction(this.moduleName, "readonly");
            const store = txn.objectStore(this.moduleName);

            // Set timing to start of next index point.
            let timing = (DiskStorage.trackSectors-1-startSectorNr)*DiskModule.sectorPeriod;

            txn.onerror = (ev) => {
                this.processor.setIndicator(36, `Disk readTrack ${this.moduleName} error: addr=${this.sectorKey}, ${ev.target.error.name}`);
            };

            txn.onabort = (ev) => {
                this.processor.setIndicator(36, `Disk readTrack ${this.moduleName} abort: addr=${this.sectorKey}, ${ev.target.error.name}`);
            };

            txn.oncomplete = (ev) => {
                const delay = startTime + timing - performance.now();
                setTimeout(resolve, delay);     // delay for disk rotation time before resolve
            };

            const trackStartKey = (this.seekCylinderNr*DiskStorage.cylinderTracks + this.trackNr)*DiskStorage.trackSectors;
            const range = IDBKeyRange.bound(trackStartKey, trackStartKey+DiskStorage.trackSectors-1);
            let lastKey = trackStartKey;

            store.openCursor(range).onsuccess = (ev) => {
                const cursor = ev.target.result;
                if (!cursor) {
                    storeSector(true, false, null);     // end of track
                } else {
                    const data = cursor.value;
                    const diskAddr = DiskStorage.getSectorAddress(data);
                    this.setSectorAddrBox(diskAddr);
                    timing += DiskModule.sectorPeriod;
                    if (lastKey != cursor.key) {
                        this.processor.setIndicator(36, `Disk readTrack cursor key not sequential=${cursor.key} in ${this.moduleName}`);
                        storeSector(false, true, data);
                    } else {
                        ++lastKey;
                        if (!storeSector(false, false, data)) {         //store this sector
                            cursor.continue();                          // advance to next sector
                        }
                    }
                }
            };
        });
    }

    /**************************************/
    checkTrack(sectorAddr, moduloCompare, storeSector) {
        /* Attempts to read a full track on the currently-seeked cylinder for
        a disk-check operation:
            sectorAddr:     starting BCD sector address
            moduloCompare:  true indicates that addresses should be compared
                            without regard to any module number in their
                            high-order digits.
            storeSector:    function to call passing each sector's data with params:
                                Boolean finished: end of cursor
                                Boolean error: fatal error occurred
                                Uint8Array data: 105 digits of sector data (or null)
                            Returns true if no more sectors to read
        The cylinder number in "sectorAddr" is ignored and the currently-seeked
        cylinder is used instead. The track number is taken from "sectorAddr".
        The operation first searches for a matching "sectorAddr" on the track,
        then starts the read at the next index point. Returns a Promise that
        resolves on completion */
        const startTime = performance.now();

        this.parseSectorAddress(sectorAddr);
        this.setSectorAddrBox(sectorAddr);

        // Construct and return a Promise for an IDB transaction to read the sectors.
        return new Promise((resolve, reject) => {
            const txn = this.db.transaction(this.moduleName, "readonly");
            const store = txn.objectStore(this.moduleName);
            let timing = 0;

            txn.onerror = (ev) => {
                this.processor.setIndicator(36, `Disk checkTrack ${this.moduleName} error: addr=${this.sectorKey}, ${ev.target.error.name}`);
            };

            txn.onabort = (ev) => {
                this.processor.setIndicator(36, `Disk checkTrack ${this.moduleName} abort: addr=${this.sectorKey}, ${ev.target.error.name}`);
            };

            txn.oncomplete = (ev) => {
                const delay = startTime + timing - performance.now();
                setTimeout(resolve, delay);     // delay for disk rotation time before resolve
            };

            this.findSector(store, sectorAddr, startTime, moduloCompare, (findResult) => {
                if (findResult.error) {
                    storeSector(false, true, null);     // sector address not found
                } else {
                    const trackStartKey = (this.seekCylinderNr*DiskStorage.cylinderTracks + this.trackNr)*DiskStorage.trackSectors;
                    const range = IDBKeyRange.bound(trackStartKey, trackStartKey+DiskStorage.trackSectors-1);
                    let lastKey = findResult.key;

                    // Advance timing to start of next index point.
                    timing = findResult.timing + (DiskStorage.trackSectors-1 - lastKey%DiskStorage.trackSectors)*DiskModule.sectorPeriod;

                    store.openCursor(range).onsuccess = (ev) => {
                        const cursor = ev.target.result;
                        if (!cursor) {
                            storeSector(true, false, null);     // end of track
                        } else {
                            const data = cursor.value;
                            const diskAddr = DiskStorage.getSectorAddress(data);
                            this.setSectorAddrBox(diskAddr);
                            timing += DiskModule.sectorPeriod;
                            if (++lastKey != cursor.key) {
                                this.processor.setIndicator(36, `Disk checkTrack cursor key not sequential=${cursor.key} in ${this.moduleName}`);
                                storeSector(false, true, data);
                            } else if (!DiskStorage.compareSectorAddress(this.drive.sectorAddr, diskAddr, moduloCompare)) {
                                this.processor.setIndicator(36, `Disk checkTrack sector address mismatch ${DiskStorage.convertSectorAddress(diskAddr)}`);
                                storeSector(false, true, data);
                            } else {
                                if (!storeSector(false, false, data)) {         //store this sector
                                    cursor.continue();                          // advance to next sector
                                }
                            }
                        }
                    };
                }
            });
        });
    }

    /**************************************/
    writeSectors(sectorAddr, moduloCompare, loadSector) {
        /* Attempts to write one or more sectors on the currently-seeked cylinder:
            sectorAddr:     starting BCD sector address
            moduloCompare:  true indicates that addresses should be compared
                            without regard to any module number in their
                            high-order digits.
            loadSector:     function to call passing each sector's data with params:
                                Boolean finished: end of cursor
                                Boolean error: fatal error occurred
                                Uint8Array data: 105 digits of sector data (or null)
                            Returns true if no more sectors to write
        The cylinder number in "sectorAddr" is ignored and the currently-seeked
        cylinder is used instead. Returns a Promise that resolves on completion */
        const startTime = performance.now();

        this.parseSectorAddress(sectorAddr);
        this.setSectorAddrBox(sectorAddr);

        // Construct and return a Promise for an IDB transaction to write the sectors.
        return new Promise((resolve, reject) => {
            const txn = this.db.transaction(this.moduleName, "readwrite");
            const store = txn.objectStore(this.moduleName);
            let timing = 0;

            txn.onerror = (ev) => {
                this.processor.setIndicator(36, `Disk write ${this.moduleName} error: addr=${this.sectorKey}, ${ev.target.error.name}`);
            };

            txn.onabort = (ev) => {
                this.processor.setIndicator(36, `Disk write ${this.moduleName} abort: addr=${this.sectorKey}, ${ev.target.error.name}`);
            };

            txn.oncomplete = (ev) => {
                const delay = startTime + timing - performance.now();
                setTimeout(resolve, delay);     // delay for disk rotation time before resolve
            };

            this.findSector(store, sectorAddr, startTime, moduloCompare, (findResult) => {
                let lastKey = findResult.key;
                timing = findResult.timing;
                // Update the first sector if the read-only flag is not set
                if (findResult.data[0] & Register.flagMask) {
                    this.processor.setIndicator(36, `Disk write read-only flag on sector address at key ${lastKey}`);
                    loadSector(false, true, null);
                } else {
                    let finito = loadSector(false, findResult.error, findResult.data);
                    store.put(findResult.data, lastKey);
                    if (!finito) {
                        // More sectors needed, so open a cursor for the rest of the cylinder.
                        const cylinderEndKey = (this.seekCylinderNr+1)*DiskStorage.cylinderTracks*DiskStorage.trackSectors - 1;
                        if (lastKey >= cylinderEndKey) {
                            this.processor.setIndicator(38, `Disk read cylinder overflow at key ${lastKey}`);
                            return;
                        }

                        const range = IDBKeyRange.bound(lastKey+1, cylinderEndKey);
                        store.openCursor(range).onsuccess = (ev) => {
                            const cursor = ev.target.result;
                            if (!cursor) {
                                this.processor.setIndicator(38, `Disk write cylinder overflow after key ${lastKey}`);
                                loadSector(false, true, null);          // end of cylinder
                            } else {
                                const data = cursor.value;
                                const diskAddr = DiskStorage.getSectorAddress(data);
                                this.setSectorAddrBox(diskAddr);
                                timing += DiskModule.sectorPeriod;
                                if (++lastKey != cursor.key) {
                                    this.processor.setIndicator(36, `Disk write cursor key not sequential=${cursor.key} in ${this.moduleName}`);
                                    loadSector(false, true, data);
                                } else if (!DiskStorage.compareSectorAddress(this.drive.sectorAddr, diskAddr, moduloCompare)) {
                                    this.processor.setIndicator(36, `Disk write sector address mismatch ${DiskStorage.convertSectorAddress(diskAddr)}`);
                                    loadSector(false, true, data);
                                } else if (findResult.data[0] & Register.flagMask) {
                                    this.processor.setIndicator(36, `Disk write read-only flag on sector address at key ${lastKey}`);
                                    loadSector(false, true, null);
                                } else {
                                    finito = loadSector(false, false, data);
                                    cursor.update(data);
                                    if (!finito) {
                                        cursor.continue();              // advance to next sector
                                    }
                                }
                            }
                        };
                    }
                }
            });
        });
    }

    /**************************************/
    writeTrack(sectorAddr, moduloCompare, loadSector) {
        /* Attempts to wrote a full track on the currently-seeked cylinder:
            sectorAddr:     starting BCD sector address
            moduloCompare:  true indicates that addresses should be compared
                            without regard to any module number in their
                            high-order digits.
            loadSector:     function to call passing each sector's data with params:
                                Boolean finished: end of cursor
                                Boolean error: fatal error occurred
                                Uint8Array data: 105 digits of sector data (or null)
                            Returns true if no more sectors to write
        The cylinder number in "sectorAddr" is ignored and the currently-seeked
        cylinder is used instead. The track number is taken from "sectorAddr".
        Returns a Promise that resolves on completion */
        const startTime = performance.now();

        this.parseSectorAddress(sectorAddr);
        this.setSectorAddrBox(sectorAddr);

        // Construct and return a Promise for an IDB transaction to write the track.
        return new Promise((resolve, reject) => {
            const txn = this.db.transaction(this.moduleName, "readwrite");
            const store = txn.objectStore(this.moduleName);
            let timing = 0;

            txn.onerror = (ev) => {
                this.processor.setIndicator(36, `Disk writeTrack ${this.moduleName} error: addr=${this.sectorKey}, ${ev.target.error.name}`);
            };

            txn.onabort = (ev) => {
                this.processor.setIndicator(36, `Disk writeTrack ${this.moduleName} abort: addr=${this.sectorKey}, ${ev.target.error.name}`);
            };

            txn.oncomplete = (ev) => {
                const delay = startTime + timing - performance.now();
                setTimeout(resolve, delay);     // delay for disk rotation time before resolve
            };

            this.findSector(store, sectorAddr, startTime, moduloCompare, (findResult) => {
                if (findResult.error) {
                    loadSector(false, true, null);      // sector address not found
                } else {
                    const trackStartKey = (this.seekCylinderNr*DiskStorage.cylinderTracks + this.trackNr)*DiskStorage.trackSectors;
                    const range = IDBKeyRange.bound(trackStartKey, trackStartKey+DiskStorage.trackSectors-1);
                    let lastKey = findResult.key;

                    // Advance timing to start of next index point.
                    timing = findResult.timing + (DiskStorage.trackSectors-1 - lastKey%DiskStorage.trackSectors)*DiskModule.sectorPeriod;

                    store.openCursor(range).onsuccess = (ev) => {
                        const cursor = ev.target.result;
                        if (!cursor) {
                            loadSector(true, false, null);              // end of track
                        } else {
                            const data = cursor.value;
                            const diskAddr = DiskStorage.getSectorAddress(data);
                            this.setSectorAddrBox(diskAddr);
                            timing += DiskModule.sectorPeriod;
                            if (lastKey != cursor.key) {
                                this.processor.setIndicator(36, `Disk writeTrack cursor key not sequential=${cursor.key} in ${this.moduleName}`);
                                loadSector(false, true, data);
                            } else if (!this.drive.compareDisable &&
                                       !DiskStorage.compareSectorAddress(this.drive.sectorAddr, diskAddr, moduloCompare)) {
                                this.processor.setIndicator(36, `Disk writeTrack sector address mismatch ${DiskStorage.convertSectorAddress(diskAddr)}`);
                                loadSector(false, true, data);
                            } else {
                                ++lastKey;
                                const finito = loadSector(false, false, data);
                                cursor.update(data);
                                if (!finito) {
                                    cursor.continue();                  // advance to next sector
                                }
                            }
                        }
                    };
                }
            });
        });
    }

    /**************************************/
    initiateWrite() {
        /* Called by Processor to initiate a write I/O. Not used with CardPunch */
    }

    /**************************************/
    release () {
        /* Called by Processor to indicate the device has been released */

    }

    /**************************************/
    shutDown() {
        /* Shuts down the device */

        this.enableSwitch.removeEventListener("click", this.boundEnableClick);
        this.startBtn.removeEventListener("click", this.boundStartClick);
    }

} // end class DiskModule
