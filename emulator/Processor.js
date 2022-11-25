/***********************************************************************
* retro-1620/emulator Processor.js
************************************************************************
* Copyright (c) 2022, Paul Kimpel.
* Licensed under the MIT License, see
*       http://www.opensource.org/licenses/mit-license.php
************************************************************************
* JavaScript class module for the 1620 processor.
*
*
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
const procStateNone = 0;
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
        this.envir = new Envir();

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
        this.gateIX =               new FlipFlop(this.envir, true);
        this.gateI_1 =              new FlipFlop(this.envir, true);
        this.gateI_2 =              new FlipFlop(this.envir, true);
        this.gateI_3 =              new FlipFlop(this.envir, true);
        this.gateI_4 =              new FlipFlop(this.envir, true);
        this.gateI_5 =              new FlipFlop(this.envir, true);
        this.gateI_6 =              new FlipFlop(this.envir, true);

        this.procStateGates = [null,
            this.gateI_1, this.gateI_2, this.gateI_3, this.gateI_4, this.gateI_5, this.gateI_6,
            this.gateINDEXING, this.gateIA_1, this.gateIA_2, this.gateIA_3,
            this.gateE_1, this.gateE_2, this.gateE_3, this.gateE_4, this.gateE_5];

        // Operator Control Panel Indicators
        this.powerOn =              new FlipFlop(this.envir, true);
        this.powerReady =           new FlipFlop(this.envir, true);
        this.thermal =              new FlipFlop(this.envir, true);
        this.writeInterlock =       new FlipFlop(this.envir, true);
        this.readInterlock =        new FlipFlop(this.envir, true);
        this.save =                 new FlipFlop(this.envir, true);
        this.typewriterSelected =   new FlipFlop(this.envir, true);
        this.rfe1 =                 new FlipFlop(this.envir, true);
        this.rfe2 =                 new FlipFlop(this.envir, true);
        this.rfe3 =                 new FlipFlop(this.envir, true);
        this.automatic =            new FlipFlop(this.envir, true);
        this.manual =               new FlipFlop(this.envir, true);
        this.checkStop =            new FlipFlop(this.envir, true);

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

        // Internal Control Gates & Registers
        this.gateSCE =              new FlipFlop(this.envir, false);    // single-cycle execute
        this.gateINDEXING =         new FlipFlop(this.envir, false);    // indexing P/Q in progress

        this.regXBR =               new Register(5, this.envir, false, true,  true);

        // Console Registers
        this.regDREven =            new Register(1, this.envir, true,  true,  false);
        this.regDROdd =             new Register(1, this.envir, true,  true,  false);
        this.regMAR =               new Register(5, this.envir, true,  true,  false);
        this.regMBREven =           new Register(1, this.envir, true,  false, true);
        this.regMBROdd =            new Register(1, this.envir, true,  false, true);
        this.regMIREven =           new Register(1, this.envir, true,  true,  true);
        this.regMIROdd =            new Register(1, this.envir, true,  true,  true);
        this.regMQ =                new Register(1, this.envir, true,  true,  false);
        this.regOPEven =            new Register(1, this.envir, true,  true,  false);
        this.regOPOdd =             new Register(1, this.envir, true,  true,  false);
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

        // Core Memory
        this.MM = new Uint16Array(new ArrayBuffer(Envir.memorySize));

        // Op Code Attributes
        this.opBinary = 0;                              // binary value of current op code
        this.opIndexable = 0;                           // op code is valid for indexing addresses
        this.opAtts = new Array(100);                   // op code attributes table

        // General emulator state
        this.procState = procStateNone;                 // processor instruction load/execute state
        this.tracing = false;                           // trace command debugging

        // I/O Subsystem
        this.ioTimer = new Timer();                     // general timer for I/O operations
        this.ioPromise = Promise.resolve();             // general Promise for I/O operations

        // Bound Methods

        // Initialization
        this.gateIA_SEL.value = 1;                      // enable indirect addressing at power-on


        let buildOpAtts = (opValid, pAddr, qAddr, pIA, qIA, pIX, qIX, immed, branch, fp, index, binary, edit, qa4, opCode) => {
            this.opAtts[opCode] = {
                opValid, pAddr, qAddr, pIA, qIA, pIX, qIX, immed, branch, fp, index, binary, edit, qa4};
        };

        //          v pa qa pi qi px qx im br fp ix bi ed q4  op
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  0);      // 00
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0,  1);      // 01 FADD
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0,  2);      // 02 FSUB
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0,  3);      // 03 FMUL
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  4);      // 04
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0,  5);      // 05 FSL
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0,  6);      // 06 TFL
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0,  7);      // 07 BTFL
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0,  8);      // 08 FSR
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0,  9);      // 09 FDIV
        buildOpAtts(1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 10);      // 10 BTAM
        buildOpAtts(1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 11);      // 11 AM
        buildOpAtts(1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 12);      // 12 SM
        buildOpAtts(1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 13);      // 13 MM
        buildOpAtts(1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 14);      // 14 CM
        buildOpAtts(1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 15);      // 15 TDM
        buildOpAtts(1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 16);      // 16 TFM
        buildOpAtts(1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 17);      // 17 BTM
        buildOpAtts(1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 18);      // 18 LDM
        buildOpAtts(1, 1, 1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 19);      // 19 DM
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 20);      // 20 BTA
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 21);      // 21 A
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 22);      // 22 S
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 23);      // 23 M
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 24);      // 24 C
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 25);      // 25 TD
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 26);      // 26 TF
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 27);      // 27 BT
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 28);      // 28 LD
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 29);      // 29 D
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 30);      // 30 TRNM
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 31);      // 31 TR
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 32);      // 32 SF
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 33);      // 33 CF
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 34);      // 34 K
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 35);      // 35 DN
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 36);      // 36 RN
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 37);      // 37 RA
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 38);      // 38 WN
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 39);      // 39 WA
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 40);      // 40
        buildOpAtts(1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41);      // 41 NOP
        buildOpAtts(1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 42);      // 42 BB
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 43);      // 43 BD
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 44);      // 44 BNF
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 45);      // 45 BNR
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 46);      // 46 BI
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 47);      // 47 BNI
        buildOpAtts(1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 48);      // 48 H
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 49);      // 49 B
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 50);      // 50
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 51);      // 51
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 52);      // 52
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 53);      // 53
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 54);      // 54
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 55);      // 55 BNG
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 55);      // 55
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 57);      // 57
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 58);      // 58
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 59);      // 59
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 60);      // 60 BS
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 61);      // 61 BX
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 62);      // 62 BXM
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 63);      // 63 BCX
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 64);      // 64 BCXM
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 65);      // 65 BLX
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 0, 0, 66);      // 66 BLXM
        buildOpAtts(1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 67);      // 67 BSX
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 68);      // 68
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69);      // 69
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 70);      // 70 MA
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 71);      // 71 MF
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 72);      // 72 TNS
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 73);      // 73 TNF
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 74);      // 74
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 75);      // 75
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 76);      // 76
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 77);      // 77
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 78);      // 78
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 79);      // 79
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 80);      // 80
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 81);      // 81
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 82);      // 82
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 83);      // 83
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 84);      // 84
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 85);      // 85
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 86);      // 86
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 87);      // 87
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 88);      // 88
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 89);      // 89
        buildOpAtts(1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 90);      // 90 BBT
        buildOpAtts(1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 1, 91);      // 91 BMK
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 92);      // 92 ORF
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 93);      // 93 ANDF
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 94);      // 94 CPFL
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 95);      // 95 EORF
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 96);      // 96 OTD
        buildOpAtts(1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 97);      // 97 DTO
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 98);      // 98
        buildOpAtts(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 99);      // 99


    }


    /*******************************************************************
    *  Utility Methods                                                 *
    *******************************************************************/

    /**************************************/
    updateLampGlow(beta) {
        /* Updates the lamp glow for all registers and flip-flops in the
        system. Beta is a bias in the range (0,1). For normal update use 0;
        to freeze the current state in the lamps use 1 */
        let gamma = (this.gateSTOP ? 1 : beta || 0);

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
        this.thermal.updateLampGlow(gamma);
        this.writeInterlock.updateLampGlow(gamma);
        this.readInterlock.updateLampGlow(gamma);
        this.save.updateLampGlow(gamma);
        this.typewriterSelected.updateLampGlow(gamma);
        this.rfe1.updateLampGlow(gamma);
        this.rfe2.updateLampGlow(gamma);
        this.rfe3.updateLampGlow(gamma);
        this.automatic.updateLampGlow(gamma);
        this.manual.updateLampGlow(gamma);
        this.checkStop.updateLampGlow(gamma);

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
        this.regDREven.updateLampGlow(gamma);
        this.regDROdd.updateLampGlow(gamma);
        this.regMAR.updateLampGlow(gamma);
        this.regMBREven.updateLampGlow(gamma);
        this.regMBROdd.updateLampGlow(gamma);
        this.regMIREven.updateLampGlow(gamma);
        this.regMIROdd.updateLampGlow(gamma);
        this.regMQ.updateLampGlow(gamma);
        this.regOPEven.updateLampGlow(gamma);
        this.regOPOdd.updateLampGlow(gamma);
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

        if (addr >= Envir.memorySize) {
            this.parityMARCheck.value = 1;
            this.checkStop();
        } else {
            let pair = this.MM[addr >> 1];   // div 2
            this.regMBREven.value = (pair >> 8) & Register.digitMask;
            if (this.regMBREven.parityError) {
                this.parityMBREvenCheck.value = 1;
                if (this.parityStopSwitch) {
                    this.checkStop();
                }
            }

            this.regMBROdd.value = pair & Register.digitMask;
            if (this.regMBROdd.parityError) {
                this.parityMBROCheck.value = 1;
                if (this.parityStopSwitch) {
                    this.checkStop();
                }
            }
        }
    }

    /**************************************/
    store() {
        /* Stores the double-digit pair in MIR to memory at the MAR address */
        let addr = this.regMAR.binaryValue;

        if (addr >= Envir.memorySize) {
            this.parityMARCheck.value = 1;
            this.checkStop();
        } else {
            this.MM[addr >> 1] = (this.regMIRE.value << 8) | (this.regMIRO.value);
        }
    }


    /*******************************************************************
    *  Input/Output Subsystem                                          *
    *******************************************************************/

    /**************************************/
    async receiveInputCode(code) {
        /* Receives the next I/O code from an input device and either stores
        it onto the drum or acts on its control function */
        let eob = false;                // end-of-block flag

        this.drum.ioStartTiming();

        if ((this.OC.value & 0b01111) == 0) {
            eob = true;                         // canceled or invalid call
        } else {
            if (code & IOCodes.ioDataMask) {    // it's a data frame
                await this.drum.ioPrecessCodeTo23(code, 4);
                this.ioBitCount += 4;
            } else {
                switch(code & 0b00111) {
                case IOCodes.ioCodeMinus:       // minus: set sign FF
                    this.OS.value = 1;
                    break;
                case IOCodes.ioCodeCR:          // carriage return: shift sign into word
                case IOCodes.ioCodeTab:         // tab: shift sign into word
                    await this.drum.ioPrecessCodeTo23(this.OS.value, 1);
                    this.OS.value = 0;
                    ++this.ioBitCount;
                    break;
                case IOCodes.ioCodeStop:        // end/stop
                    eob = true;
                    // no break: Stop implies Reload
                case IOCodes.ioCodeReload:      // reload
                    await this.ioPromise;
                    await this.drum.ioCopy23ToMZ();
                    this.ioPromise = this.drum.ioPrecessMZTo19();
                    this.ioBitCount = 0;
                    break;
                case IOCodes.ioCodePeriod:      // period: ignored
                    break;
                case IOCodes.ioCodeWait:        // wait: insert a 0 digit on input
                    await this.drum.ioPrecessCodeTo23(0, 4);
                    this.ioBitCount += 4;
                    break;
                default:                        // treat everything else as space & ignore
                    break;
                }
            }

            // Check if automatic reload is enabled
            if (this.AS.value && this.ioBitCount >= Util.fastLineSize*Util.wordBits) {
                await this.drum.ioCopy23ToMZ();
                await this.drum.ioPrecessMZTo19();
                this.ioBitCount = 0;
            }
        }

        return eob;
    }

    /**************************************/
    async receiveKeyboardCode(code) {
        /* Processes a keyboard code sent from ControlPanel. If the code is
        negative, it is the ASCII code for a control command used with the ENABLE
        switch. Otherwise it is an I/O data/control code to be processed as
        TYPE IN (D=31, S=12) input . Note that an "S" key can be used for
        both purposes depending on the state of this.enableSwitch */

        if (this.enableSwitch) {                                // Control command
            await this.executeKeyboardCommand(code);
        } else if (this.OC.value == IOCodes.ioCmdTypeIn) {      // Input during TYPE IN
            await this.receiveInputCode(code);
            if (code == IOCodes.ioCodeStop && this.OC.value == IOCodes.ioCmdTypeIn) { // check for cancel
                this.finishIO();
            }
        }
    }

    /**************************************/
    async typeLine19() {
        /* Types the contents of line 19, starting with the four high-order
        bits of word 107, and precessing the line with each character until
        the line is all zeroes. One character is output every four word times */
        let code = 0;                   // output character code
        let fmt = 0;                    // format code
        let line19Empty = false;        // line 19 is now all zeroes
        let printing = true;            // true until STOP or I/O cancel
        let suppressing = false;        // zero suppression in force
        let zeroed = false;             // precessor function reports line 19 all zeroes

        const printPeriod = Util.drumCycleTime*4;

        this.OC.value = IOCodes.ioCmdType19;
        this.activeIODevice = this.devices.typewriter;

        this.drum.ioStartTiming();
        let outTime = this.drum.ioTime + printPeriod;

        // Start a MZ reload cycle.
        do {
            fmt = await this.drum.ioPrecessLongLineToMZ(2, 3);  // get initial format code
            suppressing = (this.punchSwitch != 1);

            // The character cycle.
            do {
                this.OS.value = this.drum.ioDetect19Sign107();
                [code, zeroed] = await this.formatOutputCharacter(fmt, this.boundIOPrecess19ToCode);
                if (zeroed) {
                    line19Empty = true;
                }

                switch (code) {
                case IOCodes.ioDataMask:        // digit zero
                    if (suppressing) {
                        code = IOCodes.ioCodeSpace;
                    }
                    break;
                case IOCodes.ioCodeCR:
                case IOCodes.ioCodeTab:
                    suppressing = (this.punchSwitch != 1);      // establish suppression for next word
                    break;
                case IOCodes.ioCodeSpace:
                case IOCodes.ioCodeMinus:
                case IOCodes.ioCodeReload:
                case IOCodes.ioCodeWait:
                    // does not affect suppression
                    break;
                case IOCodes.ioCodeStop:
                    if (line19Empty) {
                        printing = false;
                    } else {
                        code = IOCodes.ioCodeReload;
                    }
                    break;
                default:                        // all non-zero digit codes and
                    suppressing = false;        // Period turn off suppression
                    break;
                }

                // Pause printing while the ENABLE switch is on
                while (this.enableSwitch && this.OC.value == IOCodes.ioCmdType19) {
                    await this.ioTimer.delayUntil(outTime);
                    outTime += printPeriod;
                }

                if (this.OC.value != IOCodes.ioCmdType19) {
                    printing = false;   // I/O canceled
                } else {
                    this.devices.typewriter.write(code);        // no await
                    if (this.punchSwitch == 1) {
                        this.devices.paperTapePunch.write(code);
                    }

                    await this.ioTimer.delayUntil(outTime);
                    outTime += printPeriod;
                    fmt = await this.drum.ioPrecessMZToCode(3); // get next 3-bit format code
                }
            } while (code != IOCodes.ioCodeReload && printing);
        } while (printing);

        if (this.OC.value == IOCodes.ioCmdType19) {     // check for cancel
            this.finishIO();
        }
    }

    /**************************************/
    releaseIO() {
        /* Cancels any pending I/O operation and returns to manual mode */

        this.stop();
    }

    /**************************************/
    finishIO() {
        /* Terminates an I/O operation, resetting state and setting Ready */

        this.OC.value = IOCodes.ioCmdReady;     // set I/O Ready state
        this.AS.value = 0;
        this.OS.value = 0;
        this.ioBitCount = 0;
        this.activeIODevice = null;
        this.duplicateIO = false;
    }


    /*******************************************************************
    *  Processor Control                                               *
    *******************************************************************/

    /*************************************/
    setProcState(state) {
        /* Sets the current processor state and resets the previous state */

        if (this.procState != procStateNone) {
            this.procStateGates[this.procState].value = 0;
        }

        this.procState = state;
        if (state != procStateNone) {
            this.procStateGates[state].value = 1;
        }
    }

    /**************************************/
    enterICycle() {
        /* Initiates the start of the next instruction I-cycles */

        this.gateI_CYC_ENT.value = 1;
    }

    /**************************************/
    enterECycle() {
        /* Initiates the start of the current instruction E-cycles */

        this.gateE_CYC_ENT.value = 1;
    }

    /**************************************/
    enterManual() {
        /* Places the processor in Manual mode */

        this.oflowArithCheck.value = 0;
        this.automatic.value = 0;       // ??
        this.manual.value = 1;
        this.gateRUN.value = 0;
    }

    /**************************************/
    testIndicator() {
        /* Tests the indicator specified by DR. Resets those indicators that
        are reset when tested. Returns the original status of the indicator */
        let isSet = 0;

        switch (this.DREven.binaryValue*10 + this.DROdd.binaryValue) {
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

        return isSet;
    }

    /**************************************/
    stepCycleI1() {
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
        let mbrEven = this.regMBREven.value;
        let mbrOdd = this.regMBROdd.value;
        this.regOPEven.value = mbrEven;
        this.regOPOdd.value = mbrOdd;
        this.gateP.value = 1;                   // now working on the P address
        this.regOR1.clear();
        this.regOR2.clear();
        this.regOR3.clear();
        this.regPR2.clear();
        this.regXBR.clear();
        this.regXR.clear();
        if (this.opBinary == 0) {
            this.STOP.value = 1;
        }

        this.opBinary = (mbrEven & Register.bcdMask)*10 + (mbrOdd & Register.bcdMask);
        this.regIR1.incr(2);
        this.setProcState(procStateI2);
    }

    /**************************************/
    stepCycleI2(atts) {
        /* Executes I-Cycle 2. If the op code is 42 (BB), sets IR1 based on the
        SAVE gate and terminates the instruction to effect the branch. Loads the
        P2, P3 digits to the MARS registers. Sets the 4-bit in XR from the P3
        flag as necessary. Steps to I-Cycle 3 */

        if (this.opBinary == 42) {              // 42=BB, Branch Back
            if (this.save.value) {
                this.save.value = 0;
                this.regIR1.value = this.regPR1.value;
            } else {
                this.regIR1.value = this.regIR2.value
            }
            enterICycle();
        } else {
            this.regMAR.value = this.regIR1.value;
            this.fetch();
            let mbrEven = this.regMBREven.value;
            let mbrOdd = this.regMBROdd.value;
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
        }
    }

    /**************************************/
    stepCycleI3(atts) {
        /* Executes I-Cycle 3. Loads the P4, P5 digits to the MARS registers. Sets
        the 2- and 1-bits in XR from P4, P5 flags as necessary.
        Steps to I-Cycle 4 */

        this.regMAR.value = this.regIR1.value;
        this.fetch();
        let mbrEven = this.regMBREven.value;
        let mbrOdd = this.regMBROdd.value;
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
    stepCycleI4(atts) {
        /* Executes I-Cycle 4. Loads the P6 digit to the MARS registers. Stashes
        the Q7 digit in DR-even until the next cycle and clears DR-odd. Sets the
        IA latch from the P6 4-bit as necessary. Starts the chain of indexing
        and indirect address evaluation if needed. Note that if the op code is
        49 (B), BR_EXEC will be set and the instruction will terminate after any
        indexing or indirect address chaining takes place. Otherwise, will step
        to I-Cycle 5 (see exitAddressing) */

        this.regMAR.value = this.regIR1.value;
        this.fetch();
        let mbrEven = this.regMBREven.value;
        let mbrOdd = this.regMBROdd.value;
        this.regOR2.setDigit(0, mbrEven);
        this.regOR3.setDigit(0, mbrEven);
        this.regXBR.setDigit(0, mbrEven);
        this.regDREven.value = mbrOdd;
        this.regDROdd.clear();
        this.regPR1.clear();
        if (mbrEven & Register.flagMask && atts.pIA && this.gateIA_SEL) {
            this.gateIA_REQ.value = 1;          // set the IA latch
        }

        this.regIR1.incr(2);
        if (!this.regXR.isZero) {
            this.enterIndexing();
        } else if (this.gateIA_REQ) {
            this.enterIndirecting();
        } else {
            this.exitAddressing();
        }
    }

    /**************************************/
    stepCycleI5(atts) {
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
        let mbrEven = this.regMBREven.value;
        let mbrOdd = this.regMBROdd.value;
        this.gateP.value = 0;                   // now working on the Q address
        this.regOR1.clear();
        this.regXBR.clear();                    // ??
        this.regXR.clear();
        this.regMQ.clear();

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
            this.DREven.value = mbrEven;        // set up DR for S/B decode
            this.DROdd.value = mbrOdd;          // don't load OR-1 for S/B ops
            break;

        case 60:        // BS, Branch and Select
            break;                              // do nothing in I5

        default:
            if (!att.immed) {                   // don't load OR-1 for immediate ops
                this.regDROdd.value = this.regDREven.value;
                this.regOR1.setDigit(4, this.regDROdd.value);
                this.regOR1.setDigit(3, mbrEven);
                this.regOR1.setDigit(2, mbrOdd);
                this.regXBR.setDigit(4, this.regDROdd.value);
                this.regXBR.setDigit(3, mbrEven);
                this.regXBR.setDigit(2, mbrOdd);
                // ?? Gate 8-bit in XBR(4) ?? see 10.00.31.1 ??
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
    stepCycleI6(atts) {
        /* Executes I-Cycle 6.
        Sets the 1-bit in XR from the Q10 flag and the IA latch from the Q11
        flag as necessary. Takes the following special actions:
          - For immediate ops, sets OR1 to the address of the Q11 digit.
          - For I/O ops, ?? DUNNO WHAT IT DOES WITH THE Q10/Q11 FUNCTION DIGITS ??.
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
        let mbrEven = this.regMBREven.value;
        let mbrOdd = this.regMBROdd.value;

        switch (this.opBinary) {
        case 34:        // K, Control I/O device
        case 35:        // DN, Dump Numerically
        case 36:        // RN, Read Numerically
        case 37:        // RA, Read Alphanumerically
        case 38:        // WN, Write Numerically
        case 39:        // WA, Write Alphanumerically
            // ?? What happens to Q10, ?? needed for I/O function
            this.MQ.value = mbrOdd;
            break;

        case 41:        // NOP, No Operation
            this.enterICycle();
            break;

        case 48:
            this.gateSTOP.value = 1;
            this.enterICycle();
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
            this.gateBRANCH_EXEC.value = 1;
            this.enterICycle();
            break;

        case  7:        // BTFL, Branch and Transmit Floating
        case 17:        // BTM, Branch and Transmit Immediaate
        case 27:        // BT, Branch and Transmit
            this.regIR2.clear();
            //--no break

        default:
            if (att.immed) {                    // set OR-1 to Q11 addr for immediate ops
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

        if (mbrOdd & Register.flagMask && atts.qIA && this.gateIA_SEL) {
            this.gateIA_REQ.value = 1;          // set the IA latch
        }

        this.regIR1.incr(2);
        if (!this.regXR.isZero) {
            this.enterIndexing();
        } else if (this.gateIA_REQ) {
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

        this.regMAR.binaryValue = this.gateIX_BAND_2*40 + this.regXR.binaryValue*5 + 304;
        this.setProcState(procStateIX);
    }

    /**************************************/
    stepIndexing() {
        /* Executes the steps for indexing an address register. On the first
        call, the address of the index register digit is in MAR; subsequently it
        is in PR-2. Note that if the resulting address is negative, it is left
        in complement form */
        let addend = 0;                 // local copy of DR-odd
        let mq = 0;                     // local copy of MQ

        if (this.gateIX_ENT.value) {
            this.gateIX_ENT.value = 0;
            this.fetch();
            addend = (this.regMAR.value & 1 ? this.regMBROdd.value : this.regMBREven.value);
            this.gateCOMP.value = this.gateCARRY_IN.value = addend & Register.flagMask;
            addend &= Register.bcdMask;
        } else {
            this.regMAR.value = this.regPR2.value;
            this.fetch();
            addend = (this.regMAR.value & 1 ? this.regMBROdd.value : this.regMBREven.value) & Register.bcdMask;
            this.regMQ.incr(1);
            mq = this.regMQ.binaryValue;
        }

        let sum = (this.XBR.getDigit(0) & Register.bcdMask) + this.CARRY_IN.value +
                (this.gateCOMP.value ? 9-addend : addend);
        if (sum < 10) {
            this.gateCARRY_OUT.value = 0;
        } else {
            sum -= 10;
            this.gateCARRY_OUT.value = 1;
        }

        this.gateCARRY_IN.value = this.gateCARRY_OUT.value;
        this.regDROdd.value = sum;
        this.regXBR.setDigit(mq, sum);
        if (mq < 4) {
            this.regPR2.value = this.regMAR.value;
            this.regPR2.decr(1);
        } else {
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

        this.regXR.clear();
        if (this.gateP.value) {         // set PR-2 to step thru the indirect address
            this.MAR.value = this.PR2.value = this.OR2.value;
        } else {
            this.MAR.value = this.PR2.value = this.OR1.value;
        }

        this.fetch();
        let mbrEven = this.regMBREven.value;
        if (this.regMAR.value & 1) {
            let mbrOdd = this.regMBROdd.value;
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
        let mbrEven = this.regMBREven.value;
        let mbrOdd = this.regMBROdd.value;
        if (this.regMAR.value & 1) {
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
        let mbrOdd = this.regMBROdd.value;
        if (this.regMAR.value & 1) {
            this.regXBR.setDigit(4, mbrOdd);
        } else {
            let mbrEven = this.regMBREven.value;
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

        if (!this.regXR.isZero) {
            this.enterIndexing();
        } else if (this.gateIA_REQ) {
            this.enterIndirecting();
        } else {
            this.exitAddressing();
        }
    }

    /**************************************/
    exitAddressing() {
        /* Handles the details of state advancement and the end of setting up
        the P or Q addresses */

        if (this.gateP.value) {
            if (this.opBinary == 49) {  // 49 = Branch (B)
                this.gateBR_EXEC.value = 1;
                this.enterICycle();
            } else {
                this.setProcState(procStateI5);
            }
        } else {
            this.enterECycle();
        }
    }

    /**************************************/
    async run() {
        /* Main execution control loop for the processor. Attempts to throttle
        performance to approximate that of a real 1620.
        Executes memory cycles until some sort of stop condition is detected */
        let mbrEven = 0;                // local copy of MBREven
        let mbrOdd = 0;                 // local copy of MBROdd
        let atts = null;                // local copy of this.opAtts[this.opBinary]

        do {
            if (this.gateI_CYC_ENT) {
                if (this.STOP.value) {
                    // If at end of instruction and stopped, exit
                    this.setManual();
                    break; // out of run loop
                }

                if (this.gateEZ.value) {
                    this.gateHP.value = 0;
                }

                setProcState(procStateI1);
            }

            switch (this.procState) {
            case procStateI1:
                this.stepCycleI1()
                atts = this.opAtts[this.opBinary];
                this.opIndexable = atts.pIX && (this.gateIX_BAND_1.value || this.gateIX_BAND_2.value);
                break;

            case procStateI2:
                this.stepCycleI2(atts);
                break;

            case procStateI3:
                this.stepCycleI3(atts);
                break;

            case procStateI4:
                this.stepCycleI4(atts);
                break;

            case procStateI5:
                this.opIndexable = atts.qIX && (this.gateIX_BAND_1.value || this.gateIX_BAND_2.value);
                this.stepCycleI5(atts);
                break;

            case procStateI6:
                this.stepCycleI6(atts);
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
                break;

            case procStateE2:
                break;

            case procStateE3:
                break;

            case procStateE4:
                break;

            case procStateE5:
                break;

            default:
                this.checkStop();
                console.log("INVALID PROC STATE: %d", this.procState);
                break;
            }

            // Increment emulated time and throttle performance
            if (this.envir.tick()) {
                await this.envir.throttle();
            }

        } while (!this.manual.value);

        this.updateLampGlow(1);
    }

    /**************************************/
    start() {
        /* Initiates the processor on the Javascript thread */

        // also enabled by INSERT, SAVE, DISPLAY MAR, not AUTO, RELEASE, SCE ??
        if (this.powerOn.value && this.manual.value) {
            this.gateSCE.value = 0;     // reset single-cycle mode
            // reset SAVE CTRL ??
            this.gate1ST_CYC.value = 1;
            this.manual.value = 0;
            this.gateRUN.value = 1;
            // gate 1621 read cluch
            // gate I/O resp
            // gate run clock
            this.run();                 // async -- returns immediately
        }
    }

    /**************************************/
    stop() {
        /* Stops running the processor on the Javascript thread */

        if (this.powerOn.value && !this.manual.value) {
            this.gateSTOP.value = 1;
            if (this.gateI_CYC_ENT.value) {
                this.enterManual();
            }
        }
    }

    /**************************************/
    stopSIE() {
        /* If the processor is running, stops it. If the processor is already
        in manual mode, executes the next instruction, then stops the processor.
        only, then stop the processor. Note that this.manual remains set during
        the step execution */

        if (this.powerOn.value) {
            // also enabled by INSERT, SAVE, DISPLAY MAR, not AUTO, RELEASE, SCE ??
            if (this.manual.value) {
                this.gateSTOP.value = 1;
                this.run();             // singe-step one instruction
            } else {
                this.stop();            // halt the processor
            }
        }
    }

    /**************************************/
    stopSCE() {
        /* If the processor is running, stops it at the end of the current
        memory cycle, but leaves it in automatic mode, even though Manual is also
        set. Otherwise, executes the next memory cycle, then stops the processor */

        if (this.powerOn.value) {
            // also enabled by INSERT, SAVE, DISPLAY MAR, not AUTO, RELEASE, SCE ??
            this.manual.value = 1;      // stops the processor at the next memory cycle
            if (this.gateSCE.value) {
                this.run();             // singe-step one memory cycle
            } else {
                this.gateSCE = 1;
            }
        }
    }

    /**************************************/
    checkStop() {
        /* Stops running the processor as a result of a check indication */

        this.gateCheckStop.value = 1;
        this.stop();
    }

    /**************************************/
    reset() {
        /* Resets the internal processor state after power-on or a manual reset */

        this.gateIA_REQ.value = 0;
        this.gateIA_ENT.value = 0;
        this.gateRUN.value = 0;
        this.gateSTOP.value = 1;
        this.gateLAST_CARD.value = 0;
        this.gateHP.value = 0;
        this.gateEZ.value = 0;

        this.gateIA_1.value = 0;
        this.gateI_1.value = 0;
        this.gateI_2.value = 0;
        this.gateI_3.value = 0;
        this.gateI_4.value = 0;
        this.gateI_5.value = 0;
        this.gateI_6.value = 0;
        this.gateE_1.value = 0;
        this.gateE_2.value = 0;
        this.gateE_3.value = 0;
        this.gateE_4.value = 0;
        this.gateE_5.value = 0;

        this.regXR.clear();
        this.regXBR.clear();

        this.diskAddrCheck.value = 0;
        this.diskCylOFlowCheck.value = 0;
        this.diskWRLRBCCheck.value = 0;
        this.ioPrinterCheck.value = 0;
        this.ioReadCheck.value = 0;
        this.ioWriteCheck.value = 0;
        this.oflowArithCheck.value = 0;
        this.oflowExpCheck.value = 0;
        this.parityMARCheck.value = 0;
        this.parityMBREvenCheck.value = 0;
        this.parityMBROddCheck.value = 0;

        this.ioPrinterChannel9.value = 0;
        this.ioPrinterChannel12.value = 0;
    }

    /**************************************/
    checkReset() {
        /* Resets the internal processor state after pressing CHECK RESET */

        this.diskAddrCheck.value = 0;
        this.diskCylOFlowCheck.value = 0;
        this.diskWRLRBCCheck.value = 0;
        this.ioReadCheck.value = 0;
        this.ioWriteCheck.value = 0;
        this.parityMARCheck.value = 0;
        this.parityMBREvenCheck.value = 0;
        this.parityMBROddCheck.value = 0;

    }

    /**************************************/
    powerUp() {
        /* Powers up and initializes the processor */

        if (!this.powerOn.value) {
            this.gateRUN.value = 0;
            this.gateSTOP.value = 1;
            this.automatic.value = 0;
            this.manual.value = 1;
            this.devices = this.context.devices;        // I/O device objects
            //this.loadMemory();                        // >>> DEBUG ONLY <<<
        }
    }

    /**************************************/
    powerDown() {
        /* Powers down the processor */

        this.stop();
        this.releaseIO();
        this.powerOn.value = false;
        this.powerReady.value = false;
    }

    /**************************************/
    loadMemory() {
        /* Loads debugging code into the initial memory image. The routine
        should be enabled in this.powerUp() only temporarily for demo and
        debugging purposes */
    }

} // class Processor


// Static class properties

