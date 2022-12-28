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
*       1964-04-29.
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
        this.diskWRLRBCCheck =      new FlipFlop(this.envir, true);
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
        this.regDR =                new Register(2, this.envir, true,  true,  false);
        this.regMAR =               new Register(5, this.envir, true,  true,  false);
        this.regMBR =               new Register(2, this.envir, true,  false, true);
        this.regMIR =               new Register(2, this.envir, true,  true,  true);
        this.regMQ =                new Register(1, this.envir, true,  true,  false);
        this.regOP =                new Register(2, this.envir, true,  true,  false);
        this.regXR =                new Register(1, this.envir, true,  false, false);   // indexing bits X-1, X-2, X-3

        // MARS Registers
        this.regCR1 =               new Register(5, this.envir, false, true,  false);
        this.regIR1 =               new Register(5, this.envir, false, true,  false);
        this.regIR2 =               new Register(5, this.envir, false, true,  false);
        this.regIR3 =               new Register(5, this.envir, false, true,  false);
        this.regIR4 =               new Register(5, this.envir, false, true,  false);
        this.regOR1 =               new Register(5, this.envir, false, true,  false);
        this.regOR2 =               new Register(5, this.envir, false, true,  false);
        this.regOR3 =               new Register(5, this.envir, false, true,  false);
        this.regOR4 =               new Register(5, this.envir, false, true,  false);
        this.regOR5 =               new Register(5, this.envir, false, true,  false);
        this.regPR1 =               new Register(5, this.envir, false, true,  false);
        this.regPR2 =               new Register(5, this.envir, false, true,  false);

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

        this.regXBR =               new Register(5, this.envir, false, true,  true);

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

        this.xrInstalled = (context.config.getNode("indexRegisters") ? 1 : 0);
        this.fpInstalled = (context.config.getNode("floatingPoint") ? 1 : 0);
        this.bcInstalled = (context.config.getNode("binaryCapabilities") ? 1 : 0);

        // General emulator state
        this.procState = procStateLimbo;                // processor instruction load/execute state
        this.tracing = false;                           // trace command debugging

        // I/O Subsystem
        this.ioTimer = new Timer();                     // general timer for I/O operations
        this.ioPromise = Promise.resolve();             // general Promise for I/O operations
        this.ioDevice = null;                           // I/O device object
        this.ioSelectNr = 0;                            // I/O channel from Q8/Q9
        this.ioVariant = 0;                             // I/O function variant from Q10/Q11
        this.ioReadCheckPending = false;                // Read Check condition has occurred but not yet been set

        // Bound Methods

        // Initialization
        let buildOpAtts = (opCode, opValid, eState, rfe1, pIA, qIA, pIX, qIX, immed, branch, fp, index, binary, edit, qa4) => {
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
        buildOpAtts( 6, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 06 TFL
        buildOpAtts( 7, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0);      // 07 BTFL
        buildOpAtts( 8, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0);      // 08 FSR
        buildOpAtts( 9, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0);      // 09 FDIV

        buildOpAtts(10, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0);      // 10 BTAM
        buildOpAtts(11, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 11 AM
        buildOpAtts(12, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 12 SM
        buildOpAtts(13, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 13 MM
        buildOpAtts(14, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 14 CM
        buildOpAtts(15, 1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 15 TDM
        buildOpAtts(16, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 16 TFM
        buildOpAtts(17, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0);      // 17 BTM
        buildOpAtts(18, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 18 LDM
        buildOpAtts(19, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0);      // 19 DM

        buildOpAtts(20, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0);      // 20 BTA
        buildOpAtts(21, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 21 A
        buildOpAtts(22, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 22 S
        buildOpAtts(23, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 23 M
        buildOpAtts(24, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 24 C
        buildOpAtts(25, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 25 TD
        buildOpAtts(26, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 26 TF
        buildOpAtts(27, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0);      // 27 BT
        buildOpAtts(28, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 28 LD
        buildOpAtts(29, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 29 D

        buildOpAtts(30, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 30 TRNM
        buildOpAtts(31, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0);      // 31 TR
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
        buildOpAtts(72, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0);      // 72 TNS
        buildOpAtts(73, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0);      // 73 TNF
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
    addDigits(addend) {
        /* Adds two digits and yields their sum. The augend must be in regDR.odd.
        If gateCOMP is set, the 9s-complement of the augend is added instead.
        gateCARRY_IN is added to the sum, which is then decimal-adjusted before
        storing it in regDR.odd. gateCARRY_OUT is set to the carry from the sum */
        let augend = this.regDR.odd;
        let sum = 0;

        if ((augend & Envir.undigitMask) > Envir.undigitFalse ||
                (addend & Envir.undigitMask) > Envir.undigitFalse) {
            this.marCheck(`addDigits invalid BCD code: aug=${augend.toString(2)}, add=${addend.toString(2)}`);
        } else {
            sum = (augend & Register.bcdMask) + this.gateCARRY_IN.value +
                    ((this.gateCOMP.value ? 9-addend : addend) & Register.bcdMask);
            if (sum < 10) {
                this.gateCARRY_OUT.value = 0;
            } else {
                sum -= 10;
                this.gateCARRY_OUT.value = 1;
            }

            this.regDR.odd = Envir.oddParity5[sum];
        }

        return sum;
    }

    /**************************************/
    updateLampGlow(beta) {
        /* Updates the lamp glow for all registers and flip-flops in the
        system. Beta is a bias in the range (0,1). For normal update use 0;
        to freeze the current state in the lamps use 1 */
        let gamma = (this.gateSTOP.value ? 1 : beta || 0);

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
        this.diskWRLRBCCheck.updateLampGlow(gamma);
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

        if (addr >= this.envir.memorySize) {
            this.marCheck(`fetch invalid memory address=${addr}`);
        } else {
            let pair = this.MM[addr >> 1];   // div 2
            this.regMIR.value = this.regMBR.value = pair;

            // Set indicators for parity errors.
            if (this.regMBR.parityError) {
                let digit = (pair >> Register.digitBits) & this.digitMask;
                if (Envir.oddParity5[digit] != digit) {
                    this.mbrCheck(0, `fetch MBR-Even parity error @${addr}`);
                }

                digit = pair & this.digitMask;
                if (Envir.oddParity5[digit] != digit) {
                    this.mbrCheck(1, `fetch MBR-Odd parity error @${addr}`);
                }
            }
        }
    }

    /**************************************/
    store() {
        /* Stores the double-digit pair in MIR to memory at the MAR address */
        let addr = this.regMAR.binaryValue;

        if (addr >= this.envir.memorySize) {
            this.marCheck(`store invalid memory address=${addr}`);
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
        this.updateLampGlow(1);         // freeze the lamp states
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
            this.ioVariant = variant;
            this.gateTWPR_SELECT.value = 1;
            break;
        case 2:         // Paper Tape Punch / Plotter
            //break;
        case 3:         // Paper Tape Reader
            //break;
        case 4:         // Card Punch
            //break;
        case 5:         // Card Reader
            this.ioDevice = this.devices.cardReader;
            break;
        case 7:         // Disk Drive
            //break;
        case 9:         // Printer
            //break;
        case 33:        // Binary Paper Tape Reader
            // break;
        default:
            this.ioDevice = null;
            this.ioVariant = 0;
            break;
        }
    }

    /**************************************/
    async dumpNumerically(digit) {
        /* Executes one digit cycle of Dump Numerically (DN, 35). If the device
        returns an end-of-block indication and we're at END OF MODULE, or
        RELEASE occurs, terminate the I/O */

        this.gateRESP_GATE.value = 0;
        this.gateCHAR_GATE.value = 1;

        let eob = await this.ioDevice.dumpNumeric(digit);
        this.gateCHAR_GATE.value = 0;
        this.gateRESP_GATE.value = 1;

        if (this.regOR2.binaryValue % 20000 == 19999) {
            this.gateEND_OF_MODULE.value = 1;
        }

        if (eob && this.gateEND_OF_MODULE.value) {
            this.ioRelease();
        }
    }

    /**************************************/
    async writeNumerically(digit) {
        /* Executes one digit cycle of Write Numerically (WN, 38). If the digit
        matches a record mark or RELEASE occurs, terminate the I/O */

        if ((digit & Envir.numRecMark) == Envir.numRecMark) { // it's more complicated than this for cards...
            this.ioRelease();
        } else {
            this.gateRESP_GATE.value = 0;
            this.gateCHAR_GATE.value = 1;

            let eob = await this.ioDevice.writeNumeric(digit);
            this.gateCHAR_GATE.value = 0;
            this.gateRESP_GATE.value = 1;
        }
    }

    /**************************************/
    async writeAlphanumerically(digitPair) {
        /* Executes one character cycle of Write Numerically (WN, 39). If the
        character matches a record or group mark, or RELEASE occurs, terminate
        the I/O */

        if ((digitPair & Envir.numRecMark) == Envir.numRecMark) { // it's more complicated than this for cards...
            this.ioRelease();
        } else {
            this.gateRESP_GATE.value = 0;
            this.gateCHAR_GATE.value = 1;

            let eob = await this.ioDevice.writeAlpha(digitPair);
            this.gateCHAR_GATE.value = 0;
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
                this.ioRelease();
                this.startRunning();
                break;

            case -2:    // CORR key
                reply = code;
                this.regOR2.decr(readNumeric ? 1 : 2);
                break;

            case -3:    // FLG key
                if (readNumeric) {
                    reply = code;
                }
                break;

            case -4:    // INSERT key -- can't be used while I/O in progress
                break;

            default:    // some character
                this.gateRESP_GATE.value = 1;
                if (readNumeric) {
                    let char = Processor.twprASCIInumeric1620[String.fromCharCode(code)];
                    if (char !== undefined) {
                        if (flagged) {
                            this.gateIO_FLAG.value = 1;
                            reply = Envir.oddParity5[char | Register.flagMask];
                        } else {
                            reply = Envir.oddParity5[char];
                        }

                        this.regMAR.value = this.regOR2.value;
                        this.fetch();
                        this.regMIR.setDigit(this.regMAR.isEven, reply);
                        this.store();
                        this.regOR2.incr(1);
                        if (this.gateINSERT.value && this.regMAR.binaryValue == 99) {
                            this.ioRelease();
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

                        // Simulate the problem with even starting addresses. This is
                        // just a guess to what happened, and probably not a good one.
                        if (this.regMAR.isEven) {
                            [even, odd] = [odd, even];
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

            this.envir.tick();                  // advance the throttling clock
            this.envir.tick();                  // by 2 memory cycles
            this.gateRESP_GATE.value = 0;
            this.gateIO_FLAG.value = 0;
            this.envir.startTiming();           // restart the throttling clock (because Typewriter is so slow)
        } else if (code == -4) {        // INSERT key
            reply = code;
            this.insert();              // will check for MANUAL mode, etc.
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
            let code = 0;               // 1620 internal character code

            this.gateRESP_GATE.value = 1;
            if (readNumeric) {
                let code = Processor.cardASCIInumeric1620[char];
                if (code === undefined) {
                    this.ioReadCheckPending = true;
                    code = 0;
                } else if (code & Register.flagMask) {
                    this.gateIO_FLAG.value = 1;
                }

                this.regMAR.value = this.regOR2.value;
                this.fetch();
                this.regMIR.setDigit(this.regMAR.isEven, Envir.oddParity5[code]);
                this.store();
                this.regOR2.incr(1);
                if (this.gateINSERT.value && this.regMAR.binaryValue == 99) {
                    this.ioRelease();
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

                // Simulate the problem with even starting addresses. This is
                // just a guess to what happened, and probably not a good one.
                if (this.regMAR.isEven) {
                    [even, odd] = [odd, even];
                }

                // Preserve any flags already in memory.
                this.regMIR.setDigit(1, Envir.oddParity5[(this.regMIR.even & Register.flagMask) | even]);
                this.regMIR.setDigit(0, Envir.oddParity5[(this.regMIR.odd  & Register.flagMask) | odd]);
                this.store();
                this.regOR2.incr(2);
            }

            this.envir.tick();                  // advance the throttling clock
            this.envir.tick();                  // by 2 memory cycles
            this.gateRESP_GATE.value = 0;
            this.gateIO_FLAG.value = 0;
            if (lastCol) {
                if (this.ioReadCheckPending) {
                    this.ioReadCheckPending = false;
                    this.ioReadCheck.value = 1;
                    if (this.ioStopSwitch) {
                        this.checkStop("CardReader read check");
                        return;
                    }
                }

                this.ioRelease();               // will reset INSERT if it's set
                this.startRunning();            // exit Limbo state
            }
        }
    }

    /**************************************/
    ioExit() {
        /* Terminates an I/O operation, resetting state */

        this.gateIO_FLAG.value = 0;     // not sure about this...
        this.gateRESP_GATE.value = 0;   // not sure about this, either...
        this.gateRD.value = 0;
        this.gateWR.value = 0;
        this.gateCHAR_GATE.value = 0;
        this.gateRESP_GATE.value = 0;   // not sure about this...
        this.ioDevice = null;
        this.ioSelectNr = 0;
        this.ioVariant = 0;
        this.gateTWPR_SELECT.value = 0;
        this.gateREAD_INTERLOCK.value = 0;
        this.gateWRITE_INTERLOCK.value = 0;
        this.envir.startTiming();       // reset the emulation clock
    }

    /**************************************/
    ioRelease() {
        /* Releases any currently-active I/O operation */

        if (this.gateRD.value || this.gateWR.value) {
           this.gateREL.value = 1;
           this.gateINSERT.value = 0;
           this.ioExit();
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
            this.oFlowArithCheck.value = 0;
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
                    this.parity.MBREvenCheck.value | this.parityMBROddCheck.value |
                    this.ioPrinterCheck.value | this.diskAddrCheck.value |
                    this.diskWRLRBCCheck.value | this.diskCylOflowCheck.value;
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
            isSet = this.diskWRLRBCCheck.value;
            this.diskWRLRBCCheck.value = 0;
            break;
        case 38:        // 1311 Cylinder Overflow
            isSet = this.diskCylOflowCheck.value;
            this.diskCylOflowCheck.value = 0;
            break;
        case 39:        // 1311 Any Disk Error (36, 37, 38)
            isSet = this.diskAddrCheck.value | this.diskWRLRBCCheck.value | this.diskCylOflowCheck.value;
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
        this.gateAUTOMATIC.value = 0;
        this.gateRUN.value = 0;
        if (this.gateSTOP.value) {
            this.enterManual();
            this.gateSTOP.value = 0;
        }

        if (this.gateEZ.value) {
            this.gateHP.value = 0;
        }

        if (!(this.gateSAVE_CTRL.value || this.gateDISPLAY_MAR.value ||
                this.gateINSERT.value || this.gateCLR_MEM.value)) {
            this.setProcState(procStateI1);
        }
    }

    /**************************************/
    resetICycle() {
        /* Resets processor state at the beginning of an I-Cycle,  */

        this.gate1ST_MPLY_CYCLE.value = 0;
        this.gate2_DIG_CNTRL.value = 0;
        this.gateADD_ENT.value = 0;
        this.gateADD_MODE.value = 0;
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

        this.gateI_CYC_ENT.value = 0;
        if (this.gateBR_EXEC.value) {
            this.regMAR.value = this.regIR1.value = this.regOR2.value;
            this.gateBR_EXEC.value = 0;
        } else {
            this.regMAR.value = this.regIR1.value;
        }

        this.fetch();

        this.regOP.value = this.regMBR.value;
        this.gateP.value = 1;                   // now working on the P address
        this.regOR1.clear();
        this.regOR2.clear();
        this.regOR3.clear();
        this.regPR2.clear();
        this.regXBR.clear();
        this.regXR.clear();
        this.gateAUTOMATIC.value = 1;

        this.regIR1.incr(2);
        this.opBinary = this.regMBR.binaryValue;

        // If the op code is 0, go immediately into MANUAL to halt at the end of
        // this cycle. The state will advance to I-2. If START is then pressed,
        // this will cause a MAR check stop in I-2 due to the invalid op code.
        // Not sure the 1620-2 actually worked this way, but the result is
        // what's expected.
        if (this.opBinary == 0) {
            this.enterManual();
        }

        this.setProcState(procStateI2);
    }

    /**************************************/
    stepICycle2() {
        /* Executes I-Cycle 2. If the op code is 42 (BB), sets IR1 based on the
        SAVE gate and terminates the instruction to effect the branch. Otherwise,
        loads the P2/P3 digits to the MARS registers. Sets the 4-bit in XR from
        the P3 flag as necessary. Steps to I-Cycle 3 */

        this.opIndexable = this.opAtts[this.opBinary].pIX &&
                (this.gateIX_BAND_1.value || this.gateIX_BAND_2.value);

        switch (this.opBinary) {
        case 0:                                 // 00=(invalid op code from I-1)
            this.marCheck(`I-2 invalid op code 00 @${this.regIR1.binaryValue-2}`);
            break;

        case 42:                                // 42=BB, Branch Back
            // ?? MAR Check Stop if no prior BT instruction or SAVE control ?? Mod2 Ref p.38 vs Germain p.97
            if (this.gateSAVE.value) {
                this.gateSAVE.value = 0;
                this.regIR1.value = this.regPR1.value;
            } else {
                this.regIR1.value = this.regIR2.value;
                this.regIR2.clear();
            }
            enterICycle();
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
        this.regDR.even = mbrOdd;
        this.regDR.odd = 0;
        this.regPR1.clear();
        if ((mbrEven & Register.flagMask) &&
                this.opAtts[this.opBinary].pIA && this.gateIA_SEL.value) {
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
        this.opIndexable = this.opAtts[this.opBinary].qIX &&
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
            this.regDR.value = this.regMBR.value;
            break;

        case 60:        // BS, Branch and Select
            break;                              // do nothing in I-5

        default:
            if (!this.opAtts[this.opBinary].immed) {    // don't load OR-1 for immediate ops in I-5
                let drOdd = this.regDR.odd = this.regDR.even;   // shift DR even to DR odd
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
            this.ioSelect(this.regDR.binaryValue, this.regMBR.odd & Register.bcdMask);
            break;
        case 36:        // RN, Read Numerically
        case 37:        // RA, Read Alphanumerically
            this.gateRD.value = 1;
            this.ioSelect(this.regDR.binaryValue, this.regMBR.odd & Register.bcdMask);
            break;
        case 35:        // DN, Dump Numerically
        case 38:        // WN, Write Numerically
        case 39:        // WA, Write Alphanumerically
            this.gateWR.value = 1;
            this.ioSelect(this.regDR.binaryValue, this.regMBR.odd & Register.bcdMask);
            break;

        case 46:        // BI, Branch Indicator
            if (this.testIndicator()) {
                this.gateBR_EXEC.value = 1;
                this.enterICycle();
            }
            break;

        case 47:        // BNI, Branch No Indicator
            if (!this.testIndicator()) {
                this.gateBR_EXEC.value = 1;
                this.enterICycle();
            }
            break;

        case 60:        // Branch and Select - set indexing and indirect addressing modes
            switch (mbrOdd & Register.bcdMask) {
            case 0:     // turn off indexing
            case 1:     // set index Band 1
            case 2:     // set index Band 2
                this.gateIX_BAND_1.value = mbrOdd & 1;
                this.gateIX_BAND_2.value = mbrOdd & 2;
                break;
            case 8:     // turn off indirect addressing
            case 9:     // turn on indirect addressing
                this.gateIA_SEL.value = mbrOdd & 1;
                break;
            }
            this.gateBR_EXEC.value = 1;
            this.enterICycle();
            break;

            case  7:        // BTFL, Branch and Transmit Floating
            case 17:        // BTM, Branch and Transmit Immediaate
            case 27:        // BT, Branch and Transmit
                this.regIR2.value = this.regIR1.value;
                this.regIR2.incr(2);                // address of next instruction
                //--no break
        default:
            if (this.opAtts[this.opBinary].immed) {     // set OR-1 to Q11 addr for immediate ops
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
                this.opAtts[this.opBinary].qIA && this.gateIA_SEL.value) {
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
        this.regDR.odd = this.regXBR.getDigit(mq);
        let sum = this.addDigits(addend);       // leaves the sum in DR odd
        this.gateCARRY_IN.value = this.gateCARRY_OUT.value;
        this.regXBR.setDigit(mq, sum);
        if (mq < 4) {                   // if there are more digits, decrement PR2
            this.regPR2.value = this.regMAR.value;
            this.regPR2.decr(1);
        } else {                        // otherwise, set the appropriate address registers and finish
            if (this.gateP.value) {
                this.regOR2.value = this.regOR3.value = this.regXBR.value;
            } else {
                this.regOR1.value = this.regXBR.value;
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
            this.regOR2.value = this.regOR3.value = this.regXBR.value;
        } else {
            this.regOR1.value = this.regXBR.value;
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
            case 34:
                this.enterLimbo();      // stop run() while control() runs async
                if (!this.ioDevice) {
                    this.gateWRITE_INTERLOCK.value = 1;
                } else {
                    this.ioDevice.control(this.ioVariant).then(() => {
                        this.ioRelease();
                        this.startRunning();    // exit Limbo state
                    });
                }
                break;
            case 36:        // RN, Read Numerically
            case 37:        // RA, Read Alphanumerically
                this.enterLimbo();      // device will trigger the memory cycles
                if (!this.ioDevice) {
                    this.gateREAD_INTERLOCK.value = 1;
                } else {
                    if (this.ioSelectNr == 3 || this.ioSelectNr == 5) {
                        this.gateREAD_INTERLOCK.value = 1;      // card or paper tape
                    }
                    this.ioDevice.initiateRead();
                }
                break;
            case 35:        // DN, Dump Numerically
            case 38:        // WN, Write Numerically
            case 39:        // WA, Write Alphabetically
                if (!this.ioDevice) {
                    this.gateWRITE_INTERLOCK.value = 1;
                    this.enterLimbo();
                } else {
                    this.enterECycle();
                }
                break;
            case 41:        // NOP, No Operation
                this.enterICycle();
                break;
            case 48:        // H, Halt
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
    enterTransmit() {
        /* Sets up execution for the transmit-like ops: TF, TFM, TD, TDM, TR,
        TRNM, ADD, SUB */

        // ?? reset false xmit entry ??
        // ?? reset LD clear exit ??
        // ?? reset P scan to result xmit ??
        this.gateEXMIT_ENT.value = 1;
        this.gateEXMIT_MODE.value = 1;
        this.gate1ST_CYC.value = 1;
        this.gateFIELD_MK_1.value = 0;
        this.gateFIELD_MK_2.value = 0;
        this.gateRECOMP.value = 0;
    }

    /**************************************/
    enterECycle() {
        /* Initiates the start of the current instruction E-cycles */
        let atts = this.opAtts[this.opBinary];

        this.gateE_CYC_ENT.value = 1;
        this.gateIX.value = 0;
        if (!atts.opValid) {
            this.marCheck(`enterECycle invalid op code=${this.opBinary} @${this.regIR1.binaryValue-12}`);
            return;
        }

        switch (this.opBinary) {
        case 15:        // TDM - Transmit Digit Immediate
        case 25:        // TD - Transmit Digit
            this.enterTransmit();
            this.setProcState(procStateE1);
            break;

        default:
              let initialEState = atts.eState;
            if (initialEState) {
                this.setProcState(procStateE1 + initialEState - 1);
            } else {
                // ?? DEBUG ?? For now, just go back to I-Cycles.
                this.gateE_CYC_ENT.value = 0;
                this.enterICycle();
            }
            break;
        }
    }

    /**************************************/
    stepECycle1() {
        /* Executes E-Cycle 1 - processes data at the OR1 (Q) address */
        let digit = 0;
        let dx = this.regOR1.isEven;    // digit index: 0/1

        this.gateE_CYC_ENT.value = 0;
        this.regMAR.value = this.regOR1.value;
        this.fetch();

        switch (this.opBinary) {
        case 15:        // TDM - Transmit Digit Immediate
        case 25:        // TD - Transmit Digit
            this.regDR.even = this.regMBR.even;
            if (!dx) {
                this.gate2_DIG_CNTRL.value = 1; // process 2 digits at a time
                this.regDR.odd = this.regMBR.odd;
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
            if ((this.regMBR.getDigit(dx) & Envir.numRecMark) != numRecMark) {
                this.gateBR_EXEC.value = 1;
            }
            this.enterICycle();
            break;

        case 55:        // BNG - Branch No Group Mark
            if ((this.regMBR.getDigit(dx) & Envir.bcdMask) != numGroupMark) {
                this.gateBR_EXEC.value = 1;
            }
            this.enterICycle();
            break;

        case 71:        // MF - Move Flag
            digit = this.regMBR.getDigit(dx);
            if (digit & Register.flagMask) {
                this.gateFIELD_MARK_1.value = 1;
                this.regMIR.setDigitFlag(dx, 0);
                this.store();
            }
            this.regOR1.decr(1);
            this.setProcState(procStateE2);
            break;

        default:
            this.panic(`E-1 op not implemented ${this.opBinary}`);
            break;
        }
    }

    /**************************************/
    async stepECycle2() {
        /* Executes E-Cycle 2 - processes data at the OR2 (P) address */
        let dx = this.regOR2.isEven;    // digit index: 0/1

        this.gateE_CYC_ENT.value = 0;
        this.regMAR.value = this.regOR2.value;
        this.fetch();

        switch (this.opBinary) {
        case 15:        // TDM - Transmit Digit Immediate
        case 25:        // TD - Transmit Digit
            if (!this.gate2_DIG_CNTRL.value) {
                this.regDR.odd = this.regDR.even;
            }
            this.regMIR.setDigit(dx, this.regDR.odd);
            this.store();
            this.enterICycle();
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
            await this.dumpNumerically(this.regMBR.getDigit(dx));
            this.regOR2.incr(1);
            break;

        //case 36:      // RN - Read Numerically (runs in Limbp)
        //case 37:      // RA - Read Alphanumerically (runs in Limbo)

        case 38:        // WN - Write Numerically
            await this.writeNumerically(this.regMBR.getDigit(dx));
            this.regOR2.incr(1);
            break;

        case 39:        // WA - Write Alphanumerically
            await this.writeAlphanumerically(this.regMBR.value);
            this.regOR2.incr(2);
            break;

        case 71:        // MF - Move Flag
            if (this.regMBR.getDigitFlag(dx) ^ this.gateFIELD_MK_1.value) {
                this.regMIR.setDigitFlag(dx, this.gateFIELD_MK_1.value);
                this.store();
            }
            this.regOR2.decr(1);
            this.setProcState(procStateE2);
            break;

        default:
            this.panic(`E-2 op not implemented ${this.opBinary}`);
            break;
        }
    }

    /**************************************/
    stepECycle3() {
        /* Executes E-Cycle 3 */

        this.panic("E-3 not implemented");
    }

    /**************************************/
    stepECycle4() {
        /* Executes E-Cycle 4 */

        this.panic("E-4 not implemented");
    }

    /**************************************/
    stepECycle5() {
        /* Executes E-Cycle 5 */

        this.panic("E-5 not implemented");
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
    startRunning() {
        /* Starts the normal memory cycle. The next processor state must have
        already been established. This simply calls run() (and restarts the
        throttling clock), but does so as the result of a promise fulfilling,
        so that instead of running on top of us in the stack, it's called from
        the JavaScript event loop, allowing the functions below us in the stack
        to exit back into the event loop first. This avoids needless stack
        buildup and prevents recursive run() calls in I/O */

        if (!this.gateMANUAL.value) {
            Promise.resolve().then(() => {this.run()});
        }
    }

    /**************************************/
    enterLimbo() {
        /* Stops processing by setting this.procState to procStateLimbo. This
        will cause this.run() to exit but leave the Processor in AUTOMATIC and
        not MANUAL mode. Typically used for read/write interlock conditions.
        To get out of this, you'll need to call startRunning(), or do RELEASE
        and RESET then manually restart the system */

        this.setProcState(procStateLimbo);
    }

    /**************************************/
    enterManual() {
        /* Places the processor in Manual mode */

        this.gateMANUAL.value = 1;
        this.gateRUN.value = 0;
        this.gateCLR_CTRL.value = 0;
    }

    /**************************************/
    checkStop(msg) {
        /* Turns on the CHECK STOP lamp, enters MANUALmode, and logs "msg" */

        this.gateCHECK_STOP.value = 1;
        this.gateAUTOMATIC.value = 0;
        this.enterManual();
        console.info(`>>CHECK STOP: ${msg}`);
    }

    /**************************************/
    verifyCheckStop() {
        /* Examines all of the conditions that can cause a check stop and turns
        off the lamp if none exist any longer */

        let disk = this.diskAddrCheck.value || this.diskCylOflowCheck.value || this.diskWRLRBCCheck.value;
        let parity = this.parityMARCheck.value || this.parityMBREvenCheck.value || this.parityMBROddCheck.value;
        let io = this.ioPrinterCheck.value || this.ioReadCheck.value || this.ioWriteCheck.value;
        let oflow = this.oflowArithCheck.value || this.oflowExpCheck.value;

        if (!(disk && this.diskStopSwitch) && !(parity && this.parityStopSwitch) &&
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

        this.parityMARCheck.value = 1;
        this.checkStop(msg);
    }

    /**************************************/
    mbrCheck(which, msg) {
        /* Sets one of the MBR parity lamps based on "which" (0=Even, 1=Odd) */

        if (which) {
            this.parityMBROddCheck.value = 1;
        } else {
            this.parityMBREvenCheck.value = 1;
        }

        if (this.parityStopSwitch.value) {
            this.checkStop(msg);
        }
    }

    /**************************************/
    async run() {
        /* Main execution control loop for the processor. Does one iteration per
        memory cycle until the Processor is put in MANUAL mode. Attempts to
        throttle performance to approximate that of a real 1620. Executes memory
        cycles until some sort of stop condition is detected */

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
                this.updateLampGlow(1);
                return;             // exit into Limbo state
                break;

            default:
                this.panic(`>>INVALID PROC STATE: ${this.procState}`);
                break;
            }

            // Increment the emulation clock and note whether it's time to
            // throttle performance. We need to increment after the register and
            // flip-flop states have been set so that register their glow values
            // will be computed properly.
            if (this.gateRD.value || this.gateWR.value) {
                this.envir.startTiming();
            } else if (this.envir.tick()) {
                await this.envir.throttle();
            }
        } while (!this.gateMANUAL.value);

        this.updateLampGlow(1);         // freeze current state in the lamps
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

        this.checkReset();
        this.ioPrinterChannel9.value = 0;
        this.ioPrinterChannel12.value = 0;

        this.gateSTOP.value = 0;
        this.enterICycle();
        this.enterManual();             // will turn off this.gateRUN
        this.updateLampGlow(1);
    }

    /**************************************/
    checkReset() {
        /* Resets the internal processor state by the CHECK RESET key */

        this.diskAddrCheck.value = 0;
        this.diskCylOflowCheck.value = 0;
        this.diskWRLRBCCheck.value = 0;
        this.ioPrinterCheck.value = 0;
        this.ioReadCheck.value = 0;
        this.ioWriteCheck.value = 0;
        this.parityMARCheck.value = 0;
        this.parityMBREvenCheck.value = 0;
        this.parityMBROddCheck.value = 0;
        this.gateCHECK_STOP.value = 0;
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
            this.updateLampGlow(1);
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
            this.updateLampGlow(1);

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
            this.gateSAVE_CTRL.value = 1;
            this.gateSAVE.value = 1;
            this.gateRUN.value = 1;
            this.regPR1.value = this.regIR1.value;
            this.updateLampGlow(1);
        }
    }

    /**************************************/
    insert(cardLoad) {
        /* Initiates input from the typewriter via the INSERT key (cardLoad=false)
        or the CardReader LOAD button (cardLoad=true) */

        if (this.gatePOWER_ON.value && this.gateMANUAL.value && !this.gateAUTOMATIC.value) {
            this.gateINSERT.value = 1;
            this.gateAUTOMATIC.value = 1;
            this.gateREL.value = 0;
            this.regOP.binaryValue = this.opBinary = 36; // RN, Read Numerically
            this.ioSelect((cardLoad ? 5 : 1), 0);        // select card or typewriter
            if (!this.gateRD.value) {   // not sure about this...
                this.gateRD.value = 1;
                this.gate1ST_CYC.value = 1;
                this.gateMANUAL.value = 0;
                this.gateRUN.value = 1;
            }

            this.enterLimbo();
            this.envir.tick();      // pretend to do a delayed 1st cycle
            this.gate1ST_CYC.value = 0;
            this.gateBR_EXEC.value = 0;
            this.regIR1.clear();
            this.regOR2.clear();
            this.regMAR.clear();

            this.ioDevice.initiateRead();
            this.updateLampGlow(1);
        }
    }

    /**************************************/
    release() {
        /* Releases any currently-active I/O operation */

        if (this.gatePOWER_ON.value && (this.gateRD.value || this.gateWR.value)) {
            this.gateSTOP.value = 1;
            this.ioRelease();           // STOP will force MANUAL mode in I-Cycle Entry
            this.updateLampGlow(1);
        }
    }

    /**************************************/
    start() {
        /* Initiates the processor on the Javascript thread */

        if (this.gatePOWER_ON.value && this.gateMANUAL.value) {
            this.gateSCE.value = 0;     // reset single-cycle mode
            this.gateSAVE_CTRL.value = 0;
            this.gateMANUAL.value = 0;
            this.gateRUN.value = 1;
            // gate 1621 read cluch
            // gate I/O resp
            // gate run clock
            if (this.gateCLR_MEM.value) {
                this.clearMemory();     // async -- returns immediately
            } else {
                this.startRunning();
            }
        }
    }

    /**************************************/
    stopSIE() {
        /* If the processor is running, stops it at the end of the current
        instruction. If the processor is already in manual mode, executes the
        next instruction, then stops the processor */

        if (this.gatePOWER_ON.value) {
            this.gateSTOP.value = 1;    // stop processor at end of current instruction
            if (this.gateMANUAL.value) {
                this.gateMANUAL.value = 0;
                this.startRunning();    // async - singe-step one instruction
            }
        }
    }

    /**************************************/
    stopSCE() {
        /* If the processor is running, stops it at the end of the current
        memory cycle, but leaves it in automatic mode, even though MANUAL is also
        set. Otherwise, executes the next memory cycle, then stops the processor */

        if (this.gatePOWER_ON.value) {
            // also enabled by INSERT, SAVE, DISPLAY MAR, not AUTO, RELEASE, SCE ??
            this.gateSCE.value = 1;     // single memory-cycle latch
            if (this.gateMANUAL.value) {
                // Singe-step one memory cycle (ignoring that we're in MANUAL mode).
                this.run();
            } else {
                // Stop processor after next memory cycle.
                this.gateMANUAL.value = 1;
                this.updateLampGlow(1);
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
            this.envir.startTiming();
            this.gatePOWER_ON.value = 1;
            this.gateMANUAL.value = 1;                  // must be set for manualReset()
            this.manualReset();
            this.gateIA_SEL.value = 1;                  // enable indirect addressing
            this.devices = this.context.devices;        // I/O device objects
            this.loadMemory();                          // >>> DEBUG ONLY <<<
            this.updateLampGlow(1);
        }
    }

    /**************************************/
    powerDown() {
        /* Powers down the processor */

        this.ioRelease();
        this.enterManual();                             // stop immediately
        this.gatePOWER_ON.value = false;
        this.gatePOWER_READY.value = false;
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

            let d = 0;
            let odd = addr & 1;

            this.regMAR.binaryValue = addr;
            this.regMIR.value = this.MM[addr >> 1];

            for (let c of digits.toUpperCase()) {
                if (c != " ") {
                    if (numRex.test(c)) {
                        d = c.charCodeAt(0) - zero;
                    } else if (flagRex.test(c)) {
                        d = (c.charCodeAt(0) - flagZero) | Register.flagMask;
                    } else {
                        switch (c) {
                        case "#":
                            d = 0xA;    // record mark
                            break;
                        case "$":
                            d = 0xB;    // (unassigned)
                            break;
                        case "_":
                            d = 0xC;    // numeric blank
                            break;
                        case "%":
                            d = 0xD;    // (unassigned)
                            break;
                        case "&":
                            d = 0xE;    // (unassigned)
                            break;
                        default:
                            d = 0xF;    // Group Mark
                            break;
                        }
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

        // ?? DEBUG ?? I-Cycle testing
        loadMemory(0,
            "49 00988 99999");  //  0000 B      988,99999       branch to 988 to start test

        loadMemory(200,
            "0@1A2B3C4D5E6F7G8H9I #$_%&|");

        loadMemory(300,         // load index registers
            "88888 00000 00000 00000 00000 00000 00000 00000" +         // Band 1: IX 0-7
            "99999 1010A 00015 00010 00000 00000 00000 00000");         // Band 2: IX 0-7

        loadMemory(900,         // Indirect Addresses
            "01084 0091D 01084 00IBD 99999 88888 77777 66666 55555 44444 33333 22222 11111");

        loadMemory(988,
            "60 01000 00008" +  //  0988 BS     1000,8          branch to 1000, reset IA mode
            "41 23456 78901" +  //  1000 NOP    23456,78901     no-op
            "32 00950 99999" +  //  1012 SF     99,99999        set flag
            "33 00950 77777" +  //  1024 CF     99,77777        clear flag
            "60 0104H 00002" +  //  1036 BS     -1048,2         set IX band 2 (IA disabled)
            "60 01060 00009" +  //  1048 BS     1060,8          set IA mode
            "46 0090D 01100" +  //  1060 BI     -900,11         branch on H/P, indirect through 904 => 1084
            "47 0090I 01100" +  //  1072 BNI    -909,11         branch on not H/P, indirect through 909 to 914 => 1084
            "48 222B2 00I0D" +  //  1084 H      22222(B1),-904(B2) halt: P=22222+(-10101) => 12121, Q=(see below)
            "34 00000 00102" +  //  1096 K      0,102           carriage return
            "34 00000 00102" +  //  1108 K      0,102           carriage return again
            "35 00000 00100" +  //  1120 DNTY   0,100           dump numerically 00000 to typewriter
            "34 00000 00104" +  //  1132 K      0,104           index carriage
            "35 19990 00100" +  //  1144 DNTY   19990,102       dump numerically 19990 to typewriter
            "34 00000 00102" +  //  1156 K      0,102           carriage return
            "34 00000 00108" +  //  1168 K      0,108           tabulate
            "38 00200 00100" +  //  1180 WNTY   200,100         write numerically
            "34 00000 00108" +  //  1192 K      0,108           tabulate
            "39 00200 00100" +  //  1204 WATY   200,100         write alphanumerically
            "34 00000 00102" +  //  1216 K      0,102           carriage return
            "34 00000 00102" +  //  1228 K      0,102           carriage return again

            // The Brent Marsh Memorial Group Mark Challenge of 1968

            "15 19999 0000|" +  //  1240 TDM    19999,GM        transmit group mark to 19999
            "35 19999 00100" +  //  1252 DNTY   19999,100       dump the group mark
            "47 01240 00100" +  //  1264 BNI    1252,1          branch unless PS1 is on
            "34 00000 00102" +  //  1276 K      0,102           carriage return

            "48 77777 99999" +  //  1288 H      77777,99999     halt again
            "49 00988 33333"    //  1300 B      988,33333       branch to beginning
        );
                        // @1084: Q = -904(B2=15) = -919 indirect to -924(B3=10) = -934 indirect => 77777

        this.regMAR.clear();
        this.regMIR.clear();
    }

} // class Processor


// Static class properties

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
    "#": Envir.numRecMark};

// CardReader numeric input keystroke digit codes.
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
    "~": 0 | Register.flagMask,
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
    "(": 0o14,
    ")": 0o14,
    "=": 0o13,
    "*": 0o14 | Register.flagMask,
    "-": 0 | Register.flagMask,
    "+": 0 | Register.flagMask,
    "#": Envir.numRecMark,
    "%": Envir.numGroupMark,
    "$": 0o13 | Register.flagMask,
    " ": 0,
    "\"":Envir.numRecMark | Register.flagMask,
    "&": Envir.numGroupMark | Register.flagMask};

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
    "#": 0o00_12,       // record mark
    "\"":0o05_12,       // flagged record mark
    "%": 0o00_17,       // group mark
    "&": 0o05_17,       // flagged group mark
    "~": 0o05_00,       // flagged zero (code 50)
    "^": 0o02_06};      // the "special" character (code 26)
