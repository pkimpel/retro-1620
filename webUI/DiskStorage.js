/***********************************************************************
* retro-1620/webUI DiskStorage.js
************************************************************************
* Copyright (c) 2024, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* Disk drive storage manager for the 1620 1311 Model 2 or 3 disk drive.
*
* Creates and manages the IndexedDB data base for the 1311 subsystem.
* The DiskStorage object is owned by the DiskDrive module.
*
************************************************************************
* 2024-07-13  P.Kimpel
*   Original version, from DiskModule.js.
***********************************************************************/

export {DiskStorage};

import {Envir} from "../emulator/Envir.js";
import {Register} from "../emulator/Register.js";

class DiskStorage {

    // Static Properties

    static addressSize = 5;             // size of sector address, digits
    static addrNoDriveMask = 0o0117171717; // mask to exclude module number from a sector address
    static dataSize = 100;              // size of sector data, digits
    static trackSectors = 20;           // sectors per track
    static cylinderTracks = 10;         // tracks per cylinder
    static maxCylinders = 100;          // cylinders per module
    static maxSectors = DiskStorage.maxCylinders * DiskStorage.cylinderTracks * DiskStorage.trackSectors;
    static sectorSize = DiskStorage.addressSize + DiskStorage.dataSize;

    static moduleMax = 4;               // max disk modules allowed
    static storageName = "retro-1620-Disk-Storage-DB";
    static storageVersion = 1;          // IndexedDB schema version

