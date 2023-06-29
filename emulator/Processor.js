/***********************************************************************
* retro-1620/emulator Processor.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* JavaScript class module for the 1620 Model 2 processor.
*
* Primary references:
*   "IBM 1620 Central Processing Unit Model 2," Form A26-5781-2, ca 1966.
*   "IBM Data Processing System Model 2 Customer Engineering Intermediate
*       Level Diagrams," Form 227-5857-0 (includes Supplement S27-0500),
*       1964-04-29. Also known as the "ILD".
*   "Programming the IBM 1620," Second Edition, Clarence B. Germain,
*       Prentice-Hall, 1965.
************************************************************************
* 2022-07-19  P.Kimpel
*   Original version, from retro-g15 Processor.js.
***********************************************************************/

export {Processor}

import {Envir} from "./Envir.js";
import {FlipFlop} from "./FlipFlop.js";
import {Register} from "./Register.js";
import {Timer} from "./Timer.js";

// Processor states
const procStateLimbo = 0;
const procStateI1 = 1;
const procStateI2 = 2;
const procStateI3 = 3;
const procStateI4 = 4;
const procStateI5 = 5;
const procStateI6 = 6;
const procStateIX = 7;
const procStateIA1 = 8;
const procStateIA2 = 9;
const procStateIA3 = 10;
const procStateE1 = 11;
const procStateE2 = 12;
const procStateE3 = 13;
const procStateE4 = 14;
const procStateE5 = 15;


class Processor {