    static numericGlyphs = [    // indexed as BCD code prefixed with flag bit: F8421
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "|", "=", "@", "?", "?", "}",         // 00-0F
        "]", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "!", "$", "-", "?", "?", "\"",        // 10-1F
        "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "|", "=", "@", "?", "?", "}",         // 20-2F (parity bit)
        "]", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "!", "$", "-", "?", "?", "\""];       // 30-3F

    static xlateGlyphs = new Array(128);// translate ASCII glyph codes to numeric digits
    static {
        DiskStorage.xlateGlyphs.fill(0);
        for (let x=0; x<DiskStorage.numericGlyphs.length; ++x) {
            const code = DiskStorage.numericGlyphs[x].charCodeAt(0) & 0x7F;
            DiskStorage.xlateGlyphs[code] = Envir.oddParity5[x];
        }
    }

    static convertSectorAddress(addr) {
        /* Converts a BCD sector address to a string */
        let a = addr;
        let s = "";

        for (let x=0; x<DiskStorage.addressSize; ++x) {
            s = DiskStorage.numericGlyphs[a & Register.notParityMask] + s;
            a >>= Register.digitBits;
        }

        return s;
    }

    static getSectorAddress(buffer) {
        /* Extracts a five-digit sector address from the start of "buffer" and
        returns it as a BCD word of digits, including any flags */
        let addr = 0;

        for (let x=0; x<DiskStorage.addressSize; ++x) {
            addr = (addr << Register.digitBits) | (buffer[x] & Register.notParityMask);
        }

        return addr;
    }

    static putSectorAddress(addr, buffer, readOnly=false) {
        /* Formats a five-digit sector address from the binary "addr" to the
        first five elements of the "buffer" array. If "readOnly" is true, sets a
        flag bit on the high-order digit in the formatted address */
        let a = addr;

        for (let x=DiskStorage.addressSize-1; x>=0; --x) {
            let d = a % 10;
            a = (a-d)/10;
            if (x==0 && readOnly) {
                d |= Register.flagMask;
            }

            buffer[x] = d;
        }
    }

    static compareSectorAddress(sectorAddr, bufferAddr, moduloCompare) {
        /* Compares the BCD "sectorAddr" address to the BCD "bufferAddr",
        ignoring any flags, returning true if they match. If "moduloCompare"
        is true, any disk module number in the high-order digit of the sector
        address is ignored */

        let ba = bufferAddr & Register.bcdValueMask;
        let sa = sectorAddr & Register.bcdValueMask;
        if (moduloCompare) {
            ba &= DiskStorage.addrNoDriveMask;
            sa &= DiskStorage.addrNoDriveMask;
        }

        return (ba == sa);
    }


    // Public Instance Properties

    alertWin = null;                    // Window object for alert() messages
    db = null;                          // IndexedDB data base reference
    moduleName = new Array(DiskStorage.moduleMax); // module object store names


    constructor() {
        /* Initializes the the disk storage object */

        for (let x=0; x<DiskStorage.moduleMax; ++x) {
            this.moduleName[x] = `Module${x}`;
        }
    }

    set alertWindow(win) {
        this.alertWin = win;
    }


    /**************************************/
    genericIDBError(ev) {
        // Formats a generic alert message when an otherwise-unhandled data base error occurs */
        const msg = "Disk storage UNHANDLED ERROR: " + ev.target.error.message;

        console.log(msg);
        this.alertWin?.alert(msg);
    }

    /**************************************/
    openDatabase() {
        /* Attempts to open the disk storage database specified by
        DiskStorage.storageName. If successful, sets this.db to the IDB object and
        fulfills the async Promise with value true */

        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DiskStorage.storageName, DiskStorage.storageVersion);

            req.onerror = (ev) => {
                this.alertWin?.alert("Cannot open disk storage\ndata base \"" +
                      DiskStorage.storageName + "\":\n" + ev.target.error);
            };

            req.onblocked = (ev) => {
                this.alertWin?.alert(DiskStorage.storageName + " disk storage open is blocked -- CANNOT CONTINUE");
            };

            req.onupgradeneeded = (ev) => {
                /* Handles the onupgradeneeded event for the IDB data base. Upgrades
                the schema to the current version. For a new data base, creates the default
                configuration. "ev" is the upgradeneeded event */
                const req = ev.target;
                const db = req.result;
                const txn = req.transaction;

                txn.onabort = (ev) => {
                    this.alertWin?.alert("Aborted DB upgrade to disk storage\ndata base \"" +
                          DiskStorage.storageName + "\":\n" + ev.target.error);
                };

                txn.onerror = (ev) => {
                    this.alertWin?.alert("Error in DB upgrade to DataFile storage\ndata base \"" +
                          DiskStorage.storageName + "\":\n" + ev.target.error);
                };

                if (ev.oldVersion < 1) {
                    // New data base: create stores for each possible disk module
                    for (let x=0; x<DiskStorage.moduleMax; ++x) {
                        db.createObjectStore(this.moduleName[x]);
                    }

                    console.log(`Disk data base initialized to version=${ev.newVersion}`);
                }

                if (ev.newVersion < DiskStorage.storageVersion) {
                    this.alertWin?.alert("Disk storage downgrade unsupported: IDB version: old=" +
                          ev.oldVersion + ", new=" + ev.newVersion);
                    txn.abort();
                } else if (ev.newVersion > DiskStorage.storageVersion) {
                    // This will need to be replaced by any necessary schema
                    // changes if the storage version is increased in the future.
                    this.alertWin?.alert("Disk storage upgrade unsupported: IDB version: old=" +
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
                console.debug(`Disk data base opened successfully, version=${DiskStorage.storageVersion}`);
            };
        });
    }

    /**************************************/
    countSectors(moduleNr) {
        /* Counts the number of sectors currently on the storage module. Returns
        a Promise that resolves with the count once determined */
        const moduleName = this.moduleName[moduleNr];

        return new Promise((resolve, reject) => {
            const txn = this.db.transaction(moduleName, "readonly");
            const store = txn.objectStore(moduleName);

            const req = store.count();
            req.onsuccess = () => {
                resolve(req.result);
            };
        });
    }

    /**************************************/
    initializeModule(moduleNr) {
        /* Initializes the disk pack for a module to all zero digits with
        standard sector addresses. Returns a Promise that resolves to true if
        there is an error */
        const moduleName = this.moduleName[moduleNr];

        console.debug(`Disk initializing sectors for ${moduleName}`);

        return new Promise((resolve, reject) => {
            let addr = 0;
            const buffer = new Uint8Array(DiskStorage.sectorSize);

            const fillTrack = () => {
                /* Initializes one track of sectors. On completion, either resolves
                the Promise (if all tracks have been done) or calls self for the
                next track. This is done one track at a time to avoid flooding
                IDB with requests */
                const txn = this.db.transaction(moduleName, "readwrite");
                const store = txn.objectStore(moduleName);

                txn.onerror = (ev) => {
                    const msg = `Disk ${moduleName} init txn onerror: addr=${addr}, ${ev.target.error.name}`;
                    resolve(true);
                    console.log(msg);
                    this.alertWin?.alert(msg);
                };

                txn.onabort = (ev) => {
                    const msg = `Disk ${moduleName} init txn onabort: addr=${addr}, ${ev.target.error.name}`;
                    resolve(true);
                    console.log(msg);
                    this.alertWin?.alert(msg);
                };

                txn.oncomplete = (ev) => {
                    if (addr < DiskStorage.maxSectors) {
                        fillTrack();
                    } else {
                        console.log(`Disk ${moduleName} sector initialization completed`);
                        resolve(false);
                    }
                };

                for (let x=0; x<DiskStorage.trackSectors; ++x) {
                    DiskStorage.putSectorAddress(addr, buffer, false);
                    store.put(buffer, addr);            // ignore the returned request
                    ++addr;
                }
            };

            const wipeDisk = () => {
                /* Completely erases the IDB object store for the disk module,
                then calls fillTrack() to begin writing sectors */
                const txn = this.db.transaction(moduleName, "readwrite");

                txn.onerror = (ev) => {
                    const msg = `Disk ${moduleName} clear txn onerror: addr=${addr}, ${ev.target.error.name}`;
                    resolve(true)
                    console.log(msg);
                    this.alertWin?.alert(msg);
                };

                txn.onabort = (ev) => {
                    const msg = `Disk ${moduleName} clear txn onabort: addr=${addr}, ${ev.target.error.name}`;
                    resolve(true);
                    console.log(msg);
                    this.alertWin?.alert(msg);
                };

                txn.oncomplete = (ev) => {
                    fillTrack();
                };

                txn.objectStore(moduleName).clear();
            };

            buffer.fill(Register.parityMask);   // initialize to 0 with parity
            wipeDisk();
        });
    }

    /**************************************/
    loadModule(moduleNr, image) {
        /* Replaces the contents of a module's object store with new contents
        from the "image" text blob. Returns a Promise that resolves to true if
        there is an error, false otherwise */
        const eolRex = /([^\n\r\f]*)((:?\r[\n\f]?)|\n|\f)?/g;
        const validCharsRex = /^[0-9|=@?}\]JKLMNOPQR!$-?"]+$/;
        const moduleName = this.moduleName[moduleNr];
        const imageLen = image.length;
        let bufIndex = 0;
        let result = false;

        const extractSectorImage = () => {
            /* Extracts one sector image from the buffer. Returns a triplet
            consisting of an error code, the 5-digit sector key, and the
            105-digit sector data */
            let errorCode = 0;
            let key = 0;
            let data = "";
            let match = null;                   // result of eolRex.exec()

            if (bufIndex >= imageLen) {
                errorCode = -1;                 // end of image buffer
                key = DiskStorage.maxSectors;
            } else {
                eolRex.lastIndex = bufIndex;
                match = eolRex.exec(image);
                if (!match) {
                    errorCode = 1;              // no match for sector line
                    key = DiskStorage.maxSectors;
                } else {
                    bufIndex += match[0].length;
                    const text = match[1].toUpperCase();
                    const parts = text.split(",");
                    if (parts.length != 2) {
                        errorCode = 2;          // invalid row format
                    } else {
                        key = parseInt(parts[0], 10);
                        if (isNaN(key)) {
                            errorCode = 3;      // invalid key field
                            key = 0;
                        } else {
                            data = parts[1];
                            if (data.length < DiskStorage.sectorSize) {
                                data = data.padEnd(DiskStorage.sectorSize, "0");
                            } else if (data.length > DiskStorage.sectorSize) {
                                data = data.subString(0, DiskStorage.sectorSize);
                            }
                        }
                    }
                }
            }

            return [errorCode, key, data];
        };

        const validateImage = () => {
            /* Validates the image is properly formatted, the digit codes are
            valid, they keys are numeric, and the keys are in ascending order.
            Returns true if errors */
            let lastKey = -1;
            let result = false;

            bufIndex = 0;
            while (bufIndex < image.length) {
                let [errorCode, key, data] = extractSectorImage();
                if (errorCode > 0) {
                    result = true;
                    break;
                } else if (key < 0 || key >= DiskStorage.maxSectors || key <= lastKey) {
                    result = true;
                    break;
                } else if (!validCharsRex.test(data)) {
                    result = true;
                } else {
                    lastKey = key;
                }
            }

            return result;
        };

        console.log(`DiskStorage ${moduleName} image load initiated`);

        return new Promise((resolve, reject) => {
            if (validateImage()) {
                console.log("DiskStorage load image invalid");
                resolve(true);
            } else {
                const cylinderSize = DiskStorage.cylinderTracks*DiskStorage.trackSectors;
                const buffer = new Uint8Array(DiskStorage.sectorSize);

                bufIndex = 0;
                let row = extractSectorImage();
                let [error, key, data] = row;

                const loadCylinder = () => {
                    /* Initializes one cylinder of sectors. On completion, either
                    calls self for the next cylinder or terminates if at end. This
                    is done one cylinder at a time to avoid flooding IDB with requests */
                    const txn = this.db.transaction(moduleName, "readwrite");
                    const store = txn.objectStore(moduleName);

                    txn.onerror = (ev) => {
                        const msg = `DiskStorage ${moduleName} load txn onerror: ${ev.target.error.name}`;
                        console.log(msg);
                        resolve(true);
                    };

                    txn.onabort = (ev) => {
                        const msg = `DiskStorage ${moduleName} load txn onabort: ${ev.target.error.name}`;
                        console.log(msg);
                        resolve(true);
                    };

                    txn.oncomplete = (ev) => {
                        if (error == 0) {
                            loadCylinder();
                        } else if (error > 0) {
                            resolve(true);
                            const msg = `DiskStorage load error ${error}, offset=${bufIndex} - aborted load`;
                            console.log(msg);
                            this.alertWin.alert(msg);
                        } else {
                            resolve(false);
                            console.log(`DiskStorage ${moduleName} load completed`);
                        }
                    };

                    [error, key, data] = row;
                    const cylinderNr = Math.floor(key/cylinderSize);
                    const cylStartKey = cylinderNr*cylinderSize;
                    const cylEndKey = cylStartKey + cylinderSize - 1;

                    while (error == 0 && key <= cylEndKey) {
                        for (let x=0; x<data.length; ++x) {
                            buffer[x] = DiskStorage.xlateGlyphs[data[x].charCodeAt(0) & 0x7F];
                        }

                        store.put(buffer, key);
                        [error, key, data] = row = extractSectorImage();
                    }
                };

                loadCylinder();
            }
        });
    }

    /**************************************/
    serializeModuleData(moduleNr, caption, onerror, onabort, successor) {
        /* Reads and serializes all sectors from the specified disk module,
        calling the "successor" function and passing the serialized text at the
        end. The format of the image is consistent with that required by the
        loadModule() method. All characters are ASCII according to the convention
        used by the card punch for the 1620-Jr project */
        const moduleName = this.moduleName[moduleNr];
        const txn = this.db.transaction(moduleName, "readonly");
        const store = txn.objectStore(moduleName);
        let text = "";

        txn.onerror = () => {
            onerror();
            successor("");
        };

        txn.onabort = () => {
            onabort();
            successor("");
        };

        txn.oncomplete = (ev) => {
            successor(text);
        };

        store.openCursor().onsuccess = (ev) => {
            const cursor = ev.target.result;
            if (cursor) {
                const data = cursor.value;
                const key = cursor.key;
                let line = "";
                for (let byte of data) {
                    line += DiskStorage.numericGlyphs[byte & 0x1F] ?? "0";
                }

                text += `${key.toString().padStart(DiskStorage.addressSize, " ")},${line}\n`;
                cursor.continue();  // advance to next sector
            }
        };
    }

} // end class DiskStorage