    constructor(context) {
        /* Constructor for the 1620 processor object. The "context" object
        supplies references for objects from the 1620 emulator global environment */

        this.context = context;
        this.devices = null;            // initialized in this.powerUp()
        this.envir = new Envir();
        this.envir.memorySize = context.config.getNode("memorySize");
        this.envir.setIndicator = this.setIndicator.bind(this);

        // Control Gates
        this.gate$$$_OFLO =         new FlipFlop(this.envir, true);
        this.gate1ST_CYC =          new FlipFlop(this.envir, true);
        this.gate1ST_CYC_DELAYD =   new FlipFlop(this.envir, true);
        this.gate1ST_MPLY_CYCLE =   new FlipFlop(this.envir, true);
        this.gate2_DIG_CNTRL =      new FlipFlop(this.envir, true);
        this.gateADD_ENT =          new FlipFlop(this.envir, true);
        this.gateADD_MODE =         new FlipFlop(this.envir, true);
        this.gateBR_EXEC =          new FlipFlop(this.envir, true);
        this.gateBR_OUT =           new FlipFlop(this.envir, true);
        this.gateCARRY_IN =         new FlipFlop(this.envir, true);
        this.gateCARRY_OUT =        new FlipFlop(this.envir, true);
        this.gateCLR_MEM =          new FlipFlop(this.envir, true);
        this.gateCOMP =             new FlipFlop(this.envir, true);
        this.gateDIV_1_CYC =        new FlipFlop(this.envir, true);
        this.gateDVD_L_CYC =        new FlipFlop(this.envir, true);
        this.gateDVD_SIGN =         new FlipFlop(this.envir, true);
        this.gateEOR$ =             new FlipFlop(this.envir, true);
        this.gateEXMIT_ENT =        new FlipFlop(this.envir, true);
        this.gateEXMIT_MODE =       new FlipFlop(this.envir, true);
        this.gateEXP_OFLO =         new FlipFlop(this.envir, true);
        this.gateEXP_UFLO =         new FlipFlop(this.envir, true);
        this.gateEZ =               new FlipFlop(this.envir, true);
        this.gateE_CYC_ENT =        new FlipFlop(this.envir, true);
        this.gateFIELD_MK_1 =       new FlipFlop(this.envir, true);
        this.gateFIELD_MK_2 =       new FlipFlop(this.envir, true);
        this.gateFL_1 =             new FlipFlop(this.envir, true);
        this.gateFL_2 =             new FlipFlop(this.envir, true);
        this.gateHP =               new FlipFlop(this.envir, true);
        this.gateIA_ENT =           new FlipFlop(this.envir, true);
        this.gateIA_REQ =           new FlipFlop(this.envir, true);
        this.gateIA_SEL =           new FlipFlop(this.envir, true);
        this.gateINT_ENT =          new FlipFlop(this.envir, true);
        this.gateINT_MODE =         new FlipFlop(this.envir, true);
        this.gateIX_BAND_1 =        new FlipFlop(this.envir, true);
        this.gateIX_BAND_2 =        new FlipFlop(this.envir, true);
        this.gateIX_ENT =           new FlipFlop(this.envir, true);
        this.gateIX_EXEC =          new FlipFlop(this.envir, true);
        this.gateI_CYC_ENT =        new FlipFlop(this.envir, true);
        this.gateLAST_CARD =        new FlipFlop(this.envir, true);
        this.gateLAST_LD_CYC =      new FlipFlop(this.envir, true);
        this.gateMASK =             new FlipFlop(this.envir, true);
        this.gateMC_1 =             new FlipFlop(this.envir, true);
        this.gateMC_2 =             new FlipFlop(this.envir, true);
        this.gateP =                new FlipFlop(this.envir, true);
        this.gateP_COMP =           new FlipFlop(this.envir, true);
        this.gateRECOMP =           new FlipFlop(this.envir, true);
        this.gateRM =               new FlipFlop(this.envir, true);
        this.gateRUN =              new FlipFlop(this.envir, true);
        this.gateSTOP =             new FlipFlop(this.envir, true);

        // Input-Output Gates
        this.gateCHAR_GATE =        new FlipFlop(this.envir, true);
        this.gateDISK_ADDR =        new FlipFlop(this.envir, true);
        this.gateDISK_HUND =        new FlipFlop(this.envir, true);
        this.gateDISK_LD_ZERO =     new FlipFlop(this.envir, true);
        this.gateDISK_OP =          new FlipFlop(this.envir, true);
        this.gateDISK_UNIT =        new FlipFlop(this.envir, true);
        this.gateIO_FLAG =          new FlipFlop(this.envir, true);
        this.gateMEM_ADDR =         new FlipFlop(this.envir, true);
        this.gatePCH_FEED =         new FlipFlop(this.envir, true);
        this.gatePC_6XXX =          new FlipFlop(this.envir, true);
        this.gatePC_EZ =            new FlipFlop(this.envir, true);
        this.gatePC_HP =            new FlipFlop(this.envir, true);
        this.gatePC_IND =           new FlipFlop(this.envir, true);
        this.gatePC_OFLOW =         new FlipFlop(this.envir, true);
        this.gatePC_TR_8 =          new FlipFlop(this.envir, true);
        this.gateRD =               new FlipFlop(this.envir, true);
        this.gateRDR_FEED =         new FlipFlop(this.envir, true);
        this.gateREL =              new FlipFlop(this.envir, true);
        this.gateRESP_GATE =        new FlipFlop(this.envir, true);
        this.gateSCTR_COUNT =       new FlipFlop(this.envir, true);
        this.gateSCTR_CYC =         new FlipFlop(this.envir, true);
        this.gateSIMO_30 =          new FlipFlop(this.envir, true);
        this.gateSIMO_HOLD =        new FlipFlop(this.envir, true);
        this.gateWR =               new FlipFlop(this.envir, true);

        // Instruction & Execution Cycle Gates
        this.gateE_1 =              new FlipFlop(this.envir, true);
        this.gateE_2 =              new FlipFlop(this.envir, true);
        this.gateE_3 =              new FlipFlop(this.envir, true);
        this.gateE_4 =              new FlipFlop(this.envir, true);
        this.gateE_5 =              new FlipFlop(this.envir, true);
        this.gateIA_1 =             new FlipFlop(this.envir, true);
        this.gateIA_2 =             new FlipFlop(this.envir, true);
        this.gateIA_3 =             new FlipFlop(this.envir, true);
        this.gateIX =               new FlipFlop(this.envir, true);     // INDEXING in the CE docs
        this.gateI_1 =              new FlipFlop(this.envir, true);
        this.gateI_2 =              new FlipFlop(this.envir, true);
        this.gateI_3 =              new FlipFlop(this.envir, true);
        this.gateI_4 =              new FlipFlop(this.envir, true);
        this.gateI_5 =              new FlipFlop(this.envir, true);
        this.gateI_6 =              new FlipFlop(this.envir, true);

        this.procStateGates = [null,
            this.gateI_1, this.gateI_2, this.gateI_3, this.gateI_4, this.gateI_5, this.gateI_6,
            this.gateIX, this.gateIA_1, this.gateIA_2, this.gateIA_3,
            this.gateE_1, this.gateE_2, this.gateE_3, this.gateE_4, this.gateE_5];

        // Operator Control Panel Indicators
        this.gatePOWER_ON =         new FlipFlop(this.envir, true);
        this.gatePOWER_READY =      new FlipFlop(this.envir, true);
        this.gateTHERMAL =          new FlipFlop(this.envir, true);
        this.gateWRITE_INTERLOCK =  new FlipFlop(this.envir, true);
        this.gateREAD_INTERLOCK =   new FlipFlop(this.envir, true);
        this.gateSAVE =             new FlipFlop(this.envir, true);
        this.gateTWPR_SELECT =      new FlipFlop(this.envir, true);
        this.gateRFE1 =             new FlipFlop(this.envir, true);
        this.gateRFE2 =             new FlipFlop(this.envir, true);
        this.gateRFE3 =             new FlipFlop(this.envir, true);
        this.gateAUTOMATIC =        new FlipFlop(this.envir, true);
        this.gateMANUAL =           new FlipFlop(this.envir, true);
        this.gateCHECK_STOP =       new FlipFlop(this.envir, true);

        // Check Indicators
        this.diskAddrCheck =        new FlipFlop(this.envir, true);
        this.diskCylOflowCheck =    new FlipFlop(this.envir, true);
        this.diskWLRRBCCheck =      new FlipFlop(this.envir, true);
        this.dummy1Check =          new FlipFlop(this.envir, true);
        this.dummy2Check =          new FlipFlop(this.envir, true);
        this.dummy3Check =          new FlipFlop(this.envir, true);
        this.ioPrinterCheck =       new FlipFlop(this.envir, true);
        this.ioReadCheck =          new FlipFlop(this.envir, true);
        this.ioWriteCheck =         new FlipFlop(this.envir, true);
        this.oflowArithCheck =      new FlipFlop(this.envir, true);
        this.oflowDummyCheck =      new FlipFlop(this.envir, true);
        this.oflowExpCheck =        new FlipFlop(this.envir, true);
        this.parityMARCheck =       new FlipFlop(this.envir, true);
        this.parityMBREvenCheck =   new FlipFlop(this.envir, true);
        this.parityMBROddCheck =    new FlipFlop(this.envir, true);

        this.ioPrinterChannel9 =    new FlipFlop(this.envir, false);
        this.ioPrinterChannel12 =   new FlipFlop(this.envir, false);
        this.ioPrinterBusy =        new FlipFlop(this.envir, false);

        // Console Registers
        this.regDR =                new Register("DR",  2, this.envir, true,  true,  false);
        this.regMAR =               new Register("MAR", 5, this.envir, true,  true,  false);
        this.regMBR =               new Register("MBR", 2, this.envir, true,  false, true);
        this.regMIR =               new Register("MIR", 2, this.envir, true,  true,  true);
        this.regMQ =                new Register("MQ",  1, this.envir, true,  true,  false);
        this.regOP =                new Register("OP",  2, this.envir, true,  true,  false);
        this.regXR =                new Register("XR",  1, this.envir, true,  false, false);   // indexing bits X-1, X-2, X-3

        // MARS Registers
        this.regCR1 =               new Register("CR1", 5, this.envir, false, true,  false);
        this.regIR1 =               new Register("IR1", 5, this.envir, false, true,  false);
        this.regIR2 =               new Register("IR2", 5, this.envir, false, true,  false);
        this.regIR3 =               new Register("IR3", 5, this.envir, false, true,  false);
        this.regIR4 =               new Register("IR4", 5, this.envir, false, true,  false);
        this.regOR1 =               new Register("OR1", 5, this.envir, false, true,  false);
        this.regOR2 =               new Register("OR2", 5, this.envir, false, true,  false);
        this.regOR3 =               new Register("OR3", 5, this.envir, false, true,  false);
        this.regOR4 =               new Register("OR4", 5, this.envir, false, true,  false);
        this.regOR5 =               new Register("OR5", 5, this.envir, false, true,  false);
        this.regPR1 =               new Register("PR1", 5, this.envir, false, true,  false);
        this.regPR2 =               new Register("PR2", 5, this.envir, false, true,  false);

        this.marsRegisters = [
            this.regOR1, this.regOR2, this.regOR3, this.regOR4, this.regOR5, this.regCR1,
            this.regPR1, this.regPR2, this.regIR1, this.regIR2, this.regIR3, this.regIR4];

        // Internal Control Gates & Registers
        this.gateCLR_CTRL =         new FlipFlop(this.envir, false);    // clear memory control latch
        this.gateCONSOLE_CTRL_SS =  new FlipFlop(this.envir, false);    // console control single-shot(?)
        this.gateDISPLAY_MAR =      new FlipFlop(this.envir, false);    // display MAR latch
        this.gateEND_OF_MODULE =    new FlipFlop(this.envir, false);    // termination latch (clear memory, etc.)
        this.gateINSERT =           new FlipFlop(this.envir, false);    // insert latch
        this.gateSAVE_CTRL =        new FlipFlop(this.envir, false);    // SAVE control latch
        this.gateSCE =              new FlipFlop(this.envir, false);    // single-cycle execute

        this.regXBR =               new Register("XBR", 5, this.envir, false, true,  true);

        // Console Switches
        this.marSelectorKnob = 0;
        this.diskStopSwitch = 0;
        this.dummy1Switch = 0;
        this.ioStopSwitch = 0;
        this.oflowStopSwitch = 0;
        this.parityStopSwitch = 0;
        this.program1Switch = 0;
        this.program2Switch = 0;
        this.program3Switch = 0;
        this.program4Switch = 0;

        // Core Memory - 2 digits are stored in the low-order 12 bits of each element
        this.MM = new Uint16Array(this.envir.memorySize >> 1);

        // Op Code Attributes
        this.opBinary = 0;                              // binary value of current op code
        this.opIndexable = 0;                           // op code is valid for indexing addresses
        this.opAtts = new Array(100);                   // op code attributes table
        this.opThisAtts = null;                         // op code attributes for current op

        this.xrInstalled = (context.config.getNode("indexRegisters") ? 1 : 0);
        this.fpInstalled = (context.config.getNode("floatingPoint") ? 1 : 0);
        this.bcInstalled = (context.config.getNode("binaryCapabilities") ? 1 : 0);

        // General emulator state
        this.avgThrottleDelay = 0;                      // running average throttling delay, ms
        this.avgThrottleDelta = 0;                      // running average throttling delay deviation, ms
        this.instructionCount = 0                       // number of instructions executed
        this.limboEntryFcn = null;                      // function to call on entering LimboState
        this.limboEntryContext = null;                  // object context to apply to limboEntryFcn
        this.procState = procStateLimbo;                // processor instruction load/execute state
        this.running = false;                           // true when this.run() is active
        this.runTime = 0;                               // actual system run time, ms

        // I/O Subsystem
        this.ioTimer = new Timer();                     // general timer for I/O operations
        this.ioPromise = Promise.resolve();             // general Promise for I/O operations
        this.ioDevice = null;                           // I/O device object
        this.ioSelectNr = 0;                            // I/O channel from Q8/Q9
        this.ioVariant = 0;                             // I/O function variant from Q10/Q11
        this.ioDiskDriveCode = 0;                       // Module number for disk I/O
        this.ioReadCheckPending = false;                // Read Check condition has occurred but not yet been set
        this.ioWriteCheckPending = false;               // Write Check condition has occurred but not het been set

        // Initialization
        const buildOpAtts = (opCode,
                opValid, eState, rfe1, pIA, qIA, pIX, qIX, immed, branch, fp, index, binary, edit, qa4) => {
            this.opAtts[opCode] = {
                opValid, eState, rfe1, pIA, qIA, pIX, qIX, immed, branch, fp, index, binary, edit, qa4};
        };

        //          op  v es ?1 pi qi px qx im br fp ix bi ed q4
        buildOpAtts( 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 00
        buildOpAtts( 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0);      // 01 FADD
        buildOpAtts( 2, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0);      // 02 FSUB
        buildOpAtts( 3, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0);      // 03 FMUL
        buildOpAtts( 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 04
        buildOpAtts( 5, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0);      // 05 FSL
        buildOpAtts( 6, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 06 TFL
        buildOpAtts( 7, 1, 2, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0);      // 07 BTFL
        buildOpAtts( 8, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0);      // 08 FSR
        buildOpAtts( 9, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0);      // 09 FDIV

        buildOpAtts(10, 1, 2, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0);      // 10 BTAM
        buildOpAtts(11, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 11 AM
        buildOpAtts(12, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 12 SM
        buildOpAtts(13, 1, 5, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 13 MM
        buildOpAtts(14, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 14 CM
        buildOpAtts(15, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 15 TDM
        buildOpAtts(16, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 16 TFM
        buildOpAtts(17, 1, 2, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0);      // 17 BTM
        buildOpAtts(18, 1, 5, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 18 LDM
        buildOpAtts(19, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 19 DM

        buildOpAtts(20, 1, 2, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0);      // 20 BTA
        buildOpAtts(21, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 21 A
        buildOpAtts(22, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 22 S
        buildOpAtts(23, 1, 5, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 23 M
        buildOpAtts(24, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 24 C
        buildOpAtts(25, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 25 TD
        buildOpAtts(26, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 26 TF
        buildOpAtts(27, 1, 2, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0);      // 27 BT
        buildOpAtts(28, 1, 5, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 28 LD
        buildOpAtts(29, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 29 D

        buildOpAtts(30, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 30 TRNM
        buildOpAtts(31, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 31 TR
        buildOpAtts(32, 1, 2, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);      // 32 SF
        buildOpAtts(33, 1, 2, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);      // 33 CF
        buildOpAtts(34, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);      // 34 K
        buildOpAtts(35, 1, 2, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);      // 35 DN
        buildOpAtts(36, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);      // 36 RN
        buildOpAtts(37, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);      // 37 RA
        buildOpAtts(38, 1, 2, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);      // 38 WN
        buildOpAtts(39, 1, 2, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0);      // 39 WA

        buildOpAtts(40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 40
        buildOpAtts(41, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 41 NOP
        buildOpAtts(42, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0);      // 42 BB
        buildOpAtts(43, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0);      // 43 BD
        buildOpAtts(44, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0);      // 44 BNF
        buildOpAtts(45, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0);      // 45 BNR
        buildOpAtts(46, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0);      // 46 BI
        buildOpAtts(47, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0);      // 47 BNI
        buildOpAtts(48, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 48 H
        buildOpAtts(49, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0);      // 49 B

        buildOpAtts(50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 50
        buildOpAtts(51, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 51
        buildOpAtts(52, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 52
        buildOpAtts(53, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 53
        buildOpAtts(54, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 54
        buildOpAtts(55, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0);      // 55 BNG
        buildOpAtts(56, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 56
        buildOpAtts(57, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 57
        buildOpAtts(58, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 58
        buildOpAtts(59, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 59

        buildOpAtts(60, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0);      // 60 BS
        buildOpAtts(61, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0);      // 61 BX
        buildOpAtts(62, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0);      // 62 BXM
        buildOpAtts(63, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0);      // 63 BCX
        buildOpAtts(64, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0);      // 64 BCXM
        buildOpAtts(65, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0);      // 65 BLX
        buildOpAtts(66, 0, 0, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0);      // 66 BLXM
        buildOpAtts(67, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0);      // 67 BSX
        buildOpAtts(68, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 68
        buildOpAtts(69, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 69

        buildOpAtts(70, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0);      // 70 MA
        buildOpAtts(71, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0);      // 71 MF
        buildOpAtts(72, 1, 2, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0);      // 72 TNS
        buildOpAtts(73, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0);      // 73 TNF
        buildOpAtts(74, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 74
        buildOpAtts(75, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 75
        buildOpAtts(76, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 76
        buildOpAtts(77, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 77
        buildOpAtts(78, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 78
        buildOpAtts(79, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 79

        buildOpAtts(80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 80
        buildOpAtts(81, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 81
        buildOpAtts(82, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 82
        buildOpAtts(83, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 83
        buildOpAtts(84, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 84
        buildOpAtts(85, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 85
        buildOpAtts(86, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 86
        buildOpAtts(87, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 87
        buildOpAtts(88, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 88
        buildOpAtts(89, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 89

        buildOpAtts(90, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1);      // 90 BBT
        buildOpAtts(91, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1);      // 91 BMK
        buildOpAtts(92, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1);      // 92 ORF
        buildOpAtts(93, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1);      // 93 ANDF
        buildOpAtts(94, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1);      // 94 CPFL
        buildOpAtts(95, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1);      // 95 EORF
        buildOpAtts(96, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1);      // 96 OTD
        buildOpAtts(97, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1);      // 97 DTO
        buildOpAtts(98, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 98
        buildOpAtts(99, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);      // 99

        // Configure op code attributes for special features.
        for (let att of this.opAtts) {
            // Don't allow indexing of P & Q if indexing not available
            att.pIX &= this.xrInstalled;
            att.qIX &= this.xrInstalled;

            if (att.fp) {
                att.opValid = this.fpInstalled;
            } else if (att.index) {
                att.opValid = this.xrInstalled;
            } else if (att.binary) {
                att.opValid = this.bcInstalled;
            }
        }
    }


    /*******************************************************************
    *  Utility Methods                                                 *
    *******************************************************************/

    /**************************************/
    getDREven() {
        /* Returns the even (tens) digit of DR with the flag bit reconstructed
        from FL-2 */

        if (this.gateFL_2.value) {
            return (this.regDR.even | Register.flagMask) ^ Register.parityMask;
        } else {
            return this.regDR.even;
        }
    }

    /**************************************/
    setDREven(digit) {
        /* Sets the even (tens) digit of DR and sets FL-2 if DR is flagged.
        Returns the new value of DR-even */

        this.regDR.even = digit;
        this.gateFL_2.value = digit & Register.flagMask;
        return digit;
    }

    /**************************************/
    resetDREven() {
        /* "Resets" the even (tens) digit of DR -- meaning FL-2 is reset */

        this.gateFL_2.value = 0;
    }

    /**************************************/
    getDROdd() {
        /* Returns the odd (units) digit of DR with the flag bit reconstructed
        from FL-1 */

        if (this.gateFL_1.value) {
            return (this.regDR.odd | Register.flagMask) ^ Register.parityMask;
        } else {
            return this.regDR.odd;
        }
    }

    /**************************************/
    setDROdd(digit) {
        /* Sets the odd (units) digit of DR and sets FL-1 if DR is flagged.
        Returns the new value of DR-even */

        this.regDR.odd = digit;
        this.gateFL_1.value = digit & Register.flagMask;
        return digit;
    }

    /**************************************/
    resetDROdd() {
        /* "Resets" the odd (units) digit of DR -- meaning FL-1 is reset */

        this.gateFL_1.value = 0;
    }

    /**************************************/
    shiftDREvenOdd() {
        /* Shifts DR-even (tens) to DR-odd (units), transferring FL-2 to FL-1.
        Returns the new value of DR-odd */
        const digit = this.regDR.odd = this.getDREven();

        this.gateFL_1.value = this.gateFL_2.value;
        this.resetDREven();
        return digit;
    }

    /**************************************/
    addDigits(rawAddend) {
        /* Adds two digits and yields their sum. The augend must be in regDR.odd.
        If gateCOMP is set, the 9s-complement of the augend is added instead.
        gateCARRY_IN is added to the sum, which is then decimal-adjusted before
        storing it in regDR.odd. gateCARRY_OUT is set to the carry from the sum */
        let augend = this.regDR.odd & Register.bcdMask;
        let addend = rawAddend & Register.bcdMask;

        if (augend != Envir.bcdBinary[augend] || addend != Envir.bcdBinary[addend]) {
            this.marCheck(`addDigits() invalid BCD code: aug=${augend.toString()}, add=${addend.toString()}`);
            augend = Envir.bcdBinary[augend];
            addend = Envir.bcdBinary[addend];
        }

        let sum = (this.gateP_COMP.value ? 9-addend : addend) + this.gateCARRY_IN.value +
                  (this.gateCOMP.value ? 9-augend : augend);
        if (sum < 10) {
            this.gateCARRY_OUT.value = 0;
        } else {
            sum -= 10;
            this.gateCARRY_OUT.value = 1;
        }

        this.regDR.odd = sum;           // don't do setDROdd() -- preserve FL_1 state
        return sum;
    }

    /**************************************/
    loadCMEMFile(buffer) {
        /* Clears memory and then loads it from the text of the buffer passed
        as a parameter. The system must be in MANUAL and not AUTOMATIC mode.
        Sets IR1 to zero and resets BR_EXEC at the end.
        Returns a (possibly empty) string with the result of the load */
        let addr = 0;                   // current memory address
        let bufLength = buffer.length;  // length of the "buffer"
        let errors = 0;                 // number of errors detected
        let errMsg = "";                // description of last error
        let index = 0;                  // offset into "buffer"
        let line = "";                  // one line from the file image
        let lineNr = 0;                 // file image 1-relative line number
        let match = null;               // result of eolRex.exec()

        const eolRex = /([^\n\r\f]*)((:?\r[\n\f]?)|\n|\f)?/g;
        const addrRex = /^([0-9]{0,5})\s*:/;
        const dataSplitRex = /\s+/;
        const fullHexRex = /^[0-1]?[0-9a-fA-F]$/;

        let digitRex = /^[0-1]?[0-9acfACF]$/;

        const loadMemory = (addr, data) => {
            /* Loads a string of space-delimited hex digit values to memory
            starting at "addr". Returns the next address to be stored */
            let odd = addr & 1;         // even/odd address flag

            this.regMAR.binaryValue = addr;
            this.fetch();

            let digits = data.split(dataSplitRex);
            for (let c of digits) {
                if (!digitRex.test(c)) {
                    ++errors;
                    errMsg = `Invalid digit value "${c}" @${addr}, line ${lineNr}`;
                    c = "0";
                }

                let d = parseInt(c, 16);
                if (odd) {
                    this.regMIR.odd = Envir.oddParity5[d];
                    this.store();
                    this.regMAR.incr(2);
                    this.fetch();

                } else {
                    this.regMIR.even = Envir.oddParity5[d];
                }

                ++addr;
                odd = 1-odd;
            }

            if (odd) {
                this.store();
            }

            return addr;
        };

        const loadTabStops = (tabList) => {
            /* Parses the sting "tabList" to produce a comma-delimited list of
            typewriter tab stops. Passes that list to the Typewriter to be set
            as a temporary set of tab stops. The persistent Typewriter
            configuration data is not altered. This is a bit of a kludge, but
            it's good enough for the purpose at hand */
            let stopNrs = tabList.split(/[^0-9]+/);

            let stops = this.devices.typewriter.parseTabStops(stopNrs.join(","), this.window);
            if (stops) {
                this.devices.typewriter.tabStops = stops;
                this.devices.typewriter.$$("TabStops").value =
                        this.devices.typewriter.formatTabStops(stops);
            }
        };

        // First, make sure we're in the proper state.
        if (!(this.gatePOWER_ON.value && this.gateMANUAL.value && !this.gateAUTOMATIC.value)) {
            return "Invalid processor state.";
        }

        // Second, clear memory to zeroes.
        this.regMIR.clear();
        this.MM.fill(this.regMIR.value);

        // Read the lines from the file image.
        while (index < bufLength) {
            eolRex.lastIndex = index;
            match = eolRex.exec(buffer);
            if (!match) {               // assume EOF if no delimiter
                line = "";
                index = bufLength;
            } else {                    // process the extracted line
                ++lineNr;
                index += match[0].length;
                line = match[1].trimEnd().toLowerCase();
                let length = line.length;
                match = addrRex.exec(line);
                if (!match) {           // it's not an address:data line
                    if (length == 0) {
                        // empty line -- ignore
                    } else {
                        switch (line.at(0)) {
                        case "/":       // comment line -- ignore
                            break;
                        case "*":       // settings line
                            line = line.substring(1).trim();
                            if (line.startsWith("tabs")) {
                                loadTabStops(line.substring(4).trim());
                            } else if (line.startsWith("invalid")) {
                                digitRex = fullHexRex;
                            }
                            break;
                        default:        // it's something undefined
                            ++errors;
                            errMsg = `Unrecognized line ${lineNr}`;
                            break;
                        }
                    }
                } else {                // process an address:data line
                    let prefix = match[1];
                    if (prefix.length > 0) {
                        addr = parseInt(prefix, 10) ?? 0;
                    }

                    let data = line.substring(match[0].length).trim();
                    let x = data.indexOf("/");
                    if (x >= 0) {
                        data = data.substring(0, x).trim();
                    }

                    addr = loadMemory(addr, data);
                }
            }
        }

        // Finally, clear IR1 and BR_EXEC.
        this.regIR1.value = this.regMAR.clear();
        this.gateBR_EXEC.value = 0;
        return (errors ? `${errors} error(s), last was ${errMsg}.` : "");
    }

    /**************************************/
    updateLampGlow(beta) {
        /* Updates the lamp glow for all registers and flip-flops in the
        system. Beta is a bias in the range (0,1). For normal update use 0;
        to freeze the current state in the lamps use 1 */
        let gamma = (this.gateMANUAL.value ? 1 : beta || 0);

        // Control Gates
        this.gate$$$_OFLO.updateLampGlow(gamma);
        this.gate1ST_CYC.updateLampGlow(gamma);
        this.gate1ST_CYC_DELAYD.updateLampGlow(gamma);
        this.gate1ST_MPLY_CYCLE.updateLampGlow(gamma);
        this.gate2_DIG_CNTRL.updateLampGlow(gamma);
        this.gateADD_ENT.updateLampGlow(gamma);
        this.gateADD_MODE.updateLampGlow(gamma);
        this.gateBR_EXEC.updateLampGlow(gamma);
        this.gateBR_OUT.updateLampGlow(gamma);
        this.gateCARRY_IN.updateLampGlow(gamma);
        this.gateCARRY_OUT.updateLampGlow(gamma);
        this.gateCLR_MEM.updateLampGlow(gamma);
        this.gateCOMP.updateLampGlow(gamma);
        this.gateDIV_1_CYC.updateLampGlow(gamma);
        this.gateDVD_L_CYC.updateLampGlow(gamma);
        this.gateDVD_SIGN.updateLampGlow(gamma);
        this.gateEOR$.updateLampGlow(gamma);
        this.gateEXMIT_ENT.updateLampGlow(gamma);
        this.gateEXMIT_MODE.updateLampGlow(gamma);
        this.gateEXP_OFLO.updateLampGlow(gamma);
        this.gateEXP_UFLO.updateLampGlow(gamma);
        this.gateEZ.updateLampGlow(gamma);
        this.gateE_CYC_ENT.updateLampGlow(gamma);
        this.gateFIELD_MK_1.updateLampGlow(gamma);
        this.gateFIELD_MK_2.updateLampGlow(gamma);
        this.gateFL_1.updateLampGlow(gamma);
        this.gateFL_2.updateLampGlow(gamma);
        this.gateHP.updateLampGlow(gamma);
        this.gateIA_ENT.updateLampGlow(gamma);
        this.gateIA_REQ.updateLampGlow(gamma);
        this.gateIA_SEL.updateLampGlow(gamma);
        this.gateINT_ENT.updateLampGlow(gamma);
        this.gateINT_MODE.updateLampGlow(gamma);
        this.gateIX_BAND_1.updateLampGlow(gamma);
        this.gateIX_BAND_2.updateLampGlow(gamma);
        this.gateIX_ENT.updateLampGlow(gamma);
        this.gateIX_EXEC.updateLampGlow(gamma);
        this.gateI_CYC_ENT.updateLampGlow(gamma);
        this.gateLAST_CARD.updateLampGlow(gamma);
        this.gateLAST_LD_CYC.updateLampGlow(gamma);
        this.gateMASK.updateLampGlow(gamma);
        this.gateMC_1.updateLampGlow(gamma);
        this.gateMC_2.updateLampGlow(gamma);
        this.gateP.updateLampGlow(gamma);
        this.gateP_COMP.updateLampGlow(gamma);
        this.gateRECOMP.updateLampGlow(gamma);
        this.gateRM.updateLampGlow(gamma);
        this.gateRUN.updateLampGlow(gamma);
        this.gateSTOP.updateLampGlow(gamma);

        // Input-Output Gates
        this.gateCHAR_GATE.updateLampGlow(gamma);
        this.gateDISK_ADDR.updateLampGlow(gamma);
        this.gateDISK_HUND.updateLampGlow(gamma);
        this.gateDISK_LD_ZERO.updateLampGlow(gamma);
        this.gateDISK_OP.updateLampGlow(gamma);
        this.gateDISK_UNIT.updateLampGlow(gamma);
        this.gateIO_FLAG.updateLampGlow(gamma);
        this.gateMEM_ADDR.updateLampGlow(gamma);
        this.gatePCH_FEED.updateLampGlow(gamma);
        this.gatePC_6XXX.updateLampGlow(gamma);
        this.gatePC_EZ.updateLampGlow(gamma);
        this.gatePC_HP.updateLampGlow(gamma);
        this.gatePC_IND.updateLampGlow(gamma);
        this.gatePC_OFLOW.updateLampGlow(gamma);
        this.gatePC_TR_8.updateLampGlow(gamma);
        this.gateRD.updateLampGlow(gamma);
        this.gateRDR_FEED.updateLampGlow(gamma);
        this.gateREL.updateLampGlow(gamma);
        this.gateRESP_GATE.updateLampGlow(gamma);
        this.gateSCTR_COUNT.updateLampGlow(gamma);
        this.gateSCTR_CYC.updateLampGlow(gamma);
        this.gateSIMO_30.updateLampGlow(gamma);
        this.gateSIMO_HOLD.updateLampGlow(gamma);
        this.gateWR.updateLampGlow(gamma);

        // Instruction & Execution Cycle Gates
        this.gateE_1.updateLampGlow(gamma);
        this.gateE_2.updateLampGlow(gamma);
        this.gateE_3.updateLampGlow(gamma);
        this.gateE_4.updateLampGlow(gamma);
        this.gateE_5.updateLampGlow(gamma);
        this.gateIA_1.updateLampGlow(gamma);
        this.gateIA_2.updateLampGlow(gamma);
        this.gateIA_3.updateLampGlow(gamma);
        this.gateIX.updateLampGlow(gamma);
        this.gateI_1.updateLampGlow(gamma);
        this.gateI_2.updateLampGlow(gamma);
        this.gateI_3.updateLampGlow(gamma);
        this.gateI_4.updateLampGlow(gamma);
        this.gateI_5.updateLampGlow(gamma);
        this.gateI_6.updateLampGlow(gamma);

        // Operator Control Panel Indicators
        // this.gatePOWER_ON and this.gatePOWER_READY are not updated since they are on constantly.
        this.gateTHERMAL.updateLampGlow(gamma);
        this.gateWRITE_INTERLOCK.updateLampGlow(gamma);
        this.gateREAD_INTERLOCK.updateLampGlow(gamma);
        this.gateSAVE.updateLampGlow(gamma);
        this.gateTWPR_SELECT.updateLampGlow(gamma);
        //this.gateRFE1.updateLampGlow(gamma);
        //this.gateRFE2.updateLampGlow(gamma);
        //this.gateRFE3.updateLampGlow(gamma);
        this.gateAUTOMATIC.updateLampGlow(gamma);
        this.gateMANUAL.updateLampGlow(gamma);
        this.gateCHECK_STOP.updateLampGlow(gamma);

        // Check Indicators
        this.diskAddrCheck.updateLampGlow(gamma);
        this.diskCylOflowCheck.updateLampGlow(gamma);
        this.diskWLRRBCCheck.updateLampGlow(gamma);
        this.dummy1Check.updateLampGlow(gamma);
        this.dummy2Check.updateLampGlow(gamma);
        this.dummy3Check.updateLampGlow(gamma);
        this.ioPrinterCheck.updateLampGlow(gamma);
        this.ioReadCheck.updateLampGlow(gamma);
        this.ioWriteCheck.updateLampGlow(gamma);
        this.oflowArithCheck.updateLampGlow(gamma);
        this.oflowDummyCheck.updateLampGlow(gamma);
        this.oflowExpCheck.updateLampGlow(gamma);
        this.parityMARCheck.updateLampGlow(gamma);
        this.parityMBREvenCheck.updateLampGlow(gamma);
        this.parityMBROddCheck.updateLampGlow(gamma);

        // Console Registers
        this.regDR.updateLampGlow(gamma);
        this.regMAR.updateLampGlow(gamma);
        this.regMBR.updateLampGlow(gamma);
        this.regMIR.updateLampGlow(gamma);
        this.regMQ.updateLampGlow(gamma);
        this.regOP.updateLampGlow(gamma);
        this.regXR.updateLampGlow(gamma);
    }


    /*******************************************************************
    *  Memory Subsystem                                                *
    *******************************************************************/

    /**************************************/
    fetch() {
        /* Fetches the double-digit pair from memory at the MAR address
        into MBR */
        let addr = this.regMAR.binaryValue;

        if (this.regMAR.invalidBCD) {
            this.marCheck(`fetch() invalid MAR BCD ${this.regMAR.toBCDString()}`);
        } else if (addr >= this.envir.memorySize) {
            this.marCheck(`fetch() invalid memory address=${this.regMAR.toBCDString()}`);
        } else {
            let pair = this.MM[addr >> 1];              // div 2
            this.regMIR.correctedValue = this.regMBR.value = pair;

            // Set indicators for parity errors.
            if (this.regMBR.parityError) {
                let digit = (pair >> Register.digitBits) & this.digitMask;
                if (Envir.oddParity5[digit] != digit) {
                    this.setIndicator(17, `fetch() parity error @${this.regMAR.toBCDString()}`);
                }

                digit = pair & this.digitMask;
                if (Envir.oddParity5[digit] != digit) {
                    this.mbrCheck(16, `fetch() parity error @${this.regMAR.toBCDString()}`);
                }
            }
        }
    }

    /**************************************/
    store() {
        /* Stores the double-digit pair in MIR to memory at the MAR address */
        let addr = this.regMAR.binaryValue;

        if (this.regMAR.invalidBCD) {
            this.marCheck(`store() invalid MAR BCD ${this.regMAR.toBCDString()}`);
        } else if (addr >= this.envir.memorySize) {
            this.marCheck(`store() invalid memory address=${this.regMAR.toBCDString()}`);
        } else {
            this.MM[addr >> 1] = this.regMIR.value;
        }
    }

    /**************************************/
    async clearMemory() {
        /* Clears all of memory to zeroes */

        this.regMAR.clear();
        this.regMIR.clear();
        this.envir.startTiming();

        let a = 0;
        do {
            this.store();
            this.regMAR.incr(2);
            a += 2;
            if (a % 20000 == 0) {
                this.gateCLR_CTRL.value = 1;
                this.gateEND_OF_MODULE.value = 1;
            }

            if (this.envir.tick()) {
                await this.envir.throttle();
            }
        } while (a < Envir.maxMemorySize);

        this.gateCLR_MEM.value = 0;
        this.regMAR.clear();
        this.enterManual();
    }


    /*******************************************************************
    *  Input/Output Subsystem                                          *
    *******************************************************************/

    /**************************************/
    ioSelect(device, variant) {
        /* Sets up this.ioDevice and this.ioVariant from the parameters */

        this.ioSelectNr = device;
        switch (device) {
        case 1:         // Typewriter
            this.ioDevice = this.devices.typewriter;
            this.ioVariant = variant & Register.bcdMask;
            this.gateTWPR_SELECT.value = 1;
            break;
        case 2:         // Paper Tape Punch / Plotter
            this.ioDevice = null;
            break;
        case 3:         // Paper Tape Reader
            this.ioDevice = null;
            break;
        case 4:         // Card Punch
            this.ioDevice = this.devices.cardPunch;
            break;
        case 5:         // Card Reader
            this.ioDevice = this.devices.cardReader;
            break;
        case 7:         // Disk Drive
            this.ioDevice = this.devices.diskDrive;
            this.ioVariant = variant & Register.bcdMask;
            this.gateDISK_OP.value = 1;
            break;
        case 9:         // Printer
            this.ioDevice = null;
            this.ioVariant = variant & Register.bcdValueMask;
            break;
        case 33:        // Binary Paper Tape Reader
            this.ioDevice = null;
            break;
        default:
            this.ioDevice = null;
            break;
        }
    }

    /**************************************/
    async dumpNumerically(digit) {
        /* Executes one digit cycle of Dump Numerically (DN, 35). If the device
        returns an end-of-block indication and we're at END OF MODULE, or
        RELEASE occurs, terminate the I/O (note that OR2 gets incremented before
        this routine is called */

        this.gateRESP_GATE.value = 0;
        this.gateCHAR_GATE.value = 1;

        let eob = await this.ioDevice.dumpNumeric(digit);
        this.gateCHAR_GATE.value = 0;
        if (this.gateWR.value) {        // we haven't been released...
            this.gateRESP_GATE.value = 1;

            if (this.regOR2.binaryValue % 20000 == 0) {
                this.gateEND_OF_MODULE.value = 1;
            }

            if (eob) {
                if (this.gateEND_OF_MODULE.value) {
                    this.ioExit();
                } else {
                    // Update emulation clock after each non-final block
                    this.envir.restartTiming();
                }
            }
        }
    }

    /**************************************/
    async writeNumerically(digit) {
        /* Executes one digit cycle of Write Numerically (WN, 38).
        Terminate the I/O if:
            * For Card Punch, if it returns eob=true (=> 80th column sent)
            * For all others, if the digit matches a record mark
            * If a RELEASE occurs
        */

        this.gateRESP_GATE.value = 0;
        this.gateCHAR_GATE.value = 1;
        switch (this.ioSelectNr) {
        case 4:         // Card Punch
            const eob = await this.ioDevice.writeNumeric(digit);
            if (eob) {
                this.ioExit();
            }
            break;
        default:
            if ((digit & Envir.numRecMark) == Envir.numRecMark) {
                this.ioExit();
            } else {
                await this.ioDevice.writeNumeric(digit);
            }
            break;
        }

        this.gateCHAR_GATE.value = 0;
        if (this.gateWR.value) {    // we haven't been released...
            this.gateRESP_GATE.value = 1;
        }
    }

    /**************************************/
    async writeAlphanumerically(digitPair) {
        /* Executes one character cycle of Write Numerically (WN, 39).
        Terminate the I/O if:
            * For Card Punch, if it returns eob=true (=> 80th column sent)
            * For all others, if the odd digit matches a record mark
            * If a RELEASE occurs
        */

        this.gateRESP_GATE.value = 0;
        this.gateCHAR_GATE.value = 1;
        switch (this.ioSelectNr) {
        case 4:         // Card Punch
            const eob = await this.ioDevice.writeAlpha(digitPair);
            if (eob) {
                this.ioExit();
            }
            break;
        default:
            if ((digitPair & Envir.numRecMark) == Envir.numRecMark) {
                this.ioExit();
            } else {
                await this.ioDevice.writeAlpha(digitPair);
            }
            break;
        }

        this.gateCHAR_GATE.value = 0;
        if (this.gateWR.value) {    // we haven't been released...
            this.gateRESP_GATE.value = 1;
        }
    }

    /**************************************/
    receiveKeystroke(code, flagged) {
        /* Receives the next keystroke code from the Typewriter. Determines
        whether input is being accepted (i.e., keyboard is unlocked), and if so
        either stores the character or performs the special function. Code can be:
            (>=0) the ASCII code for the key pressed.
            (-1) indicates the R/S (Enter) key was pressed.
            (-2) indicates the CORR (Backspace) key was pressed.
            (-3) indicates the FLG (` [grave accent] or ~ [tilde] key was pressed.
            (-4) indicates the INSERT (ESC) key was pressed.
            (-5) indicates the RETURN (Enter) key was pressed.
            (-6) indicates the TAB key was pressed.
            (-7) indicates the SPACE key was pressed.
        For numeric input (RN, 36)
            only the decimal digits, record mark (|), and numeric blank (@) are
            accepted. CORR causes OR2 to be decremented by 1.
        For alphanumeric input (RA, 37)
            only the valid 1620 characters and record mark are accepted. Other
            ASCII characters and FLG are ignored.
        The method returns:
            0 if the keystroke is to be ignored and not echoed (keyboard locked).
            (-1) if an R/S code is accepted and should be echoed to the paper.
            (-2) if a CORR code is accepted and should be printed.
            (-3) if a FLG code is accepted and a flagged echo should be set up.
            (-4) if an INSERT code is accepted.
            (-5) indicates a local carriage-return should be output.
            (-6) indicates a local tab should be output.
            (-7) indicates a local space should be output.
            otherwise, the 1620 internal code for the character to be echoed.
        "flagged" indicates the keystroke was preceded by the FLG key. This is
        ignored for Read Alphanumerically.
        Note that the Typewriter will call this routine whenever the Typewriter
        window has the focus and the user presses a keyboard key. It's the job
        of this routine to figure out whether that keystroke should be accepted.
        Thus, keyboard lock is enforced here, not in the Typewriter. The
        Typewriter will not send 1620 characters invalid for it */
        let reply = 0;                  // ignore keystrokes by default

        if (this.ioSelectNr == 1 && this.gateRD.value) { // must be waiting for Typewriter input
            const readNumeric = (this.opBinary == 36);

            switch (code) {
            case -1:    // R/S key
                reply = code;
                this.release();
                this.start();
                break;

            case -2:    // CORR key
                reply = code;
                this.regMAR.value = this.regOR2.value;
                this.regOR2.decr(readNumeric ? 1 : 2);
                break;

            case -3:    // FLG key
                if (readNumeric) {
                    reply = code;
                }
                break;

            case -4:    // INSERT key -- can't be used while I/O in progress
                break;

            case -5:    // RETURN key
            case -6:    // TAB key
                reply = code;           // just return these for local echo
                break;

            case -7:    // SPACE key: convert to the space code and continue
                code = (" ").charCodeAt(0);
                //--no break
            default:    // some other character
                this.gateRESP_GATE.value = 1;
                if (readNumeric) {
                    let char = Processor.twprASCIInumeric1620[String.fromCharCode(code)];
                    if (char !== undefined) {
                        if (flagged) {
                            this.gateIO_FLAG.value = 1;
                            reply = Envir.oddParity5[char | Register.flagMask];
                        } else {
                            this.gateIO_FLAG.value = 0;
                            reply = Envir.oddParity5[char];
                        }

                        this.regMAR.value = this.regOR2.value;
                        this.fetch();
                        this.regMIR.setDigit(this.regMAR.isEven, reply);
                        this.store();
                        this.regOR2.incr(1);
                        if (this.gateINSERT.value && this.regMAR.binaryValue == 99) {
                            this.ioExit();
                            this.enterManual();
                        }
                    }
                } else {        // read alphanumeric
                    let char = Processor.stdASCIIalpha1620[String.fromCharCode(code)];
                    if (char !== undefined) {
                        let even = (char >> Register.digitBits) & Register.bcdMask;
                        let odd  = char & Register.bcdMask;
                        reply = (Envir.oddParity5[even] << Register.digitBits) | Envir.oddParity5[odd];
                        this.regMAR.value = this.regOR2.value;
                        this.fetch();

                        // Simulate the problem with even starting addresses.
                        // The input translator was sensitive to whether it was
                        // dealing with zone or numeric digits, so an even address
                        // could cause translation and parity errors. This
                        // approach just sets Read Check Pending, which will set
                        // the check indicator in ioExit.
                        if (this.regMAR.isEven) {
                            [even, odd] = [odd, even];
                            if (!this.ioReadCheckPending) {
                                this.ioReadCheckPending = true;
                                this.ioReadCheck.value = 1;
                            }
                        }

                        // Preserve any flags already in memory.
                        this.regMIR.setDigit(1, Envir.oddParity5[(this.regMIR.even & Register.flagMask) | even]);
                        this.regMIR.setDigit(0, Envir.oddParity5[(this.regMIR.odd  & Register.flagMask) | odd]);
                        this.store();
                        this.regOR2.incr(2);
                    }
                }
                break;
            }

            this.gateRESP_GATE.value = 0;
            this.envir.restartTiming(); // restart the throttling clock (because Typewriter is so slow)
        } else {                        // check for local action
            switch (code) {
            case -4:                    // INSERT key
                reply = code;
                this.insert(false);             // will check for MANUAL mode, etc.
                break;
            case -5:                    // RETURN key
            case -6:                    // TAB key
            case -7:                    // SPACE key
                reply = code;                   // just echo the key locally
                break;
            }
        }

        return reply;
    }

    /**************************************/
    receiveCardColumn(char, lastCol) {
        /* Called by the CardReader to transfer one character to core memory.
        "char" is the ASCII 1-character string, "lastCol" is true if this is the
        last column (80) of the card. If the CardReader transfers invalid 1620
        characters, the RD CHK indicator will be set */

        if (this.ioSelectNr == 5 && this.gateRD.value) { // must be waiting for CardReader input
            const readNumeric = (this.opBinary == 36);

            this.gateRESP_GATE.value = 1;
            if (readNumeric) {
                let code = Processor.cardASCIInumeric1620[char];
                if (code === undefined) {
                    this.ioReadCheckPending = true;
                    code = 0;
                } else {
                    this.gateIO_FLAG.value = code & Register.flagMask;
                }

                this.regMAR.value = this.regOR2.value;
                this.fetch();
                this.regMIR.setDigit(this.regMAR.isEven, Envir.oddParity5[code]);
                this.store();
                this.regOR2.incr(1);
                if (this.gateINSERT.value && this.regMAR.binaryValue == 99) {
                    this.ioExit();
                    this.enterManual();
                }
            } else {    // read alphanumeric
                let code = Processor.stdASCIIalpha1620[char];
                if (code === undefined || char == "^") {        // reject "special" char
                    this.ioReadCheckPending = true;
                    code = 0;
                }

                let even = (code >> Register.digitBits) & Register.bcdMask;
                let odd  = code & Register.bcdMask;
                this.regMAR.value = this.regOR2.value;
                this.fetch();

                // Simulate the problem with even starting addresses. The input
                // translator was sensitive to whether it was dealing with zone
                // or numeric digits, so an even address could cause translation
                // and parity errors. This approach just sets Read Check Pending,
                // which will set the check indicator in at lastCol below.
                if (this.regMAR.isEven) {
                    [even, odd] = [odd, even];
                    this.ioReadCheckPending = true;
                }

                // Preserve any flags already in memory.
                this.regMIR.setDigit(1, Envir.oddParity5[(this.regMIR.even & Register.flagMask) | even]);
                this.regMIR.setDigit(0, Envir.oddParity5[(this.regMIR.odd  & Register.flagMask) | odd]);
                this.store();
                this.regOR2.incr(2);
            }

            this.envir.tick();                  // advance the emulation clock
            this.envir.tick();                  // by 2 memory cycles
            this.gateRESP_GATE.value = 0;
            if (lastCol) {
                if (this.ioReadCheckPending) {
                    this.ioReadCheckPending = false;
                    this.setIndicator(6, "CardReader read check");
                    if (this.ioStopSwitch) {
                        return;                 // don't restart the Processor
                    }
                }

                this.ioExit();                  // exits Limbo state; will reset INSERT if it's set
                if (!this.gateMANUAL.value) {
                    this.run();
                }
            }
        }
    }

    /**************************************/
    loadDiskControl() {
        /* Loads the fields of the Disk Control Field addressed by OR-2 to the
        OR-1, OR-2, and PR-2 registers. The drive code is converted to a disk
        module number and stored in this.ioDiskDriveCode. This process involves 10
        memory cycles which are not visible when doing STOP/SCE. Returns true if
        there is an error */
        let result = false;

        this.regMAR.value = this.regOR2.value;
        if (this.regMAR.isOdd) {
            result = true;
            this.marCheck("Disk Control Field at odd address");
        }

        this.gateDISK_LD_ZERO.value = 1;
        this.fetch();
        let driveCode = this.regMBR.even & Register.bcdMask;
        this.regOR1.clear();
        this.regOR2.clear();
        this.regPR2.clear();
        this.envir.tick();
        this.gateDISK_LD_ZERO.value = 0;

        // Load OR-1.

        this.gateDISK_ADDR.value = 1;
        this.fetch();   // no MAR increment
        this.regOR1.setDigit(4, this.regMBR.odd);
        this.envir.tick();

        this.gateDISK_HUND.value = 1;
        this.regMAR.incr(2);
        this.fetch();
        this.regOR1.setDigit(3, this.regMBR.even);
        this.regOR1.setDigit(2, this.regMBR.odd);
        this.envir.tick();
        this.gateDISK_HUND.value = 0;

        this.gateDISK_UNIT.value = 1;
        this.regMAR.incr(2);
        this.fetch();
        this.regOR1.setDigit(1, this.regMBR.even);
        this.regOR1.setDigit(0, this.regMBR.odd);
        this.envir.tick();
        this.gateDISK_UNIT.value = 0;
        this.gateDISK_ADDR.value = 0;

        // Load PR-2.

        this.gateSCTR_COUNT.value = 1;
        this.gateDISK_HUND.value = 1;
        this.regMAR.incr(2);
        this.fetch();
        this.regPR2.setDigit(2, this.regMBR.even);
        this.regPR2.setDigit(1, this.regMBR.odd);
        this.envir.tick();
        this.gateDISK_HUND.value = 0;

        this.gateDISK_UNIT.value = 1;
        this.regMAR.incr(2);
        this.fetch();
        this.regPR2.setDigit(0, this.regMBR.even);
        this.envir.tick();
        this.gateDISK_UNIT.value = 0;
        this.gateSCTR_COUNT.value = 0;

        // Load OR-2.

        this.gateMEM_ADDR.value = 1;
        this.fetch();   // no MAR increment
        this.regOR2.setDigit(4, this.regMBR.odd);
        this.envir.tick();

        this.gateDISK_HUND.value = 1;
        this.regMAR.incr(2);
        this.fetch();
        this.regOR2.setDigit(3, this.regMBR.even);
        this.regOR2.setDigit(2, this.regMBR.odd);
        this.envir.tick();
        this.gateDISK_HUND.value = 0;

        this.gateDISK_UNIT.value = 1;
        this.regMAR.incr(2);
        this.fetch();
        this.regOR2.setDigit(1, this.regMBR.even);
        this.regOR2.setDigit(0, this.regMBR.odd);
        this.envir.tick();
        this.gateDISK_UNIT.value = 0;
        this.gateMEM_ADDR.value = 0;

        // Finish load.

        this.gateSCTR_CYC.value = 1;
        if (driveCode < 8) {
            this.ioDiskDriveCode = driveCode;
        } else {
            result = true;
            this.ioDiskDriveCode = 9;
            this.checkStop(`Disk invalid drive code ${driveCode}`);
        }

        this.envir.tick();
        this.gateDISK_OP.value = 0;
        return result;
    }

    /**************************************/
    initiateDiskControl() {
        /* Initiates a seek operation to the disk drive. Module selection errors
        are ignored */

        if (this.loadDiskControl()) {
            // Check Stop occurred during load of registers
        } else if (this.ioVariant == 1) {
            this.gateSCTR_CYC.value = 0;
            if (this.ioDevice.selectModule(this.ioDiskDriveCode, this.regOR1.value)) {
                this.ioDevice.initiateSeek();   // async, returns immediately
            }
            this.ioExit();
        } else {
            this.gateWRITE_INTERLOCK.value = 1;
            this.enterLimbo();                  // just hang on undefined variant
        }
    }

    /**************************************/
    async readDiskSectors(check, wlrc) {
        /* Reads one or more disk sectors from the currently selected disk
        module at the address specified by OR-1 for the number of sectors
        specified by PR-2 to the memory address specified by OR-2.
            check: compare data to memory instead of storing data to memory
            wlrc: detect group marks and wrong-length records.
        Runs in Limbo, so restarts this.run() on completion */

        const storeSector = (finished, error, data) => {
            /* Callback function to receive disk sector data into memory:
                finished: disk module has no more sectors to send (usually sector overflow)
                error: disk module detected a fatal error during read
                data: Uint8Array buffer holding the disk sector digits
            Returns false to indicate the disk module should continue reading
            sectors; returns true on error or after the sector count has been
            exhausted */
            let terminate = false;

            if (finished) {
                terminate = true;
            } else if (error) {
                terminate = true;
            } else {
                this.gateRESP_GATE.value = 1;
                for (let x=Processor.diskAddressSize; x<Processor.diskSectorSize; x+=2) {
                    const d1 = data[x] & Register.notParityMask;
                    const d2 = data[x+1] & Register.notParityMask;
                    this.regMAR.value = this.regOR2.value;
                    this.fetch();
                    if (check) {
                        const m1 = this.regMBR.even & Register.notParityMask;
                        const m2 = this.regMBR.odd & Register.notParityMask;
                        if (wlrc && ((d1 & Register.bcdMask) == Envir.numGroupMark ||
                                     (m1 & Register.bcdMask) == Envir.numGroupMark)) {
                            terminate = true;
                            this.setIndicator(37, `Disk check WLRC compare group mark at ${x}`);
                        } else if (d1 != m1) {
                            terminate = true;
                            this.setIndicator(37, `Disk check compare mismatch at ${x}`);
                        } else if (wlrc && ((d2 & Register.bcdMask) == Envir.numGroupMark ||
                                            (m2 & Register.bcdMask) == Envir.numGroupMark)) {
                            terminate = true;
                            this.setIndicator(37, `Disk check WLRC compare group mark at ${x+1}`);
                        } else if (d2 != m2) {
                            terminate = true;
                            this.setIndicator(37, `Disk check compare mismatch at digit ${x+1}`);
                        }
                    } else {
                        this.regMIR.even = d1;
                        if (wlrc && (d1 & Register.bcdMask) == Envir.numGroupMark) {
                            terminate = true;
                            this.setIndicator(37, `Disk read WLRC group mark at ${x}`);
                        } else {
                            this.regMIR.odd = d2;
                            if (wlrc && (d2 & Register.bcdMask) == Envir.numGroupMark) {
                                terminate = true;
                                this.setIndicator(37, `Disk read WLRC group mark at ${x+1}`);
                            }
                        }
                    }

                    this.store();
                    this.envir.tick();
                    this.regOR2.incr(2);
                    if (terminate) {
                        break;          // out of for loop
                    }
                } // for x

                this.gateRESP_GATE.value = 0;
            }

            this.regOR1.incr(1);                                // increment sector address
            this.ioDevice.sectorAddr = this.regOR1.value;       // tell device what address should be
            if (this.regPR2.isZero) {
                terminate = true;
            } else {
                this.regPR2.decr(1);    // decrement count for next sector
                if (wlrc && !terminate) {
                    this.regMAR.value = this.regOR2.value;
                    this.fetch();
                    if ((this.regMBR.even & Register.bcdMask) == Envir.numGroupMark) {
                        terminate = true;
                        this.setIndicator(37, "Disk early end-of-sector group mark in memory");
                    }
                }
            }

            return terminate;
        }; // storeSector

        this.regPR2.decr(1);            // decrement count for initial sector
        await this.ioDevice.readSectors(storeSector);
        if (wlrc && this.regPR2.isZero) {
            this.regMAR.value = this.regOR2.value;
            this.fetch();
            if ((this.regMBR.even & Register.bcdMask) != Envir.numGroupMark) {
                this.setIndicator(37, "Disk read WLRC no memory group mark after end of read");
            }
        }

        this.ioExit();                  // exits Limbo state; will reset INSERT if it's set
        if (!this.gateMANUAL.value) {
            this.run();
        }
    }

    /**************************************/
    async readDiskTrack(wlrc) {
        /* Reads one track of disk sectors from the currently selected disk
        module at the address specified by OR-1 to the memory address specified
        by OR-2.
            wlrc: detect group marks and wrong-length records.
        Runs in Limbo, so restarts this.run() on completion */
        let evenAddr = 0;               // even/odd half of memory digit pair

        const storeTrack = (finished, error, data) => {
            /* Callback function to receive disk sector data into memory:
                finished: disk module has no more sectors to send (usually sector overflow)
                error: disk module detected a fatal error during read
                data: Uint8Array buffer holding the disk sector digits
            Returns false to indicate the disk module should continue reading
            sectors; returns true on error */
            let terminate = false;

            if (finished) {
                terminate = true;
            } else if (error) {
                terminate = true;
            } else {
                this.gateRESP_GATE.value = 1;
                for (let x=0; x<Processor.diskSectorSize; ++x) {
                    const d = data[x] & Register.notParityMask;

                    evenAddr = 1-evenAddr;
                    if (evenAddr) {
                        this.regMAR.value = this.regOR2.value;
                        this.fetch();
                    }

                    this.regMIR.setDigit(evenAddr, d);
                    if (wlrc && (d & Register.bcdMask) == Envir.numGroupMark) {
                        terminate = true;
                        this.setIndicator(37, `Disk readTrack WLRC group mark at ${x}`);
                    }

                    if (!evenAddr || terminate) {
                        this.store();
                        this.envir.tick();
                        this.regOR2.incr(2);
                        if (terminate) {
                            break;      // out of for loop
                        }
                    }
                } // for x

                this.gateRESP_GATE.value = 0;
            }

            this.ioDevice.sectorAddr = this.regOR1.value;       // tell device what address should be
            if (wlrc && !terminate) {
                if (!evenAddr) {        // if even address, digit is already in MBR
                    this.regMAR.value = this.regOR2.value;
                    this.fetch();
                }
                if ((this.regMBR.getDigit(evenAddr) & Register.bcdMask) == Envir.numGroupMark) {
                    terminate = true;
                    this.setIndicator(37, "Disk readTrack early end-of-sector group mark in memory");
                }
            }

            return terminate;
        }; // storeTrack

        this.regPR2.decr(1);            // decrement count for initial sector
        await this.ioDevice.readTrack(storeTrack);
        if (wlrc) {
            this.regMAR.value = this.regOR2.value;
            this.fetch();
            if ((this.regMBR.even & Register.bcdMask) != Envir.numGroupMark) {
                this.setIndicator(37, "Disk WLRC no memory group mark after end of read");
            }
        }

        this.ioExit();                  // exits Limbo state; will reset INSERT if it's set
        if (!this.gateMANUAL.value) {
            this.run();
        }
    }

    /**************************************/
    async checkDiskTrack(wlrc) {
        /* Reads one track of disk sectors from the currently selected disk
        module at the address specified by OR-1 and compares the sector data to
        the memory address specified by OR-2.
            wlrc: detect group marks and wrong-length records.
        Runs in Limbo, so restarts this.run() on completion */
        let evenAddr = 0;               // even/odd half of memory digit pair

        const compareTrack = (finished, error, data) => {
            /* Callback function to receive disk sector data and compare it with
            core memory:
                finished: disk module has no more sectors to send (usually sector overflow)
                error: disk module detected a fatal error during read
                data: Uint8Array buffer holding the disk sector digits
            Returns false to indicate the disk module should continue reading
            sectors; returns true on error */
            let terminate = false;

            if (finished) {
                terminate = true;
            } else if (error) {
                terminate = true;
            } else {
                this.gateRESP_GATE.value = 1;
                for (let x=0; x<Processor.diskSectorSize; ++x) {
                    const d = data[x] & Register.notParityMask;

                    evenAddr = 1-evenAddr;
                    if (evenAddr) {
                        this.regMAR.value = this.regOR2.value;
                        this.fetch();
                    }

                    const m = this.regMBR.getDigit(evenAddr) & Register.notParityMask;
                    if (wlrc && ((d & Register.bcdMask) == Envir.numGroupMark ||
                                 (m & Register.bcdMask) == Envir.numGroupMark)) {
                        terminate = true;
                        this.setIndicator(37, `Disk checkTrack WLRC compare group mark at ${x}`);
                    } else if (d != m) {
                        terminate = true;
                        this.setIndicator(37, `Disk check compare mismatch at ${x}`);
                    }

                    if (!evenAddr) {
                        this.envir.tick();
                        this.regOR2.incr(2);
                    }

                    if (terminate) {
                        break;          // out of for loop
                    }
                } // for x

                this.gateRESP_GATE.value = 0;
            }

            this.regOR1.incr(1);                                // increment sector address
            this.ioDevice.sectorAddr = this.regOR1.value;       // tell device what address should be
            if (wlrc && !terminate) {
                if (!evenAddr) {        // if even address, digit is already in MBR
                    this.regMAR.value = this.regOR2.value;
                    this.fetch();
                }
                if ((this.regMBR.getDigit(evenAddr) & Register.bcdMask) == Envir.numGroupMark) {
                    terminate = true;
                    this.setIndicator(37, "Disk compare track early end-of-sector group mark in memory");
                }
            }

            return terminate;
        }; // compareTrack

        await this.ioDevice.readTrack(compareTrack);
        if (wlrc) {
            this.regMAR.value = this.regOR2.value;
            this.fetch();
            if ((this.regMBR.even & Register.bcdMask) != Envir.numGroupMark) {
                this.setIndicator(37, "Disk WLRC no memory group mark after end of read");
            }
        }

        this.ioExit();                  // exits Limbo state; will reset INSERT if it's set
        if (!this.gateMANUAL.value) {
            this.run();
        }
    }

    /**************************************/
    initiateDiskRead() {
        /* Initiates a read operation to the disk drive. The individual read
        functions are defined as async, but we don't await them as we are in
        Limbo state -- they will run asynchronously and restart the processor
        on completion */

        if (this.loadDiskControl()) {
            // Check Stop occurred during load of registers
        } else if (this.regOR2.isOdd) {
            this.checkStop(`Disk read buffer at odd address ${this.regOR2.binaryValue}`);
        } else if (!this.ioDevice.selectModule(this.ioDiskDriveCode, this.regOR1.value)) {
            this.gateWRITE_INTERLOCK.value = 1; // just hang on invalid disk module
        } else {
            this.gateREAD_INTERLOCK.value = 1;
            this.gateSCTR_CYC.value = 0;
            switch (this.ioVariant) {
            case 0:     // read disk sectors WLRC
                this.readDiskSectors(false, true);
                break;
            case 1:     // check disk sectors WLRC
                this.readDiskSectors(true, true);
                break;
            case 2:     // read disk sectors No WLRC
                this.readDiskSectors(false, false);
                break;
            case 3:     // check disk sectors No WLRC
                this.readDiskSectors(true, false);
                break;
            case 4:     // read disk track WLRC
                this.readDiskTrack(true);
                break;
            case 5:     // check disk track WLRC
                this.checkDiskTrack(true);
                break;
            case 6:     // read disk track No WLRC
                this.readDiskTrack(false);
                break;
            case 7:     // check disk track No WLRC
                this.checkDiskTrack(false);
                break;
            default:
                // undefined operation -- just hang in Limbo
                break;
            }
        }
    }

    /**************************************/
    async writeDiskSectors(wlrc) {
        /* Writes one or more disk sectors to the currently selected disk module
        at the address specified by OR-1 for the number of sectors specified by
        PR-2 from the memory address specified by OR-2.
            wlrc: detect group marks and wrong-length records.
        Runs in Limbo, so restarts this.run() on completion */

        const loadSector = (finished, error, data) => {
            /* Callback function to send disk sector data from memory:
                finished: disk module has no more sectors to send (usually sector overflow)
                error: disk module detected a fatal error during write
                data: Uint8Array buffer holding the disk sector digits
            Returns false to indicate the disk module should continue writing
            sectors; returns true on error or after the sector count has been
            exhausted */
            let terminate = false;

            if (finished) {
                terminate = true;
            } else if (error) {
                terminate = true;
            } else {
                this.gateCHAR_GATE.value = 1;
                this.gateRESP_GATE.value = 0;
                for (let x=Processor.diskAddressSize; x<Processor.diskSectorSize; x+=2) {
                    this.regMAR.value = this.regOR2.value;
                    this.fetch();
                    const m1 = this.regMBR.even & Register.notParityMask;
                    const m2 = this.regMBR.odd & Register.notParityMask;
                    data[x] = m1;
                    data[x+1] = m2;
                    if (wlrc) {
                        if ((m1 & Register.bcdMask) == Envir.numGroupMark) {
                            terminate = true;
                            this.setIndicator(37, `Disk write WLRC group mark at ${x}`);
                        } else if ((m2 & Register.bcdMask) == Envir.numGroupMark) {
                            terminate = true;
                            this.setIndicator(37, `Disk write WLRC group mark at ${x+1}`);
                        }
                    }

                    this.envir.tick();
                    this.regOR2.incr(2);
                } // for x

                this.gateCHAR_GATE.value = 0;
                this.gateRESP_GATE.value = 1;
            }

            this.regOR1.incr(1);                                // increment sector address
            this.ioDevice.sectorAddr = this.regOR1.value;       // tell device what address should be
            if (this.regPR2.isZero) {
                terminate = true;
            } else {
                this.regPR2.decr(1);    // decrement count for next sector
                if (wlrc && !terminate) {
                    this.regMAR.value = this.regOR2.value;
                    this.fetch();
                    if ((this.regMBR.even & Register.bcdMask) == Envir.numGroupMark) {
                        terminate = true;
                        this.setIndicator(37, "Disk write early end-of-sector group mark in memory");
                    }
                }
            }

            return terminate;
        }; // loadSector

        this.regPR2.decr(1);            // decrement count for initial sector
        await this.ioDevice.writeSectors(loadSector);
        if (wlrc && this.regPR2.isZero) {
            this.regMAR.value = this.regOR2.value;
            this.fetch();
            if ((this.regMBR.even & Register.bcdMask) != Envir.numGroupMark) {
                this.setIndicator(37, "Disk write WLRC no memory group mark after end of write");
            }
        }

        this.ioExit();                  // exits Limbo state; will reset INSERT if it's set
        if (!this.gateMANUAL.value) {
            this.run();
        }
    }

    /**************************************/
    async writeDiskTrack(wlrc) {
        /* Writes one track of disk sectors to the currently selected disk module
        at the address specified by OR-1 to the memory address specified by OR-2.
            wlrc: detect group marks and wrong-length records.
        Runs in Limbo, so restarts this.run() on completion */
        let evenAddr = 0;               // even/odd half of memory digit pair

        const loadTrack = (finished, error, data) => {
            /* Callback function to receive disk sector data into memory:
                finished: disk module has no more sectors to send (usually sector overflow)
                error: disk module detected a fatal error during write
                data: Uint8Array buffer holding the disk sector digits
            Returns false to indicate the disk module should continue writing
            sectors; returns true on error */
            let terminate = false;

            if (finished) {
                terminate = true;
            } else if (error) {
                terminate = true;
            } else {
                this.gateCHAR_GATE.value = 1;
                this.gateRESP_GATE.value = 0;
                for (let x=0; x<Processor.diskSectorSize; ++x) {
                    evenAddr = 1-evenAddr;
                    if (evenAddr) {
                        this.regMAR.value = this.regOR2.value;
                        this.fetch();
                    }

                    const d = this.regMBR.getDigit(evenAddr);
                    data[x] = d;
                    if (wlrc) {
                        if ((d & Register.bcdMask) == Envir.numGroupMark) {
                            terminate = true;
                            this.setIndicator(37, `Disk writeTrack WLRC group mark at ${x}`);
                        }
                    }

                    if (!evenAddr) {
                        this.envir.tick();
                        this.regOR2.incr(2);
                    }
                } // for x

                this.gateCHAR_GATE.value = 0;
                this.gateRESP_GATE.value = 1;
            }

            this.regOR1.incr(1);                                // increment sector address
            this.ioDevice.sectorAddr = this.regOR1.value;       // tell device what address should be
            if (wlrc && !terminate) {
                if (!evenAddr) {        // if even address, digit is already in MBR
                    this.regMAR.value = this.regOR2.value;
                    this.fetch();
                }
                if ((this.regMBR.getDigit(evenAddr) & Register.bcdMask) == Envir.numGroupMark) {
                    terminate = true;
                    this.setIndicator(37, "Disk writeTrack early end-of-sector group mark in memory");
                }
            }

            return terminate;
        }; // loadTrack

        await this.ioDevice.writeTrack(loadTrack);
        if (wlrc) {
            this.regMAR.value = this.regOR2.value;
            this.fetch();
            if ((this.regMBR.even & Register.bcdMask) != Envir.numGroupMark) {
                this.setIndicator(37, "Disk writeTrack WLRC no memory group mark after end of write");
            }
        }

        this.ioExit();                  // exits Limbo state; will reset INSERT if it's set
        if (!this.gateMANUAL.value) {
            this.run();
        }
    }

    /**************************************/
    initiateDiskWrite() {
        /* Initiates a write operation to the disk drive. The individual write
        functions are defined as async, but we don't await them as, unlike other
        write operations, we are in Limbo state -- they will run asynchronously
        and restart the processor on completion */

        if (this.loadDiskControl()) {
            // Check Stop occurred during load of registers
        } else if (this.regOR2.isOdd) {
            this.checkStop(`Disk write buffer at odd address ${this.regOR2.binaryValue}`);
        } else if (!this.ioDevice.selectModule(this.ioDiskDriveCode, this.regOR1.value)) {
            this.gateWRITE_INTERLOCK.value = 1; // just hang on invalid disk module
        } else {
            this.gateWRITE_INTERLOCK.value = 1;
            this.gateSCTR_CYC.value = 0;
            switch (this.ioVariant) {
            case 0:     // write disk sectors WLRC
                if (this.ioDevice.writeAddress) {
                    return;             // just hang in Limbo
                } else {
                    this.writeDiskSectors(true);
                }
                break;
            case 2:     // write disk sectors No WLRC
                if (this.ioDevice.writeAddress) {
                    return;             // just hang in Limbo
                } else {
                    this.writeDiskSectors(false);
                }
                break;
            case 4:     // write disk track WLRC
                if (this.ioDevice.writeAddress) {
                    this.writeDiskTrack(true);
                } else {
                    return;             // just hang in Limbo
                }
                break;
            case 6:     // write disk track No WLRC
                if (this.ioDevice.writeAddress) {
                    this.writeDiskTrack(false);
                } else {
                    return;             // just hang in Limbo
                }
                break;
            default:
                // undefined operation -- just hang in Limbo
                break;
            }
        }
    }

    /**************************************/
    ioExit() {
        /* Releases and terminates an I/O operation, resetting state */

        if (this.gateRD.value || this.gateWR.value) {
            this.envir.startTiming();           // restart the emulation clock and timeslice
            if (this.ioReadCheckPending) {
                this.ioReadCheckPending = false;
                this.setIndicator(6, `I/O device ${this.ioSelectNr} Read Check`);
            } else if (this.ioWriteCheckPending) {
                this.ioWriteCheckPending = false;
                this.setIndicator(7, `I/O device ${this.ioSelectNr} Write Check`);
            }

            this.gateREL.value = 1;
            this.gateIO_FLAG.value = 0;         // not sure about this...
            this.gateRD.value = 0;
            this.gateWR.value = 0;
            this.gateCHAR_GATE.value = 0;
            this.gateRESP_GATE.value = 0;       // not sure about this, either...
            this.ioDevice?.release();
            this.ioDevice = null;
            this.ioSelectNr = 0;
            this.ioVariant = 0;
            this.gateTWPR_SELECT.value = 0;
            this.gateREAD_INTERLOCK.value = 0;
            this.gateWRITE_INTERLOCK.value = 0;
            this.gateINSERT.value = 0;
            this.enterICycle();
        }
    }


    /*******************************************************************
    *  Instruction Cycle                                               *
    *******************************************************************/

    /**************************************/
    testIndicator() {
        /* Tests the indicator specified by DR. Resets those indicators that
        get reset when tested. Returns the original status of the indicator */
        let isSet = 0;

        switch (this.regDR.binaryValue) {
        case  1:        // Program Switch 1
            isSet = this.program1Switch;
            break;
        case  2:        // Program Switch 2
            isSet = this.program2Switch;
            break;
        case  3:        // Program Switch 3
            isSet = this.program3Switch;
            break;
        case  4:        // Program Switch 4
            isSet = this.program4Switch;
            break;
        case  6:        // Read Check
            isSet = this.ioReadCheck.value;
            this.ioReadCheck.value = 0;
            break;
        case  7:        // Write Check
            isSet = this.ioWriteCheck.value;
            this.ioWriteCheck.value = 0;
            break;
        case  9:        // Last card (1622 read)
            isSet = this.gateLAST_CARD.value;
            this.gateLAST_CARD.value = 0;
            break;
        case 11:        // High-Positive (H/P)
            isSet = this.gateHP.value;
            break;
        case 12:        // Equal-Zero (E/Z)
            isSet = this.gateEZ.value;
            break;
        case 13:        // H/P or E/Z
            isSet = this.gateHP.value | this.gateEZ.value;
            break;
        case 14:        // Arithmetic Check
            isSet = this.oflowArithCheck.value;
            this.oflowArithCheck.value = 0;
            break;
        case 15:        // Exponent Check
            isSet = this.oflowExpCheck.value
            this.oflowExpCheck.value = 0;
            break;
        case 16:        // MBR-even Check
            isSet = this.parityMBREvenCheck.value;
            this.parityMBREvenCheck.value = 0;
            break;
        case 17:        // MBR-odd Check
            isSet = this.parityMBROddCheck.value;
            this.parityMBROddCheck.value = 0;
            break;
        case 19:        // Any Check (6, 7, 16, 17, 25, 39)
            isSet = this.ioReadCheck.value | this.ioWriteCheck.value |
                    this.parityMBREvenCheck.value | this.parityMBROddCheck.value |
                    this.ioPrinterCheck.value | this.diskAddrCheck.value |
                    this.diskWLRRBCCheck.value | this.diskCylOflowCheck.value;
            break;
        case 30:        // IX Band 0 (indexing off)
            isSet = ((this.gateIX_BAND_1.value | this.gateIX_BAND_2.value) ? 0 : 1);
            break;
        case 31:        // IX Band 1
            isSet = this.gateIX_BAND_1.value;
            break;
        case 32:        // IX Band 2
            isSet = this.gateIX_BAND_2.value;
            break;
        case 36:        // 1311 Address Check
            isSet = this.diskAddrCheck.value;
            this.diskAddrCheck.value = 0;
            break;
        case 37:        // 1311 Wrong-length Record / Read-back Check
            isSet = this.diskWLRRBCCheck.value;
            this.diskWLRRBCCheck.value = 0;
            break;
        case 38:        // 1311 Cylinder Overflow
            isSet = this.diskCylOflowCheck.value;
            this.diskCylOflowCheck.value = 0;
            break;
        case 39:        // 1311 Any Disk Error (36, 37, 38)
            isSet = this.diskAddrCheck.value | this.diskWLRRBCCheck.value | this.diskCylOflowCheck.value;
            break;
        case 25:        // 1443 Printer Check
            isSet = this.ioPrinterCheck.value;
            this.ioPrinterCheck.value = 0;      // ?? but not if it's a sync check ??
            break;
        case 33:        // 1443 Channel 9
            isSet = this.ioPrinterChannel9.value;
            this.ioPrinterChannel9.value = 0;   // also reset by sensing channel 1
            break;
        case 34:        // 1443 Channel 12
            isSet = this.ioPrinterChannel12.value;
            this.ioPrinterChannel12.value = 0;  // also reset by sensing channel 1
            break;
        case 35:        // 1443 Printer Busy
            isSet = this.ioPrinterBusy.value;
            break;
        }

        this.verifyCheckStop();
        return isSet;
    }

    /**************************************/
    enterICycle() {
        /* Initiates the start of the next instruction I-cycles */

        this.gateI_CYC_ENT.value = 1;
        this.resetICycle();
        this.exitAutomatic();
        this.gateRUN.value = 0;
        if (this.gateEZ.value) {
            this.gateHP.value = 0;
        }

        if (!(this.gateSAVE_CTRL.value || this.gateDISPLAY_MAR.value ||
                this.gateINSERT.value || this.gateCLR_MEM.value)) {
            this.gateDISK_OP.value = 0;         // ILD 10.00.30.1
            this.setProcState(procStateI1);
        }

        if (this.gateSTOP.value) {
            this.gateSTOP.value = 0;
            this.enterManual();
        }
    }

    /**************************************/
    resetICycle() {
        /* Resets processor state at the beginning of an I-Cycle,  */

        this.gate1ST_CYC.value = 0;
        this.gate1ST_CYC_DELAYD.value = 0;
        this.gate1ST_MPLY_CYCLE.value = 0;
        this.gate2_DIG_CNTRL.value = 0;
        this.gateADD_ENT.value = 0;
        this.gateADD_MODE.value = 0;
        this.gateCARRY_IN.value = 0;
        this.gateCARRY_OUT.value = 0;
        this.gateCOMP.value = 0;
        this.gateDIV_1_CYC.value = 0;
        this.gateDVD_L_CYC.value = 0;
        this.gateDVD_SIGN.value = 0;
        this.gateEXMIT_ENT.value = 0;
        this.gateEXMIT_MODE.value = 0;
        this.gateFIELD_MK_1.value = 0;
        this.gateFIELD_MK_2.value = 0;
        this.gateIX.value = 0;
        this.gateIX_EXEC.value = 0;
        this.gateLAST_LD_CYC.value = 0;
        this.gateMC_1.value = 0;
        this.gateMC_2.value = 0;
        this.gateP_COMP.value = 0;
        this.gateRECOMP.value = 0;
        this.resetDREven();
        this.resetDROdd();

        this.regMQ.clear();
        this.gateE_1.value = 0;
        this.gateE_2.value = 0;
        this.gateE_3.value = 0;
        this.gateE_4.value = 0;
        this.gateE_5.value = 0;
        this.gateIA_3.value = 0;
        this.gateI_2.value = 0;
        this.gateI_3.value = 0;
        this.gateI_4.value = 0;
        this.gateI_5.value = 0;

        this.gateEND_OF_MODULE.value = 0;
        this.gateREL.value = 0;
    }

    /**************************************/
    stepICycle1() {
        /* Executes I-Cycle 1. If the last instruction effected a branch, loads
        the next instruction using OR2 instead of IR1. Clears registers, sets
        P gate to process the P address, and loads the op code digits. As an
        optimization, converts the op code digits to binary and stores in
        this.opBinary for later use. If the op code is zero, initiates a stop.
        Steps to I-Cycle 2 */

        ++this.instructionCount;
        this.gateI_CYC_ENT.value = 0;
        this.enterAutomatic();
        if (this.gateBR_EXEC.value) {
            this.regIR1.value = this.regOR2.value;
            this.gateBR_EXEC.value = 0;
        }

        this.regMAR.value = this.regIR1.value;
        this.fetch();
        if (this.regMAR.value & 1) {
            this.marCheck(`I-1: instruction at odd MAR address ${this.regMAR.toBCDString()}`);
        }

        this.regOP.value = this.regMBR.value;
        this.gateP.value = 1;                   // now working on the P address
        this.regOR1.clear();
        this.regOR2.clear();
        this.regOR3.clear();
        this.regPR2.clear();
        this.regXBR.clear();
        this.regXR.clear();

        this.regIR1.incr(2);
        this.opBinary = this.regOP.binaryValue;
        if (this.regOP.invalidBCD) {
            console.log(`I-1: invalid opcode BCD ${this.regOP.toBCDString()} @${this.regMAR.toBCDString()}`);
            if (this.opAtts[this.opBinary] && this.opAtts[this.opBinary].opValid) {
                this.opBinary = 99;     // to be sure it's not been 8/9 coerced to a valid opcode
            }
        } else if (this.opBinary == 0) {
            // If the op code is 0, go immediately into MANUAL to halt at the
            // end of this cycle (see ILD 10.01.41.1). The state will advance to
            // I-2. If START is then pressed, this will cause a MAR check stop
            // in E-Cycle entry due to the invalid op code. Not sure the 1620-2
            // actually worked this way, but the result is what's expected.
            console.log(`I-1: invalid opcode 00 (special stop) @${this.regMAR.toBCDString()}`);
            this.exitAutomatic();
            this.enterManual();
        }

        this.opThisAtts = this.opAtts[this.opBinary];
        this.setProcState(procStateI2);
    }

    /**************************************/
    stepICycle2() {
        /* Executes I-Cycle 2. If the op code is 42 (BB), sets IR1 based on the
        SAVE gate and terminates the instruction to effect the branch. Otherwise,
        loads the P2/P3 digits to the MARS registers. Sets the 4-bit in XR from
        the P3 flag as necessary. Steps to I-Cycle 3 */

        this.opIndexable = this.opThisAtts.pIX &&
                (this.gateIX_BAND_1.value || this.gateIX_BAND_2.value);

        switch (this.opBinary) {
        case 42:                                // 42=BB, Branch Back
            // ?? MAR Check Stop if no prior BT instruction or SAVE control ?? Mod2 Ref p.38 vs Germain p.97
            if (this.gateSAVE.value) {
                this.gateSAVE.value = 0;
                this.regIR1.value = this.regMAR.value = this.regPR1.value;
            } else {
                this.regIR1.value = this.regMAR.value = this.regIR2.value;      // per Germain, p.97
            }
            this.enterICycle();
            break;

        default:                                // everything else
            this.regMAR.value = this.regIR1.value;
            this.fetch();
            let mbrEven = this.regMBR.even;
            let mbrOdd = this.regMBR.odd;

            this.regOR2.setDigit(4, mbrEven);
            this.regOR2.setDigit(3, mbrOdd);
            this.regOR3.setDigit(4, mbrEven);
            this.regOR3.setDigit(3, mbrOdd);
            this.regXBR.setDigit(4, mbrEven);
            this.regXBR.setDigit(3, mbrOdd);
            if (this.opIndexable && (mbrOdd & Register.flagMask)) {
                this.regXR.incr(4);
            }

            this.regIR1.incr(2);
            this.setProcState(procStateI3);
            break;
        }
    }

    /**************************************/
    stepICycle3() {
        /* Executes I-Cycle 3. Loads the P4, P5 digits to the MARS registers. Sets
        the 2- and 1-bits in XR from P4, P5 flags as necessary.
        Steps to I-Cycle 4 */

        this.regMAR.value = this.regIR1.value;
        this.fetch();
        let mbrEven = this.regMBR.even;
        let mbrOdd = this.regMBR.odd;

        this.regOR2.setDigit(2, mbrEven);
        this.regOR2.setDigit(1, mbrOdd);
        this.regOR3.setDigit(2, mbrEven);
        this.regOR3.setDigit(1, mbrOdd);
        this.regXBR.setDigit(2, mbrEven);
        this.regXBR.setDigit(1, mbrOdd);
        if (this.opIndexable) {
            if (mbrEven & Register.flagMask) {
                this.regXR.incr(2);
            }
            if (mbrOdd & Register.flagMask) {
                this.regXR.incr(1);
            }
        }

        this.regIR1.incr(2);
        this.setProcState(procStateI4);
    }

    /**************************************/
    stepICycle4() {
        /* Executes I-Cycle 4. Loads the P6 digit to the MARS registers. Stashes
        the Q7 digit in DR-even until the next cycle and clears DR-odd. Sets the
        IA latch from the P6 4-bit as necessary. Starts the chain of indexing
        and indirect address evaluation if needed. Note that if the op code is
        49 (B), BR_EXEC will be set and the instruction will terminate after any
        indexing or indirect address chaining takes place. Otherwise, will step
        to I-Cycle 5 (see exitAddressing) */

        this.regMAR.value = this.regIR1.value;
        this.fetch();
        let mbrEven = this.regMBR.even;
        let mbrOdd = this.regMBR.odd;

        this.regOR2.setDigit(0, mbrEven);
        this.regOR3.setDigit(0, mbrEven);
        this.regXBR.setDigit(0, mbrEven);
        this.resetDREven();
        this.setDREven(mbrOdd);
        this.resetDROdd();
        this.setDROdd(0);
        this.regPR1.clear();
        if ((mbrEven & Register.flagMask) &&
                this.opThisAtts.pIA && this.gateIA_SEL.value) {
            this.gateIA_REQ.value = 1;          // set the IA latch
        }

        this.regIR1.incr(2);
        if (this.regXR.isntZero) {
            this.enterIndexing();
        } else if (this.gateIA_REQ.value) {
            this.enterIndirecting();
        } else {
            this.exitAddressing();
        }
    }

    /**************************************/
    stepICycle5() {
        /* Executes I-Cycle 5. Resets the P gate to process the Q address and
        clears registers. Sets the 4- and 2-bits in XR from Q8, Q9 flags as
        necessary. For immediate ops and 60 (BS), does nothing else.
        For I/O, BI, BNI, BBT, BMK ops, only loads DR from Q8, Q9.
        For all other ops:
           - Shifts DR-even (with the stashed Q7 digit) to DR-odd and sets Q7
             in the MARS registers from that digit.
           - Loads the Q8, Q9 digits to the MARS registers */

        this.regMAR.value = this.regIR1.value;
        this.fetch();
        let mbrEven = this.regMBR.even;
        let mbrOdd = this.regMBR.odd;

        this.gateP.value = 0;                   // now working on the Q address
        this.gateIX.value = 0;
        this.regOR1.clear();
        this.regXBR.clear();                    // ??
        this.regXR.clear();
        this.regMQ.clear();
        this.opIndexable = this.opThisAtts.qIX &&
                (this.gateIX_BAND_1.value || this.gateIX_BAND_2.value);

        switch (this.opBinary) {
        case 34:        // K, Control I/O device
        case 35:        // DN, Dump Numerically
        case 36:        // RN, Read Numerically
        case 37:        // RA, Read Alphanumerically
        case 38:        // WN, Write Numerically
        case 39:        // WA, Write Alphanumerically
        case 46:        // BI, Branch Indicator
        case 47:        // BNI, Branch No Indicator
        case 90:        // BBT, Branch on Bit
        case 91:        // BMK, Branch on Mask
            // Set up DR for S/B decode, don't load OR1 for S/B ops.
            this.setDREven(this.regMBR.even);
            this.setDROdd(this.regMBR.odd);
            break;

        case 60:        // BS, Branch and Select
            break;                              // do nothing in I-5

        default:
            if (!this.opThisAtts.immed) {       // don't load OR-1 for immediate ops in I-5
                let drOdd = this.shiftDREvenOdd();
                this.regOR1.setDigit(4, drOdd);
                this.regOR1.setDigit(3, mbrEven);
                this.regOR1.setDigit(2, mbrOdd);
                this.regXBR.setDigit(4, drOdd);
                this.regXBR.setDigit(3, mbrEven);
                this.regXBR.setDigit(2, mbrOdd);
            }
            break;
        }

        if (this.opIndexable) {
            if (mbrEven & Register.flagMask) {
                this.regXR.incr(4);
            }
            if (mbrOdd & Register.flagMask) {
                this.regXR.incr(2);
            }
        }

        this.regIR1.incr(2);
        this.setProcState(procStateI6);
    }

    /**************************************/
    stepICycle6() {
        /* Executes I-Cycle 6.
        Sets the 1-bit in XR from the Q10 flag and the IA latch from the Q11
        flag as necessary. Takes the following special actions:
          - For immediate ops, sets OR1 to the address of the Q11 digit.
          - For op 41 (NOP), terminates the instruction.
          - For op 48 (H), terminates the instruction and initiates a stop.
          - For ops 46 (BI) & 47 (BNI), evaluates the selected indicator and
            terminates the instruction, initiating a branch if necessary.
          - For op 60 (BS), terminates the instruction, initiates a branch, and
            sets the indexing or indirect addressing modes as necessary.
          - For ops 7 (BTFL), 17 (BTM), 27 (BT), clears IR2.
          - For all other ops, sets Q10, Q11 in the MARS registers.
        If the instruction has not been terminated, starts the chain of indexing
        and indirect address evaluation if needed. At the end of that chain will
        enter the E-Cycles to execute the instruction (see exitAddressing) */

        this.regMAR.value = this.regIR1.value;
        this.fetch();
        let mbrEven = this.regMBR.even;
        let mbrOdd = this.regMBR.odd;

        switch (this.opBinary) {
        case 34:        // K, Control I/O device [handled in exitAddressing()]
            this.gateWR.value = 1;
            this.ioSelect(this.regDR.binaryValue, this.regMBR.value);
            break;
        case 36:        // RN, Read Numerically
        case 37:        // RA, Read Alphanumerically
            this.gateRD.value = 1;
            this.ioSelect(this.regDR.binaryValue, this.regMBR.value);
            break;
        case 35:        // DN, Dump Numerically
        case 38:        // WN, Write Numerically
        case 39:        // WA, Write Alphanumerically
            this.gateWR.value = 1;
            this.ioSelect(this.regDR.binaryValue, this.regMBR.value);
            break;

        case 46:        // BI, Branch Indicator
            if (this.testIndicator()) {
                this.gateBR_EXEC.value = 1;
            }
            break;

        case 47:        // BNI, Branch No Indicator
            if (!this.testIndicator()) {
                this.gateBR_EXEC.value = 1;
            }
            break;

        case 60:        // Branch and Select - set indexing and indirect addressing modes
            switch (mbrOdd & Register.bcdMask) {
            case 0:     // turn off indexing
            case 1:     // set index Band 1
            case 2:     // set index Band 2
                if (this.xrInstalled) {
                    this.gateIX_BAND_1.value = mbrOdd & 1;
                    this.gateIX_BAND_2.value = mbrOdd & 2;
                }
                break;
            case 8:     // turn off indirect addressing
            case 9:     // turn on indirect addressing
                this.gateIA_SEL.value = mbrOdd & 1;
                break;
            }
            this.gateBR_EXEC.value = 1;
            break;

        case  7:        // BTFL, Branch and Transmit Floating
        case 10:        // BTAM, Branch and Transmit Address Immediate
        case 17:        // BTM, Branch and Transmit Immediaate
        case 20:        // BTA, Branch and Transmit Address
        case 27:        // BT, Branch and Transmit
            this.regIR2.value = this.regIR1.value;
            this.regIR2.incr(2);                // address of next instruction for return
            //--no break
        default:
            if (this.opThisAtts.immed) {        // set OR-1 to Q11 addr for immediate ops
                this.regOR1.value = this.regMAR.value |= 1;
            } else {
                this.regOR1.setDigit(1, mbrEven);
                this.regOR1.setDigit(0, mbrOdd);
                this.regXBR.setDigit(1, mbrEven);
                this.regXBR.setDigit(0, mbrOdd);
            }
            break;
        }

        if (this.opIndexable && (mbrEven & Register.flagMask)) {
            this.regXR.incr(1);
        }

        if ((mbrOdd & Register.flagMask) &&
                this.opThisAtts.qIA && this.gateIA_SEL.value) {
            this.gateIA_REQ.value = 1;          // set the IA latch
        }

        this.regIR1.incr(2);
        if (this.regXR.isntZero) {
            this.enterIndexing();
        } else if (this.gateIA_REQ.value) {
            this.enterIndirecting();
        } else {
            this.exitAddressing();
        }
    }

    /**************************************/
    enterIndexing() {
        /* Initiates the process for indexing an address register */

        this.gateIX_ENT.value = 1;
        this.gateIA_ENT.value = 0;
        this.gateIA_3.value = 0;
        this.regPR2.clear();
        this.regMQ.clear();
        if (this.gateP.value) {
            this.regOR2.clear();
            this.regOR3.clear();
        } else {
            this.regOR1.clear();
        }

        this.gateIX.value = 1;
        this.regMAR.binaryValue = this.gateIX_BAND_2.value*40 + this.regXR.binaryValue*5 + 304;
        this.setProcState(procStateIX);
    }

    /**************************************/
    stepIndexing() {
        /* Executes the steps for indexing an address register. On the first
        call, the address of the index register digit is in MAR; subsequently it
        is in PR-2. Note that the base address to be indexed is already in XBR
        from state I-4 or I-6. Also note that if the resulting address is
        negative, it is left in complement form */
        let addend = 0;                 // local copy of DR-odd
        let mq = 0;                     // local copy of MQ

        if (this.gateIX_ENT.value) {
            this.gateIX_ENT.value = 0;
            this.fetch();               // first IX cycle: MAR was initially set in enterIndexing()
            addend = this.regMBR.getDigit(this.regMAR.isEven);
            this.gateCOMP.value = this.gateCARRY_IN.value = addend & Register.flagMask;
        } else {
            this.regMAR.value = this.regPR2.value;
            this.fetch();               // non-first IX cycle: use address in PR2
            addend = this.regMBR.getDigit(this.regMAR.isEven);
            this.regMQ.incr(1);         // use MQ as the digit counter
            mq = this.regMQ.binaryValue;
        }

        // Compute the sum of the address and index register digits, propagating any carry.
        this.setDROdd(this.regXBR.getDigit(mq));
        let sum = this.addDigits(addend);       // leaves the sum in DR odd
        this.gateCARRY_IN.value = this.gateCARRY_OUT.value;
        this.regXBR.setDigit(mq, sum);
        if (mq < 4) {                   // if there are more digits, decrement PR2
            this.regPR2.value = this.regMAR.value;
            this.regPR2.decr(1);
        } else {                        // otherwise, set the appropriate address registers and finish
            if (this.gateP.value) {
                this.regOR2.value = this.regOR3.value = this.regMAR.value = this.regXBR.value;
            } else {
                this.regOR1.value = this.regMAR.value = this.regXBR.value;
            }

            if (this.gateIA_REQ.value) {
                this.enterIndirecting();
            } else {
                this.exitAddressing();
            }
        }
    }

    /**************************************/
    enterIndirecting() {
        /* Initiates the process for indirect addressing in a register */

        this.gateIA_ENT.value = 1;
        this.setProcState(procStateIA1);
    }

    /**************************************/
    stepIndirecting1() {
        /* Handles the indirect addressing IA-1 state */

        this.gateIA_ENT.value = 0;      // (not sure this is correct: it resets at T603)
        this.gateIX.value = 0;
        this.regXR.clear();
        if (this.gateP.value) {         // set PR-2 to step thru the indirect address
            this.regMAR.value = this.regPR2.value = this.regOR2.value;
        } else {
            this.regMAR.value = this.regPR2.value = this.regOR1.value;
        }

        this.fetch();
        let mbrEven = this.regMBR.even;
        if (this.regMAR.isOdd) {
            let mbrOdd = this.regMBR.odd;
            this.regXBR.setDigit(0, mbrOdd);
            this.regXBR.setDigit(1, mbrEven);
            this.gateIA_REQ.value = mbrOdd & Register.flagMask;
            if (this.opIndexable && (mbrEven & Register.flagMask)) {
                this.regXR.incr(1);
            }
        } else {
            this.regXBR.setDigit(0, mbrEven);
            this.gateIA_REQ.value = mbrEven & Register.flagMask;
        }

        if (this.gateP.value) {
            this.regOR2.value = this.regOR3.value = this.regXBR.value;
        } else {
            this.regOR1.value = this.regXBR.value;
        }

        this.regPR2.decr(2);
        this.setProcState(procStateIA2);
    }

    /**************************************/
    stepIndirecting2() {
        /* Handles the indirect addressing IA-2 state */

        this.regMAR.value = this.regPR2.value;
        this.fetch();
        let mbrEven = this.regMBR.even;
        let mbrOdd = this.regMBR.odd;
        if (this.regMAR.isOdd) {
            this.regXBR.setDigit(2, mbrOdd);
            this.regXBR.setDigit(3, mbrEven);
            if (this.opIndexable) {
                if (mbrOdd & Register.flagMask) {
                    this.regXR.incr(2);
                }
                if (mbrEven & Register.flagMask) {
                    this.regXR.incr(4);
                }
            }
        } else {
            this.regXBR.setDigit(1, mbrOdd);
            this.regXBR.setDigit(2, mbrEven);
            if (this.opIndexable) {
                if (mbrOdd & Register.flagMask) {
                    this.regXR.incr(1);
                }
                if (mbrEven & Register.flagMask) {
                    this.regXR.incr(2);
                }
            }
        }

        if (this.gateP.value) {
            this.regOR2.value = this.regOR3.value = this.regXBR.value;
        } else {
            this.regOR1.value = this.regXBR.value;
        }

        this.regPR2.decr(2);
        this.setProcState(procStateIA3);
    }

    /**************************************/
    stepIndirecting3() {
        /* Handles the indirect addressing IA-3 state */

        this.regMAR.value = this.regPR2.value;
        this.fetch();
        let mbrOdd = this.regMBR.odd;
        if (this.regMAR.isOdd) {
            this.regXBR.setDigit(4, mbrOdd);
        } else {
            let mbrEven = this.regMBR.even;
            this.regXBR.setDigit(3, mbrOdd);
            this.regXBR.setDigit(4, mbrEven);
            if (this.opIndexable && (mbrOdd & Register.flagMask)) {
                this.regXR.incr(4);
            }
        }

        if (this.gateP.value) {
            this.regOR2.value = this.regOR3.value = this.regMAR.value = this.regXBR.value;
        } else {
            this.regOR1.value = this.regMAR.value = this.regXBR.value;
        }

        if (this.regXR.isntZero) {
            this.enterIndexing();
        } else if (this.gateIA_REQ.value) {
            this.enterIndirecting();
        } else {
            this.exitAddressing();
        }
    }

    /**************************************/
    exitAddressing() {
        /* Handles the details of state advancement and the end of setting up
        the P or Q addresses */

        if (this.gateP.value) {         // finish with P address
            if (this.opBinary == 49) {  // 49 = Branch (B) early exit
                this.gateBR_EXEC.value = 1;
                this.enterICycle();
            } else {
                this.setProcState(procStateI5);
            }
        } else {                        // finish with Q address
            switch(this.opBinary) {
            case 34:    // K, Control
                if (!this.ioDevice) {
                    this.enterLimbo();
                    this.gateWRITE_INTERLOCK.value = 1;
                } else {
                    switch (this.ioSelectNr) {
                    case 1:     // Typewriter
                        this.enterLimbo();      // stop run() while control() runs async
                        this.ioDevice.control(this.ioVariant).then(() => {
                            this.ioExit();
                            if (!this.gateMANUAL.value) {
                                this.run();     // exit Limbo state
                            }
                        });
                        break;
                    case 7:     // Disk Drive
                        this.initiateDiskControl();
                        this.ioExit();
                        break;
                    default:
                        this.gateWRITE_INTERLOCK.value = 1;
                        this.enterLimbo();      // just hang on an undefined device
                        break;
                    }
                }
                break;
            case 36:    // RN, Read Numerically
            case 37:    // RA, Read Alphanumerically
                if (!this.ioDevice) {
                    this.gateREAD_INTERLOCK.value = 1;
                    this.enterLimbo();
                } else {
                    switch (this.ioSelectNr) {
                    case 1:     // Typewriter
                        this.enterLimbo(this.ioDevice, this.ioDevice.initiateRead);
                        break;
                    case 3:     // Paper Tape Reader
                    case 5:     // Card Reader
                        this.gateREAD_INTERLOCK.value = 1;
                        this.enterLimbo(this.ioDevice, this.ioDevice.initiateRead);
                        break;
                    case 7:     // Disk Drive
                        if (this.opBinary == 36) {      // disk reads only numerically
                            this.enterLimbo(this, this.initiateDiskRead);
                        } else {
                            this.gateREAD_INTERLOCK.value = 1;
                            this.enterLimbo();          // just hang if not Read Numerically
                        }
                        break;
                    default:
                        this.gateREAD_INTERLOCK.value = 1;
                        this.enterLimbo();              // just hang on an undefined device
                    }
                }
                break;
            case 35:    // DN, Dump Numerically
            case 38:    // WN, Write Numerically
            case 39:    // WA, Write Alphabetically
                if (!this.ioDevice) {
                    this.gateWRITE_INTERLOCK.value = 1;
                    this.enterLimbo();
                } else {
                    this.setProcState(procStateE2);     // no E-cycle entry for I/O
                    switch (this.ioSelectNr) {
                    case 1:     // Typewriter
                        this.ioDevice.initiateWrite();
                        break;
                    case 4:     // Card Punch
                    case 9:     // Printer
                        this.gateWRITE_INTERLOCK.value = 1;
                        this.ioDevice.initiateWrite();
                        break;
                    case 7:     // Disk Drive
                        if (this.opBinary == 38) {
                            this.enterLimbo(this, this.initiateDiskWrite);
                        } else {
                            this.gateWRITE_INTERLOCK.value = 1;
                            this.enterLimbo();          // just hang if not Write Numerically
                        }
                        break;
                    default:
                        this.gateWRITE_INTERLOCK.value = 1;
                        this.enterLimbo();              // just hang on an undefined device
                        break;
                    }
                }
                break;
            case 41:    // NOP, No Operation
            case 46:    // BI, Branch Indicator
            case 47:    // BNI, Branch No Indicator
            case 60:    // BS, Branch and Select
                this.enterICycle();
                break;
            case 48:    // H, Halt
                this.enterICycle();
                this.enterManual();
                break;
            default:
                this.enterECycle();
                break;
            }
        }
    }


    /*******************************************************************
    *  Execution Cycle                                                 *
    *******************************************************************/

    /**************************************/
    enterECycle() {
        /* Initiates the start of the current instruction E-cycles */

        this.gateE_CYC_ENT.value = 1;
        this.gateIX.value = 0;
        this.regMQ.clear();

        if (!this.opThisAtts.opValid) {
            this.marCheck(`E-Cyc-Ent: invalid op code ${this.regOP.toBCDString()} @${this.regIR1.binaryValue-12}`);
            return;
        }

        let initialEState = this.opThisAtts.eState;
        switch (this.opBinary) {
        case  6:        // TFL - Transmit Floating
        case  7:        // BTFL - Branch and Transmit Floating
        case 10:        // BTA - Branch and Transmit
        case 15:        // TDM - Transmit Digit Immediate
        case 16:        // TFM - Transmit Field Immediate
        case 17:        // BTM - Branch and Transmit Immediate
        case 20:        // BTAM - Branch and Transmit Immediate
        case 25:        // TD - Transmit Digit
        case 26:        // TF - Transmit Field
        case 27:        // BT - Branch and Transmit
        case 30:        // TRNM - Transmit Record No Record Mark
        case 31:        // TR - Transmit Record
            this.gateEXMIT_ENT.value = 1;
            break;

        case 12:        // SM - Subtract Immediate
        case 14:        // CM - Compare Immediate
        case 22:        // S - Subtract
        case 24:        // C - Compare
            this.gateCOMP.value = 1;
            //--no break
        case 11:        // AM - Add Immediate
        case 21:        // A - Add
            this.gateADD_ENT.value = 1;
            break;

        case 13:        // MM - Multiply Immediate
        case 23:        // M - Multiply
            this.gate1ST_CYC.value = 1;
            this.gateEZ.value = 1;
            this.gateHP.value = 1;
            break;

        case 18:        // LDM - Load Dividend Immediate
        case 28:        // LD - Load Dividend
        case 72:        // TNS - Transmit Numeric Strip
        case 73:        // TNF - Transmit Numeric Fill
            this.gate1ST_CYC.value = 1;
            break;

        case 19:        // DM - Divide Immediate
        case 29:        // D - Divide
            this.gateDIV_1_CYC.value = 1;
            this.enterAdd();            // DO NOT set ADD_ENT for first cycle
            this.gateCOMP.value = 1;
            break;
        }

        if (initialEState) {
            this.setProcState(procStateE1 - 1 + initialEState);
        } else {
            this.checkStop(`Unimplemented op code=${this.opBinary}`);
        }
    }

    /**************************************/
    enterAdd() {
        /* Sets up execution for the add-like ops: A, AM, S, SM, C, CM */

        this.gate1ST_CYC.value = 1;
        this.gateEZ.value = 1;
        this.gateHP.value = 1;
        this.gateADD_MODE.value = 1;
        this.gateFIELD_MK_1.value = 0;
        this.gateFIELD_MK_2.value = 0;

        switch (this.opBinary) {
        case 12:        // Subtract Immediate, SM
        case 14:        // Compare Immediate, CM
        case 22:        // Subtract, S
        case 24:        // Compare, C
            this.gateCOMP.value = 1;
            break;
        }
    }

    /**************************************/
    enterTransmit() {
        /* Sets up execution for the transmit-like ops: TF, TFM, TD, TDM, TR,
        TRNM, ADD, SUB */

        // ?? reset false xmit entry ??
        // ?? reset LD clear exit ??
        // ?? reset P scan to result xmit ??
        this.gateEXMIT_MODE.value = 1;
        this.gate1ST_CYC.value = 1;
        this.gateEXMIT_ENT.value = 0;
        this.gateFIELD_MK_1.value = 0;
        this.gateFIELD_MK_2.value = 0;
        this.gateRECOMP.value = 0;
    }

    /**************************************/
    stepECycle1() {
        /* Executes E-Cycle 1 - processes data at the OR1 (Q) address */
        let digit = 0;
        let dx = this.regOR1.isEven;    // digit index: 0/1

        switch (this.opBinary) {
        case 19:        // DM - Divide Immediate
        case 29:        // D - Divide
            break;              // fetch done below
        default:
            this.regMAR.value = this.regOR1.value;
            this.fetch();
            break;
        }

        switch (this.opBinary) {
        case  6:        // TFL - Transmit Floating
        case 15:        // TDM - Transmit Digit Immediate
        case 16:        // TFM - Transmit Field Immediate
        case 18:        // LDM - Load Dividend Immediate
        case 25:        // TD - Transmit Digit
        case 26:        // TF - Transmit Field
        case 28:        // LD - Load Dividend
            if (this.gateE_CYC_ENT.value) {
                this.enterTransmit();
            }
            //--no break
        case  7:        // BTFL - Branch and Transmit Floating
        case 10:        // BTA - Branch and Transmit
        case 17:        // BTM - Branch and Transmit Immediate
        case 20:        // BTAM - Branch and Transmit Immediate
        case 27:        // BT - Branch and Transmit
            this.setDREven(this.regMBR.even);
            if (dx) {                   // MAR is even
                this.regOR1.decr(1);
            } else {                    // MAR is odd
                this.gate2_DIG_CNTRL.value = 1;
                this.setDROdd(this.regMBR.odd);
                this.regOR1.decr(2);
            }
            this.setProcState(procStateE2);
            break;

        case 11:        // AM - Add Immediate
        case 12:        // SM - Subtract Immediate
        case 14:        // CM - Compare Immediate
        case 21:        // A - Add
        case 22:        // S - Subtract
        case 24:        // C - Compare
            digit = this.regMBR.getDigit(dx);
            if (this.gateADD_ENT.value) {
                this.enterAdd();
                this.gateADD_ENT.value = 0;
                // If the low-order Q digit is flagged, reverse COMP, CARRY_IN
                if (digit & Register.flagMask) {
                    this.gateCOMP.flip();
                    this.gateCARRY_IN.value = this.gateCOMP.value;
                }
            }

            this.resetDROdd();
            this.setDREven(this.regMBR.even);
            if (dx) {                   // MAR is even
                this.regOR1.decr(1);
            } else {                    // MAR is odd
                this.gate2_DIG_CNTRL.value = 1;
                this.setDROdd(digit);
                this.regOR1.decr(2);
            }
            this.setProcState(procStateE2);
            break;

        case 13:        // MM - Multiply Immediate
        case 23:        // M - Multiply
            // Fetch multiplier digit to MQ, determine multiplier sign.
            this.gate1ST_MPLY_CYCLE.value = 1;
            this.gateMC_1.value = 0;                    // reset carry propagation flags
            this.gateMC_2.value = 0;
            digit = this.regMBR.getDigit(dx);
            this.resetDROdd();
            this.setDREven(0);                          // per ILD, but not clear what should be set ??
            if (digit & Register.flagMask) {
                if (this.gate1ST_CYC.value) {
                    this.gateHP.flip();                 // multiplier sign from low-order digit
                } else {
                    this.gateFIELD_MK_1.value = 1;      // last multiplier digit
                }
            }

            this.regMQ.value = digit;
            this.gateFIELD_MK_2.value = 0;
            this.regOR1.decr(1);
            this.setProcState(procStateE3);
            break;

        case 19:        // DM - Divide Immediate
        case 29:        // D - Divide
            if (this.gateADD_ENT.value) {               // not set initially
                this.gate1ST_CYC.value = 1;
                this.gateADD_MODE.value = 1;
                this.gateFIELD_MK_1.value = 0;
                this.gateFIELD_MK_2.value = 0;
                this.gateCOMP.value = this.gateCARRY_OUT.value;
                this.gateADD_ENT.value = 0;
            }

            if (this.gate1ST_CYC.value) {
                this.regMAR.value = this.regPR1.value = this.regOR1.value;
            } else {
                this.regMAR.value = this.regPR1.value;
            }

            this.fetch();

            this.resetDROdd();
            this.setDREven(this.regMBR.even);
            if (this.regMAR.isEven) {
                this.regPR1.decr(1);
            } else {                    // MAR is odd
                this.gate2_DIG_CNTRL.value = 1;
                this.setDROdd(this.regMBR.odd);
                this.regPR1.decr(2);
            }
            this.setProcState(procStateE2);
            break;

        case 30:        // TRNM - Transmit Record No Record Mark
        case 31:        // TR - Transmit Record
            if (this.gateE_CYC_ENT.value) {
                this.enterTransmit();
            }

            this.setDREven(this.regMBR.odd);
            if (!dx) {                  // MAR is odd
                this.regOR1.incr(1);
            } else {                    // MAR is even
                this.gate2_DIG_CNTRL.value = 1;
                this.setDROdd(this.regMBR.even);
                this.regOR1.incr(2);
            }
            this.setProcState(procStateE2);
            break;

        case 43:        // BD - Branch on Digit (!= zero)
            if (this.regMBR.getDigit(dx) & Register.bcdMask) {
                this.gateBR_EXEC.value = 1;
            }
            this.enterICycle();
            break;

        case 44:        // BNF - Branch No Flag
            if (!(this.regMBR.getDigit(dx) & Register.flagMask)) {
                this.gateBR_EXEC.value = 1;
            }
            this.enterICycle();
            break;

        case 45:        // BNR - Branch No Record Mark
            if ((this.regMBR.getDigit(dx) & Envir.numRecMark) != Envir.numRecMark) {
                this.gateBR_EXEC.value = 1;
            }
            this.enterICycle();
            break;

        case 55:        // BNG - Branch No Group Mark
            if ((this.regMBR.getDigit(dx) & Register.bcdMask) != Envir.numGroupMark) {
                this.gateBR_EXEC.value = 1;
            }
            this.enterICycle();
            break;

        case 71:        // MF - Move Flag
            digit = this.regMBR.getDigit(dx);
            if (digit & Register.flagMask) {
                this.gateFIELD_MK_1.value = 1;
                this.regMIR.setDigitFlag(dx, 0);
                this.store();
            }
            this.regOR1.decr(1);
            this.setProcState(procStateE2);
            break;

        case 72:        // TNS - Tranmit Numeric Strip
            digit = this.regMBR.getDigit(dx);
            if ((digit & Register.flagMask) && !this.gate1ST_CYC_DELAYD.value) {
                this.gateFIELD_MK_1.value = 1;
                this.regMIR.setDigit(dx, this.regDR.odd | Register.flagMask);
                this.enterICycle();
            } else {
                this.regMIR.setDigit(dx, this.getDROdd());
                this.setProcState(procStateE2);
            }

            this.gate1ST_CYC.value = 0;
            this.store();
            this.regOR1.decr(1);
            break;

        case 73:        // TNF - Transmit Numeric Fill
            digit = this.regMBR.getDigit(dx);
            this.setDROdd(digit);
            if (this.gate1ST_CYC.value) {
                this.gateFIELD_MK_1.value = 0;
                if (digit & Register.flagMask) {
                    this.gateFIELD_MK_2.value = 1;
                }
            } else {
                this.gateFIELD_MK_2.value = 0;
                if (digit & Register.flagMask) {
                    this.gateFIELD_MK_1.value = 1;
                }
            }

            this.regOR1.decr(1);
            this.setProcState(procStateE2);
            break;

        default:
            this.panic(`E-1 op not implemented ${this.opBinary}`);
            break;
        }

        this.gateE_CYC_ENT.value = 0;
    }

    /**************************************/
    async stepECycle2() {
        /* Executes E-Cycle 2 - processes data at the OR2 (P) address */
        let digit = 0;
        let dx = this.regOR2.isEven;    // digit index: 0/1
        let nextState = 0;

        const op = this.opBinary;
        switch (op) {
        case 13:        // MM - Multiply Immediate
        case 18:        // LDM - Load Dividend Immediate
        case 19:        // DM - Divide Immediate
        case 23:        // M - Multiply
        case 28:        // LD - Load Dividend
        case 29:        // D - Divide
            break;              // fetch done below
        default:
            this.regMAR.value = this.regOR2.value;
            this.fetch();
        }

        if (this.gate1ST_CYC.value) {
            this.gate1ST_CYC.value = 0;
            this.gate1ST_CYC_DELAYD.value = 1;
        } else if (this.gate1ST_CYC_DELAYD.value) {
            this.gate1ST_CYC_DELAYD.value = 0;
        }

        switch (op) {
        case 15:        // TDM - Transmit Digit Immediate
        case 25:        // TD - Transmit Digit
            if (this.gate2_DIG_CNTRL.value) {
                digit = this.getDROdd();
            } else {
                digit = this.shiftDREvenOdd();
            }

            this.regMIR.setDigit(dx, digit);
            this.store();
            this.regOR2.decr(1);
            this.enterICycle();
            break;

        case  7:        // BTFL - Branch and Transmit Floating
        case 10:        // BTA - Branch and Transmit
        case 17:        // BTM - Branch and Transmit Immediate
        case 20:        // BTAM - Branch and Transmit Immediate
        case 27:        // BT - Branch and Transmit
            if (!this.gateEXMIT_MODE.value) {   // first BT E-cycle only
                this.regIR1.value = this.regOR2.value;  // branch address
                this.regOR2.decr(1);                    // starting xmit dest address
                this.enterTransmit();
                this.setProcState(procStateE1);
                break;  // out of switch -- NOTE this only occurs for first cycle
            }
            //--no break
        case  6:        // TFL - Transmit Floating
        case 16:        // TFM - Transmit Field Immediate
        case 26:        // TF - Transmit Field
            if (this.gate2_DIG_CNTRL.value) {
                this.gate2_DIG_CNTRL.value = 0;
                digit = this.getDROdd();
            } else {
                digit = this.shiftDREvenOdd();
                nextState = procStateE1;
            }

            this.regMIR.setDigit(dx, digit);
            this.store();
            this.regOR2.decr(1);

            if (((op == 6 || op == 7) && this.regMQ.value < 3) ||       // 3+ digit FP field
                    ((op == 10 || op == 20) && this.regMQ.value < 4)) { // 5+ digit address field
                this.regMQ.incr(1);
                if (nextState) {
                    this.setProcState(nextState);
                }
            } else if (this.gateFL_1.value && !this.gate1ST_CYC_DELAYD.value) {
                this.gateFIELD_MK_1.value = 1;
                this.enterICycle();
            } else if (nextState) {     // do either E1 or continue with E2
                this.setProcState(nextState);
            }
            break;

        case 11:        // AM - Add Immediate
        case 12:        // SM - Subtract Immediate
        case 14:        // CM - Compare Immediate
        case 21:        // A - Add
        case 22:        // S - Subtract
        case 24:        // C - Compare
            this.gateCARRY_OUT.value = 0;
            digit = this.regMBR.getDigit(dx);

            if (this.gate2_DIG_CNTRL.value) {
                this.gate2_DIG_CNTRL.value = 0;
            } else {
                this.shiftDREvenOdd();
                if (!this.gateRECOMP.value) {
                    nextState = procStateE1;
                }
            }

            if (this.gate1ST_CYC_DELAYD.value) {
                // The following tests are conditioned on 1ST_CYC in the ILD, but we just
                // turned that off above when turning on 1ST_CYC_DELAYD, so sameo-sameo.
                if (this.gateCOMP.value) {
                    this.gateCARRY_IN.value = 1;        // pre-set carry if subtract
                }

                if (this.gateRECOMP.value) {
                    // Set up initial conditions for the RECOMP phase.
                    this.gateCARRY_IN.value = 1;
                    this.gateCOMP.value = 0;
                    this.gateFIELD_MK_2.value = 0;
                    this.gateP_COMP.value = 1;
                    // We need to redo the E2 fetch and start with the low-order P digit.
                    this.regOR2.value = this.regMAR.value = this.regOR3.value;
                    dx = this.regOR2.isEven;
                    this.fetch();
                    digit = this.regMBR.getDigit(dx);
                } else {
                    // If not RECOMP and the low-order P digit is flagged, reverse COMP, CARRY_IN, HP
                    if (digit & Register.flagMask) {
                        this.gateCOMP.flip();
                        this.gateCARRY_IN.value = this.gateCOMP.value;
                        this.gateHP.flip();
                    }
                }
            } else {
                if (this.gateFL_1.value) {
                    this.gateFIELD_MK_1.value = 1;      // end of Q field
                }

                if (digit & Register.flagMask) {
                    this.gateFIELD_MK_2.value = 1;      // end of P field
                }
            }

            if (this.gateFIELD_MK_1.value) {
                this.resetDREven();
                this.setDREven(0);                      // addend will be zero from here on...
                nextState = 0;                          // no more E1 cycles -- E2 only
            }

            digit = this.addDigits(digit);
            if (digit) {
                this.gateEZ.value = 0;
            }

            this.gateCARRY_IN.value = this.gateCARRY_OUT.value;
            this.regOR2.decr(1);                        // update OR1 before chance of early exits

            if (op % 10 == 4) {                 // doing Compare
                // Check for compare early exit: sum or Q digit != 0.
                if ((digit || (this.regDR.odd && Register.bcdMask)) && !this.gateCOMP.value) {
                    this.gateEZ.value = 0;
                    this.enterICycle();                 // early exit to I-Cycle entry
                    return;
                }
            } else {                                    // not doing Compare
                if (this.gateFIELD_MK_2.value || (this.gate1ST_CYC_DELAYD.value && !this.gateHP.value)) {
                    digit |= Register.flagMask;         // low-order P digit sign or high-order P digit flag
                }
                this.regMIR.setDigit(dx, digit);
                this.store();
            }

            if (this.gateFIELD_MK_2.value) {
                // Check for overflow.
                if (!this.gateFIELD_MK_1.value ||
                        (this.gateCARRY_OUT.value && !this.gateCOMP.value && op % 10 != 4)) {
                    this.setIndicator(14, `A/S/C Arithmetic overflow: op=${op}, IR1=${this.regIR1.binaryValue-12}`);
                }

                // Check for initiation of RECOMP phase.
                if (this.gateCOMP.value && !this.gateCARRY_OUT.value) {
                    this.gateRECOMP.value = 1;
                    this.gate1ST_CYC.value = 1;
                    this.gateHP.flip();
                }

                // Check for end of add operation: COMP&CARRY | !COMP | Compare.
                if ((this.gateCOMP.value ? this.gateCARRY_OUT.value : 1) || op % 10 == 4) {
                    this.enterICycle();                 // exit to I-Cycle entry
                    return;
                }
            }

            if (nextState) {     // do either E1 or continue with E2
                this.setProcState(nextState);
            }
            break;

        case 13:        // MM - Multiply Immediate
        case 23:        // M - Multiply
            if (this.gate1ST_MPLY_CYCLE.value) {        // ILD has this as 1ST_CYC, but that can't be right
                this.gate1ST_MPLY_CYCLE.value = 0;
                this.regMAR.value = this.regPR1.value;
                this.regPR1.decr(1);
            } else {
                this.regMAR.value = this.regPR2.value
            }

            this.fetch();
            dx = this.regMAR.isEven;            // digit index
            digit = this.regMBR.getDigit(dx);
            if (this.gate2_DIG_CNTRL.value) {   // first E-2 cycle
                this.regPR2.value = this.regMAR.value;
                this.regPR2.decr(1);            // next product digit
                this.gateCARRY_OUT.value = this.gateMC_2.value;
            } else {
                this.shiftDREvenOdd();          // second (and third) E-2 cycle
                this.setDREven(0);                      // addend will be zero on 3rd E-2 cycle...
            }

            this.gateCARRY_IN.value = this.gateCARRY_OUT.value;
            digit = this.addDigits(digit);
            if (digit) {
                this.gateEZ.value = 0;
            }

            if (this.gate1ST_CYC_DELAYD.value && !this.gateHP.value) {
                digit |= Register.flagMask;     // set product sign in low-order digit
            }

            if (!this.gate2_DIG_CNTRL.value) {
                // Propagate 2nd E-2 carry 2 cycles ahead.
                this.gateMC_2.value = this.gateMC_1.value;
                this.gateMC_1.value = this.gateCARRY_OUT.value;
                // Determine final digit status.
                if (this.gateFIELD_MK_2.value) {
                    if (this.gateFIELD_MK_1.value) {
                        digit |= Register.flagMask;     // set product area field mark
                    }
                }
            }

            this.regMIR.setDigit(dx, digit);
            this.store();

            // Now, figure out how to get outta here...
            if (this.gate2_DIG_CNTRL.value) {
                this.gate2_DIG_CNTRL.value = 0;         // stay in E-2 for 2nd cycle
            } else {
                if (this.gateFIELD_MK_2.value) {
                    if (this.gateMC_2.value) {          // stay in E-2 for 3rd cycle to add final carry
                        this.gateCARRY_OUT.value = this.gateMC_2.value;
                    } else if (this.gateFIELD_MK_1.value) {
                        this.enterICycle();             // finito
                    } else {
                        this.setProcState(procStateE1); // advance to next multiplier digit
                    }
                } else if (this.regMQ.isZero && !this.gateFIELD_MK_1.value) {
                    this.setProcState(procStateE1);     // zero multiplier - early exit to next multiplier digit
                } else {
                    this.setProcState(procStateE3);     // advance to next multiplicand digit
                }
            }
            break;

        case 18:        // LDM - Load Dividend Immediate
        case 28:        // LD - Load Dividend
            if (this.gateLAST_LD_CYC.value) {           // final LD/LDM cycle
                this.regMAR.value = this.regPR1.value;
                this.fetch();                           // fetch product digit at 00099
                dx = this.regMAR.isEven;
                digit = this.regMBR.getDigit(dx);
                if (this.gateFIELD_MK_2.value) {
                    if (this.gateDVD_SIGN.value) {      // set sign in product field
                        this.regMIR.setDigit(dx, digit |= Register.flagMask);
                    }
                    this.enterICycle();
                }
                this.store();
            } else {                                    // transfer P digit to product field
                this.regMAR.value = this.regOR2.value;
                this.fetch();
                if (this.gate2_DIG_CNTRL.value) {
                    this.gate2_DIG_CNTRL.value = 0;
                    digit = this.getDROdd();
                } else {
                    digit = this.shiftDREvenOdd();
                    nextState = procStateE1;
                }

                if (this.gate1ST_CYC_DELAYD.value) {    // first P digit
                    digit &= Register.notFlagMask;      // reset flag on low-order P digit
                    if (this.gateFL_1.value) {
                        this.gateDVD_SIGN.value = 1;    // save P-field sign for final cycle
                    }
                } else if (this.gateFL_1.value) {       // last P digit, set up final cycle
                    this.gateFIELD_MK_1.value = 1;
                    this.gateLAST_LD_CYC.value = 1;
                    this.gateEXMIT_MODE.value = 0;
                    this.gateFIELD_MK_2.value = 1;
                }

                this.regMIR.setDigit(dx, digit);
                this.store();
                this.regOR2.decr(1);

                if (nextState) {        // do either E1 or continue with E2
                    this.setProcState(nextState);
                }
            }
            break;

        case 19:        // DM - Divide Immediate
        case 29:        // D - Divide
            if (this.gate1ST_CYC_DELAYD.value) {
                this.regOR2.value = this.regOR3.value;  // reset the dividend digit address
                this.gateCARRY_IN.value = this.gateCOMP.value;  // preset carry on first cycle
            }

            this.regMAR.value = this.regOR2.value;
            dx = this.regMAR.isEven;
            this.fetch();                               // next dividend/remainder digit
            digit = this.regMBR.getDigit(dx);

            if (this.gate2_DIG_CNTRL.value) {
                this.gate2_DIG_CNTRL.value = 0;
            } else {
                this.shiftDREvenOdd();
                nextState = procStateE1;
            }

            digit = this.addDigits(digit);
            if (this.gateDVD_L_CYC.value) {
                if (this.gate1ST_CYC_DELAYD.value) {
                    digit |= this.regMBR.getDigit(dx) & Register.flagMask; // preserve remainder sign
                } else if (this.gateFL_1.value) {
                    digit |= Register.flagMask;         // set remainder field mark
                }
            }

            this.gateCARRY_IN.value = this.gateCARRY_OUT.value;
            this.regMIR.setDigit(dx, digit);
            this.store();
            this.regOR2.decr(1);                        // update OR1 before chance of early exits

            if (this.gate1ST_CYC_DELAYD.value) {        // this was the first cycle of a divide cycle
                if (this.gateDVD_L_CYC.value && !this.gateCOMP.value) { // last divide cycle add mode
                    if (this.gateFL_1.value) {
                        this.gateHP.flip();             // flip sign if divisor negative
                    }
                    if (this.regMBR.getDigit(dx) & Register.flagMask) {
                        this.gateHP.flip();             // flip sign if dividend negative
                    }
                }
            } else if (this.gateFIELD_MK_1.value) {     // this was the third E2 cycle (see below)
                this.gateFIELD_MK_2.value = 1;
                this.gateADD_ENT.value = 1;             // restart field processing in E1
                if (this.gateCARRY_OUT.value) {         // result from this cycle is still positive, so...
                    if (this.regMQ.binaryValue < 9) {
                        this.regMQ.incr(1);             // increment quotient digit
                        nextState = procStateE1;        // and do another subtraction cycle
                    } else {                            // exceeded 9 subtractions, set overflow and quit
                        this.regMQ.value = 0xA;         // MQ actually counted to binary 10 on overflow
                        this.setIndicator(14, `DIV Arithmetic overflow: op=${op}, IR1=${this.regIR1.binaryValue-12}`);
                        nextState = 0;                  // inhibit any other state change and exit
                        this.enterICycle();
                    }
                } else {                                // result from this cycle is negative, so...
                    nextState = procStateE1;            // start the add-correction cycle (COMP turned off in E1)
                }
            } else if (this.gateFL_1.value) {           // at the end of the divisor field
                this.gateFIELD_MK_1.value = 1;
                if (this.gateCOMP.value) {              // we've been subtracting
                    this.resetDREven();
                    this.setDREven(0);                  // addend will be zero for next cycle
                    nextState = 0;                      // do third E2 cycle to apply borrow to next quotient digit
                } else {                                // otherwise, this was an add-correction cycle
                    this.gateFIELD_MK_2.value = 1;
                    nextState = procStateE3;            // finish this quotient digit in E3
                }
            }

            if (nextState) {
                this.setProcState(nextState);
            }
            break;

        case 30:        // TRNM - Transmit Record No Record Mark
        case 31:        // TR - Transmit Record
            if (this.gate2_DIG_CNTRL.value) {
                this.gate2_DIG_CNTRL.value = 0;
                digit = this.getDROdd();
            } else {
                digit = this.shiftDREvenOdd();
                nextState = procStateE1;
            }

            if ((digit & Envir.numRecMark) == Envir.numRecMark) {
                if (op == 31) {         // only store the RM if it's TR
                    this.regMIR.setDigit(dx, digit);
                    this.store();
                    this.regOR2.incr(1);
                }
                this.enterICycle();
            } else {
                this.regMIR.setDigit(dx, digit);
                this.store();
                this.regOR2.incr(1);
                if (nextState) {        // do either E1 or continue with E2
                    this.setProcState(nextState);
                }
            }
            break;

        case 32:        // SF - Set Flag
            this.regMIR.setDigitFlag(dx, 1);
            this.store();
            this.enterICycle();
            break;

        case 33:        // CF - Clear Flag
            this.regMIR.setDigitFlag(dx, 0);
            this.store();
            this.enterICycle();
            break;

        case 35:        // DN - Dump Numerically
            this.regOR2.incr(1);
            await this.dumpNumerically(this.regMBR.getDigit(dx));
            break;

        //case 36:      // RN - Read Numerically (runs in Limbo)
        //case 37:      // RA - Read Alphanumerically (runs in Limbo)

        case 38:        // WN - Write Numerically
            this.regOR2.incr(1);
            await this.writeNumerically(this.regMBR.getDigit(dx));
            break;

        case 39:        // WA - Write Alphanumerically
            this.regOR2.incr(2);
            if (this.regMAR.isEven) {
                // Simulate the problem with even starting addresses. The output
                // translator was sensitive to whether it was dealing with zone
                // or numeric digits, so an even address could cause translation
                // and parity errors. This approach just sets Write Check Pending
                // and sets the check indicator in ioExit.
                await this.writeAlphanumerically(
                        (this.regMBR.odd << Register.digitBits) | this.regMBR.even);
                if (!this.ioWriteCheckPending) {
                    this.ioWriteCheckPending = true;
                    this.ioWriteCheck.value = 1;
                }
            } else {
                await this.writeAlphanumerically(this.regMBR.value);
            }
            break;

        case 71:        // MF - Move Flag
            if (this.regMBR.getDigitFlag(dx) ^ this.gateFIELD_MK_1.value) {
                this.regMIR.setDigitFlag(dx, this.gateFIELD_MK_1.value);
                this.store();
            }
            this.regOR2.decr(1);
            this.enterICycle();
            break;

        case 72:        // TNS - Transmit Numeric Strip
            if (this.regMAR.isEven) {
                // Simulate the problem with even starting addresses. This is
                // just a guess to what happened, and probably not a good one.
                digit = this.regMBR.odd & Register.bcdMask;
                this.setDROdd(this.regMBR.even);
            } else {
                digit = this.regMBR.even & Register.bcdMask;
                this.setDROdd(this.regMBR.odd);
            }

            if (this.gate1ST_CYC_DELAYD.value) { // special sign logic for TNS
                if (digit == 5 || digit == 1 || (digit == 2 &&
                        (this.regDR.odd & Register.bcdMask) == 0)) {
                    this.gateFL_1.value = 1;
                }
            }

            this.regOR2.decr(2);
            this.setProcState(procStateE1);
            break;

        case 73:        // TNF - Transmit Numeric Fill
            digit = (this.gateFIELD_MK_2.value ? 5 : 7);
            if (this.regMAR.isEven) {
                // Simulate the problem with even starting addresses. This is
                // just a guess to what happened, and probably not a good one.
                this.regMIR.even = this.regDR.odd;
                this.regMIR.odd = digit;
            } else {
                this.regMIR.even = digit;
                this.regMIR.odd = this.regDR.odd;
            }

            this.store();
            this.regOR2.decr(2);
            if (this.gateFIELD_MK_1.value) {
                this.enterICycle();
            } else {
                this.setProcState(procStateE1);
            }
            break;

        default:
            this.panic(`E-2 op not implemented ${op}`);
            break;
        }
    }

    /**************************************/
    stepECycle3() {
        /* Executes E-Cycle 3 */
        let digit = 0;
        let dx = 0;                     // digit index: 0/1

        switch (this.opBinary) {
        case 13:        // MM - Multiply Immediate
        case 23:        // M - Multiply
            // Fetch Multiplicand digit to DR-odd, determine multiplicand sign.
            if (this.gate1ST_MPLY_CYCLE.value) {
                this.regMAR.value = this.regOR2.value;
            } else {
                this.regMAR.value = this.regOR3.value;
            }

            this.fetch();
            dx = this.regMAR.isEven;
            digit = this.regMBR.getDigit(dx);
            if (digit & Register.flagMask) {
                if (this.gate1ST_CYC.value) {
                    this.gateHP.flip();                 // multiplicand sign from low-order digit
                }
                if (!this.gate1ST_MPLY_CYCLE.value) {
                    this.gateFIELD_MK_2.value = 1;      // last multiplicand digit
                }
            }

            this.resetDREven();
            this.setDROdd(digit);
            this.regMAR.decr(1);
            this.regOR3.value = this.regMAR.value;
            this.setProcState(procStateE4);
            break;

        case 19:        // DM - Divide Immediate
        case 29:        // D - Divide
            this.regMAR.value = this.regOR2.value;
            this.fetch();

            this.gateADD_MODE.value = 0;
            digit = this.regMQ.value;                   // get quotient digit value
            if (digit & Register.bcdMask) {             // check for non-zero
                this.gateEZ.value = 0;
            }

            if (this.gateDIV_1_CYC.value) {
                digit |= Register.flagMask;             // set quotient field mark
            }

            if (this.gateDVD_L_CYC.value) {
                this.enterICycle();                     // last digit -- we're done
                if (!this.gateHP.value) {
                    digit |= Register.flagMask;         // set quotient sign
                }
            } else {
                this.setProcState(procStateE4);
            }

            this.regMIR.setDigit(this.regMAR.isEven, digit);
            this.store();                               // store quotient digit in product area
            break;

        default:
            this.panic(`E-3 op not implemented ${this.opBinary}`);
            break;
        }
    }

    /**************************************/
    stepECycle4() {
        /* Executes E-Cycle 4 */
        let q2 = 0;                     // multiply table address term

        switch (this.opBinary) {
        case 13:        // MM - Multiply Immediate
        case 23:        // M - Multiply
            // Fetch product digits based on multiplier (MQ) and multiplicand (DR-odd).
            // The table address caculation is adapted from Dave Babcock's CHM 1620 Jr. emulator.
            this.gate2_DIG_CNTRL.value = 1;
            q2 = (this.regMQ.value & Register.bcdMask)*2 + 10;
            this.regMAR.binaryValue =
                    (q2 - q2%10 +                               // hundreds digit
                    (this.regDR.odd & Register.bcdMask))*10 +   // tens digit
                    q2%10;                                      // units digit
            this.fetch();
            this.setDREven(this.regMBR.odd);    // product tens digit
            this.setDROdd(this.regMBR.even);    // product units digit
            this.setProcState(procStateE2);
            break;

        case 19:        // DM - Divide Immediate
        case 29:        // D - Divide
            this.gateADD_ENT.value = 1;                 // initialize fields on next cycle
            this.gateCOMP.value = 1;                    // stop adding and enable subtract cycles again
            this.gateDIV_1_CYC.value = 0;               // not the first division cycle anymore
            this.regMQ.clear();                         // zero the quotient digit counter
            this.regMAR.value = this.regOR3.value;
            if ((this.regMAR.value & 0b001111_000000_000000_001111_001111) == 0b001001_001000) { // MAR == 0XX98
                this.gateDVD_L_CYC.value = 1;           // next cycle is the last one
            }

            this.regOR3.incr(1);                        // step to next dividend digit
            this.setProcState(procStateE1);
            break;

        default:
            this.panic(`E-4 op not implemented ${this.opBinary}`);
            break;
        }
    }

    /**************************************/
    stepECycle5() {
        /* Executes E-Cycle 5 */

        switch (this.opBinary) {
        case 13:        // MM - Multiply Immediate
        case 18:        // LDM - Load Dividend Immediate
        case 23:        // M - Multiply
        case 28:        // LD - Load Dividend
            // Clear the product area, 00081-00099
            if (this.gate1ST_CYC.value) {
                this.gate1ST_CYC.value = 0;
                this.regPR1.clear();
                this.regMAR.binaryValue = 81;
            } else {
                this.regMAR.value = this.regPR1.value;
            }

            this.regMIR.clear();
            this.store();
            if (this.regMAR.binaryValue == 99) {
                this.gate1ST_CYC.value = 1;
                this.setProcState(procStateE1);
            } else {
                this.regMAR.incr(2);
                this.regPR1.value = this.regMAR.value;
            }
            break;

        default:
            this.panic(`E-5 op not implemented ${this.opBinary}`);
            break;
        }

        this.gateE_CYC_ENT.value = 0;
    }


    /*******************************************************************
    *  Processor Control                                               *
    *******************************************************************/

    /*************************************/
    setProcState(state) {
        /* Sets the current processor state and resets the previous state */

        let gate = this.procStateGates[this.procState];
        if (gate) {
            gate.value = 0;
        }

        this.procState = state;
        gate = this.procStateGates[state];
        if (gate) {
            gate.value = 1;
        } else if (state != procStateLimbo) {
            this.panic(`>>EMULATOR INVALID PROC STATE: ${state}`);
            debugger;
        }
    }

    /**************************************/
    enterLimbo(entryContext=null, entryFcn=null) {
        /* Stops processing by setting this.procState to procStateLimbo. This
        will cause this.run() to exit but leave the Processor in AUTOMATIC and
        not MANUAL mode. Typically used for read/write interlock conditions and
        input I/O. To get out of Limbo, you'll need to call run(), or do RELEASE
        and RESET then manually restart the system.
        "entryFcn" is a function to call upon entering Limbo state. "entryContext"
        is the object context (this value) to apply to that call */

        this.limboEntryFcn = entryFcn;
        this.limboEntryContext = entryContext;
        this.setProcState(procStateLimbo);
    }

    /**************************************/
    enterManual() {
        /* Places the processor in Manual mode */
        const now = performance.now();

        this.gateMANUAL.value = 1;
        this.gateRUN.value = 0;
        this.gateCLR_CTRL.value = 0;
        while (this.runTime < 0) {
            this.runTime += now;
        }
    }

    /**************************************/
    exitManual() {
        /* Releases the processor from Manual mode */
        const now = performance.now();

        this.gateMANUAL.value = 0;
        while (this.runTime >= 0) {
            this.runTime -= now;
        }
    }

    /**************************************/
    enterAutomatic() {
        /* Starts the run time clock for AUTOMATIC mode */

        this.gateAUTOMATIC.value = 1;
    }

    /**************************************/
    exitAutomatic() {
        /* Stops the run time clock for AUTOMATIC mode */

        this.gateAUTOMATIC.value = 0;
    }

    /**************************************/
    checkStop(msg) {
        /* Turns on the CHECK STOP lamp, enters MANUALmode, and logs "msg" */

        this.gateCHECK_STOP.value = 1;
        this.exitAutomatic();
        this.enterManual();
        console.info(`>>CHECK STOP: ${msg}`);
    }

    /**************************************/
    verifyCheckStop() {
        /* Examines all of the conditions that can cause a check stop and turns
        off the lamp if none exist any longer */

        const disk = this.diskAddrCheck.value || this.diskCylOflowCheck.value || this.diskWLRRBCCheck.value;
        const parity = this.parityMBREvenCheck.value || this.parityMBROddCheck.value;
        const io = this.ioPrinterCheck.value || this.ioReadCheck.value || this.ioWriteCheck.value;
        const oflow = this.oflowArithCheck.value || this.oflowExpCheck.value;

        if (!this.parityMARCheck.value &&
                !(disk && this.diskStopSwitch) && !(parity && this.parityStopSwitch) &&
                !(io && this.ioStopSwitch) && !(oflow && this.oflowStopSwitch)) {
            this.gateCHECK_STOP.value = 0;
        }
    }

    /**************************************/
    panic(msg) {
        /* Forces a CHECK STOP and immediate MANUAL mode. Used internally */

        this.checkStop(msg);
    }

    /**************************************/
    marCheck(msg) {
        /* Stops the processor for MAR addressing errors */

        this.setIndicator(0, msg);
    }


    /**************************************/
    setIndicator(code, msg) {
        /* Sets the indicator specified by "code" and does a Check Stop based on
        any associated stop switch. Not all indicators are settable -- any codes
        that are not supported by this function are simply ignored. The "msg"
        parameter is used only when a Check Stop occurs.
        Code 0 is used to set a MAR Check condition, which does not have an
        associated indicator, and always results in a Check Stop */
        const text = msg ?? "";

        switch (code) {
        case 0:         // MAR Check (parity, invalid digit, invalid address)
            this.parityMARCheck.value = 1;
            this.checkStop(`MAR Check: ${text}`);
            break;
        case  6:        // Read Check
            this.ioReadCheck.value = 1;
            if (this.ioStopSwitch) {
                this.checkStop(`Read Check: ${text}`);
            }
            break;
        case  7:        // Write Check
            this.ioWriteCheck.value = 1;
            if (this.ioStopSwitch) {
                this.checkStop(`Write Check: ${text}`);
            }
            break;
        case  9:        // Last card (1622 read)
            this.gateLAST_CARD.value = 1;
            break;
        case 14:        // Arithmetic Check
            this.oflowArithCheck.value = 1;
            if (this.oflowStopSwitch) {
                this.checkStop(`Arithmetic Overflow Check: ${text}`);
            }
            break;
        case 15:        // Exponent Check
            this.oflowExpCheck.value = 1;
            if (this.oflowStopSwitch) {
                this.checkStop(`Exponent Overflow Check: ${text}`);
            }
            break;
        case 16:        // MBR-even Check
            this.parityMBREvenCheck.value = 1;
            if (this.parityStopSwitch) {
                this.checkStop(`MBR-Even Check: ${text}`);
            }
            break;
        case 17:        // MBR-odd Check
            this.parityMBROddCheck.value = 1;
            if (this.parityStopSwitch) {
                this.checkStop(`MBR-Odd Check: ${text}`);
            }
            break;
        case 36:        // 1311 Address Check
            this.diskAddrCheck.value = 1;
            if (this.diskStopSwitch) {
                this.checkStop(`Disk Address Check: ${text}`);
            }
            break;
        case 37:        // 1311 Wrong-length Record / Read-back Check
            this.diskWLRRBCCheck.value = 1;
            if (this.diskStopSwitch) {
                this.checkStop(`Disk WRL/RBC Check: ${text}`);
            }
            break;
        case 38:        // 1311 Cylinder Overflow
            this.diskCylOflowCheck.value = 1;
            if (this.diskStopSwitch) {
                this.checkStop(`Disk Cylinder Overflow Check: ${text}`);
            }
            break;
        case 25:        // 1443 Printer Check
            this.ioPrinterCheck.value = 1;      // ?? but not if it's a sync check ??
            if (this.ioStopSwitch) {
                this.checkStop(`Printer Check: ${text}`);
            }
            break;
        case 33:        // 1443 Channel 9
            this.ioPrinterChannel9.value = 1;   // also reset by sensing channel 1
            break;
        case 34:        // 1443 Channel 12
            this.ioPrinterChannel12.value = 1;  // also reset by sensing channel 1
            break;
        }
    }

    /**************************************/
    resetIndicator(code) {
        /* Resets the specified indicator in the Processor, complementing the
        function of this.setIndicator() */

        switch (code) {
        case  6:        // Read Check
            this.ioReadCheck.value = 0;
            break;
        case  7:        // Write Check
            this.ioWriteCheck.value = 0;
            break;
        case  9:        // Last card (1622 read)
            this.gateLAST_CARD.value = 0;
            break;
        case 14:        // Arithmetic Check
            this.oflowArithCheck.value = 0;
            break;
        case 15:        // Exponent Check
            this.oflowExpCheck.value = 0;
            break;
        case 16:        // MBR-even Check
            this.parityMBREvenCheck.value = 0;
            break;
        case 17:        // MBR-odd Check
            this.parityMBROddCheck.value = 0;
            break;
        case 36:        // 1311 Address Check
            this.diskAddrCheck.value = 0;
            break;
        case 37:        // 1311 Wrong-length Record / Read-back Check
            this.diskWLRRBCCheck.value = 0;
            break;
        case 38:        // 1311 Cylinder Overflow
            this.diskCylOflowCheck.value = 0;
            break;
        case 25:        // 1443 Printer Check
            this.ioPrinterCheck.value = 0;      // ?? but not if it's a sync check ??
            break;
        case 33:        // 1443 Channel 9
            this.ioPrinterChannel9.value = 0;   // also reset by sensing channel 1
            break;
        case 34:        // 1443 Channel 12
            this.ioPrinterChannel12.value = 0;  // also reset by sensing channel 1
            break;
        }
    }

    /**************************************/
    async run() {
        /* Main execution control loop for the processor. Does one iteration per
        memory cycle until the Processor is put in MANUAL mode. Attempts to
        throttle performance to approximate that of a real 1620. Executes memory
        cycles until some sort of stop condition is detected */

        if (this.running) {
            this.panic("Multiple instances of this.run() active");
            return;
        }

        this.running = true;
        this.envir.startTiming();

        do {
            switch (this.procState) {
            case procStateI1:
                this.stepICycle1()
                break;

            case procStateI2:
                this.stepICycle2();
                break;

            case procStateI3:
                this.stepICycle3();
                break;

            case procStateI4:
                this.stepICycle4();
                break;

            case procStateI5:
                this.stepICycle5();
                break;

            case procStateI6:
                this.stepICycle6();
                break;

            case procStateIX:
                this.stepIndexing();
                break;

            case procStateIA1:
                this.stepIndirecting1();
                break;

            case procStateIA2:
                this.stepIndirecting2();
                break;

            case procStateIA3:
                this.stepIndirecting3();
                break;

            case procStateE1:
                this.stepECycle1();
                break;

            case procStateE2:
                await this.stepECycle2();
                break;

            case procStateE3:
                this.stepECycle3();
                break;

            case procStateE4:
                this.stepECycle4();
                break;

            case procStateE5:
                this.stepECycle5();
                break;

            case procStateLimbo:
                await this.envir.throttle();
                this.running = false;
                if (this.limboEntryFcn) {
                    this.limboEntryFcn.call(this.limboEntryContext, this.limboEntryFcn);
                }
                return;             // exit into Limbo state
                break;

            default:
                this.panic(`>>INVALID PROC STATE: ${this.procState}`);
                break;
            }

            // Increment the emulation clock, and if the time slice has ended,
            // throttle performance. We need to increment after the register and
            // flip-flop states have been set so that register their glow values
            // will be computed properly.
            if (this.envir.tick()) {
                if (!(this.gateRD.value || this.gateWR.value)) { // not doing I/O
                    const delayStart = performance.now();
                    const delay = this.envir.eTime - delayStart;
                    this.avgThrottleDelay =
                            this.avgThrottleDelay*Processor.delayAlpha1 + delay*Processor.delayAlpha;

                    await this.envir.throttle();

                    this.avgThrottleDelta = this.avgThrottleDelta*Processor.delayAlpha1 +
                            (performance.now() - delayStart - delay)*Processor.delayAlpha;
                }
            }
        } while (!this.gateMANUAL.value && this.gatePOWER_ON.value);

        this.running = false;
        this.envir.restartTiming();
    }


    /*******************************************************************
    *  Operator Interface                                              *
    *******************************************************************/

    /**************************************/
    manualReset() {
        /* Resets the internal processor state after power-on or the MANUAL key.
        It can only be performed in manual mode */

        if (!(this.gatePOWER_ON.value && this.gateMANUAL.value)) {
            return;
        }

        this.gate$$$_OFLO.value = 0;
        this.gate1ST_CYC.value = 0;
        this.gate1ST_CYC_DELAYD.value = 0;
        this.gateBR_EXEC.value = 0;
        this.gateBR_OUT.value = 0;
        this.gateCARRY_IN.value = 0;
        this.gateCARRY_OUT.value = 0;
        this.gateCLR_MEM.value = 0;
        this.gateCOMP.value = 0;
        this.gateEOR$.value = 0;
        this.gateEXP_OFLO.value = 0;
        this.gateEXP_UFLO.value = 0;
        this.gateEZ.value = 0;
        this.gateE_CYC_ENT.value = 0;
        this.gateFL_1.value = 0;
        this.gateFL_2.value = 0;
        this.gateHP.value = 0;
        this.gateIA_ENT.value = 0;
        this.gateIA_REQ.value = 0;
        this.gateINT_ENT.value = 0;
        this.gateINT_MODE.value = 0;
        this.gateIX_ENT.value = 0;
        this.gateLAST_CARD.value = 0;
        this.gateMASK.value = 0;
        this.gateP.value = 0;
        this.gateRM.value = 0;

        // Input-Output Gates
        this.gateDISK_ADDR.value = 0;
        this.gateDISK_HUND.value = 0;
        this.gateDISK_LD_ZERO.value = 0;
        this.gateDISK_OP.value = 0;
        this.gateDISK_UNIT.value = 0;
        this.gateMEM_ADDR.value = 0;
        this.gatePCH_FEED.value = 0;
        this.gatePC_6XXX.value = 0;
        this.gatePC_EZ.value = 0;
        this.gatePC_HP.value = 0;
        this.gatePC_IND.value = 0;
        this.gatePC_OFLOW.value = 0;
        this.gatePC_TR_8.value = 0;
        this.gateRDR_FEED.value = 0;
        this.gateREL.value = 0;
        this.gateSCTR_COUNT.value = 0;
        this.gateSCTR_CYC.value = 0;
        this.gateSIMO_30.value = 0;
        this.gateSIMO_HOLD.value = 0;
        this.ioExit();

        this.gateWRITE_INTERLOCK.value = 0;
        this.gateREAD_INTERLOCK.value = 0;

        this.gateIA_1.value = 0;
        this.gateI_1.value = 0;
        this.gateI_6.value = 0;

        this.gateCLR_CTRL.value = 0;
        this.gateCLR_MEM.value = 0;
        this.gateCONSOLE_CTRL_SS.value = 0;
        this.gateDISPLAY_MAR.value = 0;
        this.gateSAVE.value = 0;
        this.gateINSERT.value = 0;
        this.gateREL.value = 0;
        this.gateSAVE_CTRL.value = 0;
        this.gateSCE.value = 0;

        this.regXR.clear();
        this.regXBR.clear();

        this.parityMARCheck.value = 0;
        this.oflowArithCheck.value = 0;
        this.oflowExpCheck.value = 0;
        this.ioPrinterChannel9.value = 0;
        this.ioPrinterChannel12.value = 0;
        this.checkReset();              // will turn off this.gateCHECK_STOP

        this.gateSTOP.value = 0;
        this.enterICycle();
        this.enterManual();             // will turn off this.gateRUN
    }

    /**************************************/
    checkReset() {
        /* Resets the internal processor state by the CHECK RESET key */

        this.ioPrinterCheck.value = 0;
        this.ioReadCheck.value = 0;
        this.ioWriteCheck.value = 0;
        this.parityMBREvenCheck.value = 0;
        this.parityMBROddCheck.value = 0;
        this.verifyCheckStop();
    }

    /**************************************/
    diskReset() {
        /* Resets the Disk Check indicators */

        this.release();
        this.diskAddrCheck.value = 0;
        this.diskCylOflowCheck.value = 0;
        this.diskWLRRBCCheck.value = 0;
        this.verifyCheckStop();
        if (this.devices.diskDrive) {
            this.devices.diskDrive.diskReset();
        }
    }

    /**************************************/
    enableMemoryClear() {
        /* Enables a clear-memory operation to take place the next time the
        START key is pressed. On a real 1620-2 this was activated by pressing
        MODIFY and CHECK RESET simultaneously, but that's not feasible with a
        pointer-based UI, so in retro-1620 it's activated by pressing MODIFY and
        then CHECK RESET without activating any other keys or switches on the
        lower Control Panel in between. To cancel the clear before pressing
        START, click CHECK RESET twice, or click any other key except START
        (well, maybe not POWER, either) */

        if (this.gatePOWER_ON.value && this.gateMANUAL.value) {
            this.gateCLR_MEM.value = 1;
        }
    }

    /**************************************/
    displayMAR() {
        /* Displays the value of the MARS register selected by the big MARS
        selector switch in the MAR lamps */

        if (this.gatePOWER_ON.value && this.gateMANUAL.value  && !this.gateAUTOMATIC.value) {
            // ?? also gated by this.gateCONSOLE_CTRL_SS ??
            this.gateDISPLAY_MAR.value = 1;
            this.gateRUN.value = 1;
            this.regMAR.value = this.marsRegisters[this.marSelectorKnob].value;

            // ?? Not sure how DISPLAY_MAR gets reset, other than the RESET key,
            // so for now just reset it after once clock tick here.
            this.envir.tick();
            this.gateDISPLAY_MAR.value = 0;
        }
    }

    /**************************************/
    saveIR1() {
        /* Saves the value of IR1 in PR1 and turns on the SAVE lamp */

        if (this.gatePOWER_ON.value && this.gateMANUAL.value && !this.gateAUTOMATIC.value) {
            //this.gateSAVE_CTRL.value = 1;     // not sure how this gets reset...
            this.gateSAVE.value = 1;
            this.gateRUN.value = 1;
            this.regPR1.value = this.regMAR.value = this.regIR1.value;
        }
    }

    /**************************************/
    insert(cardLoad) {
        /* Initiates input from the typewriter via the INSERT key (cardLoad=false)
        or the CardReader LOAD button (cardLoad=true) */

        if (this.gatePOWER_ON.value && this.gateMANUAL.value && !this.gateAUTOMATIC.value) {
            this.gateINSERT.value = 1;
            this.enterAutomatic();
            this.gateREL.value = 0;
            this.regOP.binaryValue = this.opBinary = 36; // RN, Read Numerically
            this.ioSelect((cardLoad ? 5 : 1), 0);        // select card(5) or typewriter(1)
            if (!this.gateRD.value) {   // not sure about this...
                this.gateRD.value = 1;
                this.gate1ST_CYC.value = 1;
                this.exitManual();
                this.gateRUN.value = 1;
            }

            this.enterLimbo();
            this.envir.tick();          // pretend to do a delayed 1st cycle
            this.gate1ST_CYC.value = 0;
            this.gateBR_EXEC.value = 0;
            this.regIR1.clear();
            this.regOR2.clear();
            this.regMAR.clear();

            this.enterLimbo();          // device will trigger the memory cycles
            if (!this.ioDevice) {
                this.gateREAD_INTERLOCK.value = 1;
            } else {
                if (this.ioSelectNr == 3) {             // card reader
                    this.gateREAD_INTERLOCK.value = 1;
                }

                this.ioDevice.initiateRead(true);
            }
        }
    }

    /**************************************/
    release() {
        /* Releases any currently-active I/O operation */

        if (this.gatePOWER_ON.value && (this.gateRD.value || this.gateWR.value)) {
            this.gateSTOP.value = 1;
            this.ioExit();              // STOP will force MANUAL mode in I-Cycle Entry
        }
    }

    /**************************************/
    start() {
        /* Initiates the processor on the Javascript thread */

        if (this.gatePOWER_ON.value && this.gateMANUAL.value && !this.gateCHECK_STOP.value) {
            this.gateSCE.value = 0;     // reset single-cycle mode
            this.gateSAVE_CTRL.value = 0;
            this.exitManual();
            this.gateRUN.value = 1;
            // gate 1621 read cluch
            // gate I/O resp
            // gate run clock
            if (this.gateCLR_MEM.value) {
                this.clearMemory();     // async -- returns immediately
            } else {
                this.run();             // async
            }
        }
    }

    /**************************************/
    stopSIE() {
        /* If the processor is running, stops it at the end of the current
        instruction. If the processor is already in manual mode, executes the
        next instruction, then stops the processor */

        if (this.gatePOWER_ON.value && !this.gateCHECK_STOP.value) {
            this.gateSTOP.value = 1;    // stop processor at end of current instruction
            if (this.gateMANUAL.value) {
                this.exitManual();
                this.run();             // async - singe-step one instruction
            }
        }
    }

    /**************************************/
    stopSCE() {
        /* If the processor is running, stops it at the end of the current
        memory cycle, but leaves it in AUTOMATIC mode, even though MANUAL is also
        set. Otherwise, executes the next memory cycle, then stops the processor */

        if (this.gatePOWER_ON.value && !this.gateCHECK_STOP.value &&
                // Not sure about this next part, but it's mentioned in Germain p.25:
                // Don't allow SCE during I/O unless it's Typewriter or Paper Tape output.
                !(this.gateRD.value || (this.gateWR.value && !(this.ioSelectNr==1 || this.ioSelectNr==3)))) {
            this.gateSCE.value = 1;     // single memory-cycle latch
            this.gateRUN.value = 1;
            if (this.gateMANUAL.value) {
                // Singe-step one memory cycle (ignoring that we're in MANUAL mode).
                this.run();             // async
            } else {
                // Stop processor after next memory cycle.
                this.enterManual();
            }
        }
    }


    /*******************************************************************
    *  Initialization & Termination                                    *
    *******************************************************************/

    /**************************************/
    powerUp() {
        /* Powers up and initializes the processor */

        if (!this.gatePOWER_ON.value) {
            this.gatePOWER_ON.value = 1;
            this.enterManual();                         // must be set for manualReset()
            this.manualReset();
            this.gateIA_SEL.value = 1;                  // enable indirect addressing
            this.devices = this.context.devices;        // I/O device objects
            this.loadMemory();                          // >>> DEBUG ONLY <<<
            this.envir.startTiming();
        }
    }

    /**************************************/
    powerDown() {
        /* Powers down the processor */

        if (this.gateRD.value || this.gateWR.value || !this.gateMANUAL.value) {
            this.release();
            this.enterManual();                         // stop immediately
            setTimeout(() => {this.powerDown}, 100);
            return;
        }

        this.gatePOWER_ON.value = false;
        this.gatePOWER_READY.value = false;
        for (let prop in this) {
            if (this[prop] instanceof FlipFlop || this[prop] instanceof Register) {
                this[prop].intVal = 0;
            }
        }
    }

    /**************************************/
    loadMemory() {
        /* Loads the multiply table and any optional debugging code into the
        initial memory image. The routine should be enabled in this.powerUp()
        only temporarily for demo and debugging purposes */

        const loadMemory = (addr, digits) => {
            const numRex = /[0-9]/;
            const flagRex = /[@-I]/;
            const zero = ("0").charCodeAt(0);
            const flagZero = ("@").charCodeAt(0);
            const undigitMap = {"|": 0xA, "$": 0xB, "_": 0xC, "%": 0xD, "&": 0xE, "#": 0xF};

            let d = 0;
            let flagged = false;
            let odd = addr & 1;

            this.regMAR.binaryValue = addr;
            this.regMIR.correctedValue = this.MM[addr >> 1];

            for (let c of digits.toUpperCase()) {
                if (c == "~") {
                    flagged = true;
                } else if (c != " ") {
                    if (numRex.test(c)) {
                        d = c.charCodeAt(0) - zero;
                    } else if (flagRex.test(c)) {
                        d = (c.charCodeAt(0) - flagZero) | Register.flagMask;
                    } else if (c in undigitMap) {
                        d = undigitMap[c];
                    } else {
                        d = 0xF;    // Group Mark
                    }

                    if (flagged) {
                        flagged = false;
                        d |= Register.flagMask;
                    }

                    if (odd) {
                        this.regMIR.odd = Envir.oddParity5[d];
                        this.store();
                        this.regMAR.incr(2);
                    } else {
                        this.regMIR.even = Envir.oddParity5[d];
                    }

                    odd = 1-odd;
                }
            }

            if (odd) {
                this.regMIR.odd = Envir.oddParity5[0];
                this.store();
            }
        };

        // First, clear memory to zeroes.
        this.regMIR.clear();
        this.MM.fill(this.regMIR.value);

        // Multiplication table
        loadMemory(100,
            "00000000000010203040002040608000306090210040802161" +      // 100-149
            "00500151020060218142007041128200806142230090817263" +      // 150-199
            "00000000005060708090012141618151811242720242822363" +      // 200-249
            "52035304540363248445532494653604846546275445362718");      // 250-299

        this.regMAR.clear();
        this.regMIR.clear();
    }

} // class Processor


// Static class properties

Processor.delayAlpha = 0.001;           // throttling delay average decay factor
Processor.delayAlpha1 = 1-Processor.delayAlpha;

Processor.diskAddressSize = 5;          // size of address field in disk sectors
Processor.diskSectorSize = 105;         // size of a disk sector including address digits

// Typewriter numeric input keystroke digit codes.
Processor.twprASCIInumeric1620 = {
    " ": 0,
    "0": 0,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "@": Envir.numBlank,
    "|": Envir.numRecMark};

// CardReader numeric input digit codes.
Processor.cardASCIInumeric1620 = {
    "0": 0,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "A": 1,
    "B": 2,
    "C": 3,
    "D": 4,
    "E": 5,
    "F": 6,
    "G": 7,
    "H": 8,
    "I": 9,
    "]": 0 | Register.flagMask,
    "J": 1 | Register.flagMask,
    "K": 2 | Register.flagMask,
    "L": 3 | Register.flagMask,
    "M": 4 | Register.flagMask,
    "N": 5 | Register.flagMask,
    "O": 6 | Register.flagMask,
    "P": 7 | Register.flagMask,
    "Q": 8 | Register.flagMask,
    "R": 9 | Register.flagMask,
    "S": 2,
    "T": 3,
    "U": 4,
    "V": 5,
    "W": 6,
    "X": 7,
    "Y": 8,
    "Z": 9,
    "/": 1,
    ".": 0o13,
    ",": 0o13,
    "@": Envir.numBlank,
    "(": Envir.numBlank,
    ")": Envir.numBlank,
    "=": 0o13,
    "*": Envir.numBlank | Register.flagMask,
    "-": 0 | Register.flagMask,
    "+": 0,
    "|": Envir.numRecMark,
    "}": Envir.numGroupMark,
    "$": 0o13 | Register.flagMask,
    " ": 0,
    "!": Envir.numRecMark | Register.flagMask,
    "\"":Envir.numGroupMark | Register.flagMask,
    "~": Envir.numBlank | Register.flagMask};

// Standard alphanumeric input keystroke character codes for most devices.
Processor.stdASCIIalpha1620 = {
    " ": 0o00_00,
    "$": 0o01_03,
    "(": 0o02_04,
    ")": 0o00_04,
    "*": 0o01_04,
    "+": 0o01_00,
    ",": 0o02_03,
    "-": 0o02_00,
    ".": 0o00_03,
    "/": 0o02_01,
    "0": 0o07_00,
    "1": 0o07_01,
    "2": 0o07_02,
    "3": 0o07_03,
    "4": 0o07_04,
    "5": 0o07_05,
    "6": 0o07_06,
    "7": 0o07_07,
    "8": 0o07_10,
    "9": 0o07_11,
    "=": 0o03_03,
    "@": 0o03_04,
    "A": 0o04_01,
    "B": 0o04_02,
    "C": 0o04_03,
    "D": 0o04_04,
    "E": 0o04_05,
    "F": 0o04_06,
    "G": 0o04_07,
    "H": 0o04_10,
    "I": 0o04_11,
    "J": 0o05_01,
    "K": 0o05_02,
    "L": 0o05_03,
    "M": 0o05_04,
    "N": 0o05_05,
    "O": 0o05_06,
    "P": 0o05_07,
    "Q": 0o05_10,
    "R": 0o05_11,
    "S": 0o06_02,
    "T": 0o06_03,
    "U": 0o06_04,
    "V": 0o06_05,
    "W": 0o06_06,
    "X": 0o06_07,
    "Y": 0o06_10,
    "Z": 0o06_11,
    "|": 0o00_12,       // record mark
    "!": 0o05_12,       // flagged record mark
    "}": 0o00_17,       // group mark
    "\"":0o05_17,       // flagged group mark
    "]": 0o05_00,       // flagged zero (code 50)
    "^": 0o02_06};      // the "special" character (code 26)
