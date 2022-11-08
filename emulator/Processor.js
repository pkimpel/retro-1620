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


class Processor {

    constructor(context) {
        /* Constructor for the 1620 processor object. The "context" object
        supplies references for objects from the 1620 emulator global environment */

        this.context = context;
        this.envir = new Envir();

        // Control Gates
        this.gateI_CYC_ENT =        new FlipFlop(this.envir, false);
        this.gateIX_ENT =           new FlipFlop(this.envir, false);
        this.gateE_CYC_ENT =        new FlipFlop(this.envir, false);
        this.gateRM =               new FlipFlop(this.envir, false);
        this.gate1ST_CYC =          new FlipFlop(this.envir, false);
        this.gateADD_ENT =          new FlipFlop(this.envir, false);
        this.gateRECOMP =           new FlipFlop(this.envir, false);
        this.gateMASK =             new FlipFlop(this.envir, false);
        this.gateINT_ENT =          new FlipFlop(this.envir, false);
        this.gateCLR_MEM =          new FlipFlop(this.envir, false);
        this.gateIA_SEL =           new FlipFlop(this.envir, false);
        this.gateBR_EXEC =          new FlipFlop(this.envir, false);
        this.gateIX_EXEC =          new FlipFlop(this.envir, false);
        this.gateFIELD_MK_1 =       new FlipFlop(this.envir, false);
        this.gate1ST_CYC_DELAYD =   new FlipFlop(this.envir, false);
        this.gateADD_MODE =         new FlipFlop(this.envir, false);
        this.gateCARRY_IN =         new FlipFlop(this.envir, false);
        this.gateEXP_OFLO =         new FlipFlop(this.envir, false);
        this.gateINT_MODE =         new FlipFlop(this.envir, false);
        this.gateIX_BAND_1 =        new FlipFlop(this.envir, false);
        this.gateIA_ENT =           new FlipFlop(this.envir, false);
        this.gateX_4 =              new FlipFlop(this.envir, false);
        this.gateEXMIT_ENT =        new FlipFlop(this.envir, false);
        this.gateFIELD_MK_2 =       new FlipFlop(this.envir, false);
        this.gate1ST_MPLY_CYCLE =   new FlipFlop(this.envir, false);
        this.gate2_DIG_CNTRL =      new FlipFlop(this.envir, false);
        this.gateCARRY_OUT =        new FlipFlop(this.envir, false);
        this.gateEXP_UFLO =         new FlipFlop(this.envir, false);
        this.gateBR_OUT =           new FlipFlop(this.envir, false);
        this.gateRUN =              new FlipFlop(this.envir, false);
        this.gateSTOP =             new FlipFlop(this.envir, false);
        this.gateIX_BAND_2 =        new FlipFlop(this.envir, false);
        this.gateIA_REQ =           new FlipFlop(this.envir, false);
        this.gateX_2 =              new FlipFlop(this.envir, false);
        this.gateEXMIT_MODE =       new FlipFlop(this.envir, false);
        this.gateFL_1 =             new FlipFlop(this.envir, false);
        this.gateDIV_1_CYC =        new FlipFlop(this.envir, false);
        this.gateCOMP =             new FlipFlop(this.envir, false);
        this.gateMC_1 =             new FlipFlop(this.envir, false);
        this.gateDVD_SIGN =         new FlipFlop(this.envir, false);
        this.gate$$$_OFLO =         new FlipFlop(this.envir, false);
        this.gateLAST_CARD =        new FlipFlop(this.envir, false);
        this.gateHP =               new FlipFlop(this.envir, false);
        this.gateP =                new FlipFlop(this.envir, false);
        this.gateX_1 =              new FlipFlop(this.envir, false);
        this.gateFL_2 =             new FlipFlop(this.envir, false);
        this.gateDVD_L_CYC =        new FlipFlop(this.envir, false);
        this.gateP_COMP =           new FlipFlop(this.envir, false);
        this.gateMC_2 =             new FlipFlop(this.envir, false);
        this.gateLAST_LD_CYC =      new FlipFlop(this.envir, false);
        this.gateEOR$ =             new FlipFlop(this.envir, false);
        this.gateEZ =               new FlipFlop(this.envir, false);

        // Input-Output Gates
        this.gateRD =               new FlipFlop(this.envir, false);
        this.gateWR =               new FlipFlop(this.envir, false);
        this.gateCHAR_GATE =        new FlipFlop(this.envir, false);
        this.gateRDR_FEED =         new FlipFlop(this.envir, false);
        this.gatePCH_FEED =         new FlipFlop(this.envir, false);
        this.gateIO_FLAG =          new FlipFlop(this.envir, false);
        this.gateRESP_GATE =        new FlipFlop(this.envir, false);
        this.gateREL =              new FlipFlop(this.envir, false);
        this.gateDISK_OP =          new FlipFlop(this.envir, false);
        this.gateDISK_LD_ZERO =     new FlipFlop(this.envir, false);
        this.gateDISK_ADDR =        new FlipFlop(this.envir, false);
        this.gateSCTR_COUNT =       new FlipFlop(this.envir, false);
        this.gateMEM_ADDR =         new FlipFlop(this.envir, false);
        this.gateSCTR_CYC =         new FlipFlop(this.envir, false);
        this.gateDISK_HUND =        new FlipFlop(this.envir, false);
        this.gateDISK_UNIT =        new FlipFlop(this.envir, false);
        this.gateSIMO_HOLD =        new FlipFlop(this.envir, false);
        this.gateSIMO_30 =          new FlipFlop(this.envir, false);
        this.gatePC_HP =            new FlipFlop(this.envir, false);
        this.gatePC_EZ =            new FlipFlop(this.envir, false);
        this.gatePC_OFLOW =         new FlipFlop(this.envir, false);
        this.gatePC_TR_8 =          new FlipFlop(this.envir, false);
        this.gatePC_IND =           new FlipFlop(this.envir, false);
        this.gatePC_6XXX =          new FlipFlop(this.envir, false);

        // Instruction & Execution Cycle Gates
        this.gateI_1 =              new FlipFlop(this.envir, false);
        this.gateI_2 =              new FlipFlop(this.envir, false);
        this.gateI_3 =              new FlipFlop(this.envir, false);
        this.gateI_4 =              new FlipFlop(this.envir, false);
        this.gateI_5 =              new FlipFlop(this.envir, false);
        this.gateI_6 =              new FlipFlop(this.envir, false);
        this.gateIA_1 =             new FlipFlop(this.envir, false);
        this.gateIA_2 =             new FlipFlop(this.envir, false);
        this.gateIA_3 =             new FlipFlop(this.envir, false);
        this.gateIX =               new FlipFlop(this.envir, false);
        this.gateE_1 =              new FlipFlop(this.envir, false);
        this.gateE_2 =              new FlipFlop(this.envir, false);
        this.gateE_3 =              new FlipFlop(this.envir, false);
        this.gateE_4 =              new FlipFlop(this.envir, false);
        this.gateE_5 =              new FlipFlop(this.envir, false);

        // Operator Control Panel Indicators
        this.thermal =              new FlipFlop(this.envir, false);
        this.writeInterlock =       new FlipFlop(this.envir, false);
        this.readInterlock =        new FlipFlop(this.envir, false);
        this.save =                 new FlipFlop(this.envir, false);
        this.typewriterSelected =   new FlipFlop(this.envir, false);
        this.rfe1 =                 new FlipFlop(this.envir, false);
        this.rfe2 =                 new FlipFlop(this.envir, false);
        this.rfe3 =                 new FlipFlop(this.envir, false);
        this.automatic =            new FlipFlop(this.envir, false);
        this.manual =               new FlipFlop(this.envir, false);
        this.checkStop =            new FlipFlop(this.envir, false);

        // Check Indicators
        this.diskAddrCheck =        new FlipFlop(this.envir, false);
        this.diskCylOflowCheck =    new FlipFlop(this.envir, false);
        this.diskWRLWBCCheck =      new FlipFlop(this.envir, false);
        this.dummy1Check =          new FlipFlop(this.envir, false);
        this.dummy2Check =          new FlipFlop(this.envir, false);
        this.dummy3Check =          new FlipFlop(this.envir, false);
        this.ioPrinterCheck =       new FlipFlop(this.envir, false);
        this.ioReadCheck =          new FlipFlop(this.envir, false);
        this.ioWriteCheck =         new FlipFlop(this.envir, false);
        this.oflowArithCheck =      new FlipFlop(this.envir, false);
        this.oflowDummyCheck =      new FlipFlop(this.envir, false);
        this.oflowExpCheck =        new FlipFlop(this.envir, false);
        this.parityMARCheck =       new FlipFlop(this.envir, false);
        this.parityMBRECheck =      new FlipFlop(this.envir, false);
        this.parityMBROCheck =      new FlipFlop(this.envir, false);

        // Console Registers
        this.regDREven =            new Register(1, this.envir, false, true,  false);
        this.regDROdd =             new Register(1, this.envir, false, true,  false);
        this.regMAR =               new Register(5, this.envir, false, true,  false);
        this.regMBREven =           new Register(1, this.envir, false, false, true);
        this.regMBROdd =            new Register(1, this.envir, false, false, true);
        this.regMIREven =           new Register(1, this.envir, false, true,  true);
        this.regMIROdd =            new Register(1, this.envir, false, true,  true);
        this.regMQ =                new Register(1, this.envir, false, true,  false);
        this.regOREven =            new Register(1, this.envir, false, true,  false);
        this.regOROdd =             new Register(1, this.envir, false, true,  false);

        // MARS Registers
        this.CR1 =                  new Register(5, this.envir, true,  true,  false);
        this.CR2 =                  new Register(5, this.envir, true,  true,  false);
        this.IR1 =                  new Register(5, this.envir, true,  true,  false);
        this.IR2 =                  new Register(5, this.envir, true,  true,  false);
        this.IR3 =                  new Register(5, this.envir, true,  true,  false);
        this.IR4 =                  new Register(5, this.envir, true,  true,  false);
        this.OR1 =                  new Register(5, this.envir, true,  true,  false);
        this.OR2 =                  new Register(5, this.envir, true,  true,  false);
        this.OR3 =                  new Register(5, this.envir, true,  true,  false);
        this.OR4 =                  new Register(5, this.envir, true,  true,  false);
        this.OR5 =                  new Register(5, this.envir, true,  true,  false);
        this.PR2 =                  new Register(5, this.envir, true,  true,  false);

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


        // General emulator state
        this.poweredOn = false;                         // powered up and ready to run
        this.tracing = false;                           // trace command debugging

        // I/O Subsystem
        this.ioTimer = new Timer();                     // general timer for I/O operations
        this.ioPromise = Promise.resolve();             // general Promise for I/O operations

        // Bound methods
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
        this.gateI_CYC_ENT.updateLampGlow(gamma);
        this.gateIX_ENT.updateLampGlow(gamma);
        this.gateE_CYC_ENT.updateLampGlow(gamma);
        this.gateRM.updateLampGlow(gamma);
        this.gate1ST_CYC.updateLampGlow(gamma);
        this.gateADD_ENT.updateLampGlow(gamma);
        this.gateRECOMP.updateLampGlow(gamma);
        this.gateMASK.updateLampGlow(gamma);
        this.gateINT_ENT.updateLampGlow(gamma);
        this.gateCLR_MEM.updateLampGlow(gamma);
        this.gateIA_SEL.updateLampGlow(gamma);
        this.gateBR_EXEC.updateLampGlow(gamma);
        this.gateIX_EXEC.updateLampGlow(gamma);
        this.gateFIELD_MK_1.updateLampGlow(gamma);
        this.gate1ST_CYC_DELAYD.updateLampGlow(gamma);
        this.gateADD_MODE.updateLampGlow(gamma);
        this.gateCARRY_IN.updateLampGlow(gamma);
        this.gateEXP_OFLO.updateLampGlow(gamma);
        this.gateINT_MODE.updateLampGlow(gamma);
        this.gateIX_BAND_1.updateLampGlow(gamma);
        this.gateIA_ENT.updateLampGlow(gamma);
        this.gateX_4.updateLampGlow(gamma);
        this.gateEXMIT_ENT.updateLampGlow(gamma);
        this.gateFIELD_MK_2.updateLampGlow(gamma);
        this.gate1ST_MPLY_CYCLE.updateLampGlow(gamma);
        this.gate2_DIG_CNTRL.updateLampGlow(gamma);
        this.gateCARRY_OUT.updateLampGlow(gamma);
        this.gateEXP_UFLO.updateLampGlow(gamma);
        this.gateBR_OUT.updateLampGlow(gamma);
        this.gateRUN.updateLampGlow(gamma);
        this.gateSTOP.updateLampGlow(gamma);
        this.gateIX_BAND_2.updateLampGlow(gamma);
        this.gateIA_REQ.updateLampGlow(gamma);
        this.gateX_2.updateLampGlow(gamma);
        this.gateEXMIT_MODE.updateLampGlow(gamma);
        this.gateFL_1.updateLampGlow(gamma);
        this.gateDIV_1_CYC.updateLampGlow(gamma);
        this.gateCOMP.updateLampGlow(gamma);
        this.gateMC_1.updateLampGlow(gamma);
        this.gateDVD_SIGN.updateLampGlow(gamma);
        this.gate$$$_OFLO.updateLampGlow(gamma);
        this.gateLAST_CARD.updateLampGlow(gamma);
        this.gateHP.updateLampGlow(gamma);
        this.gateP.updateLampGlow(gamma);
        this.gateX_1.updateLampGlow(gamma);
        this.gateFL_2.updateLampGlow(gamma);
        this.gateDVD_L_CYC.updateLampGlow(gamma);
        this.gateP_COMP.updateLampGlow(gamma);
        this.gateMC_2.updateLampGlow(gamma);
        this.gateLAST_LD_CYC.updateLampGlow(gamma);
        this.gateEOR$.updateLampGlow(gamma);
        this.gateEZ.updateLampGlow(gamma);

        // Input-Output Gates
        this.gateRD.updateLampGlow(gamma);
        this.gateWR.updateLampGlow(gamma);
        this.gateCHAR_GATE.updateLampGlow(gamma);
        this.gateRDR_FEED.updateLampGlow(gamma);
        this.gatePCH_FEED.updateLampGlow(gamma);
        this.gateIO_FLAG.updateLampGlow(gamma);
        this.gateRESP_GATE.updateLampGlow(gamma);
        this.gateREL.updateLampGlow(gamma);
        this.gateDISK_OP.updateLampGlow(gamma);
        this.gateDISK_LD_ZERO.updateLampGlow(gamma);
        this.gateDISK_ADDR.updateLampGlow(gamma);
        this.gateSCTR_COUNT.updateLampGlow(gamma);
        this.gateMEM_ADDR.updateLampGlow(gamma);
        this.gateSCTR_CYC.updateLampGlow(gamma);
        this.gateDISK_HUND.updateLampGlow(gamma);
        this.gateDISK_UNIT.updateLampGlow(gamma);
        this.gateSIMO_HOLD.updateLampGlow(gamma);
        this.gateSIMO_30.updateLampGlow(gamma);
        this.gatePC_HP.updateLampGlow(gamma);
        this.gatePC_EZ.updateLampGlow(gamma);
        this.gatePC_OFLOW.updateLampGlow(gamma);
        this.gatePC_TR_8.updateLampGlow(gamma);
        this.gatePC_IND.updateLampGlow(gamma);
        this.gatePC_6XXX.updateLampGlow(gamma);

        // Instruction & Execution Cycle Gates
        this.gateI_1.updateLampGlow(gamma);
        this.gateI_2.updateLampGlow(gamma);
        this.gateI_3.updateLampGlow(gamma);
        this.gateI_4.updateLampGlow(gamma);
        this.gateI_5.updateLampGlow(gamma);
        this.gateI_6.updateLampGlow(gamma);
        this.gateIA_1.updateLampGlow(gamma);
        this.gateIA_2.updateLampGlow(gamma);
        this.gateIA_3.updateLampGlow(gamma);
        this.gateIX.updateLampGlow(gamma);
        this.gateE_1.updateLampGlow(gamma);
        this.gateE_2.updateLampGlow(gamma);
        this.gateE_3.updateLampGlow(gamma);
        this.gateE_4.updateLampGlow(gamma);
        this.gateE_5.updateLampGlow(gamma);

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
        this.diskWRLWBCCheck.updateLampGlow(gamma);
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
        this.parityMBRECheck.updateLampGlow(gamma);
        this.parityMBROCheck.updateLampGlow(gamma);

        // Console Registers
        this.regDREven.updateLampGlow(gamma);
        this.regDROdd.updateLampGlow(gamma);
        this.regMAR.updateLampGlow(gamma);
        this.regMBREven.updateLampGlow(gamma);
        this.regMBROdd.updateLampGlow(gamma);
        this.regMIREven.updateLampGlow(gamma);
        this.regMIROdd.updateLampGlow(gamma);
        this.regMQ.updateLampGlow(gamma);
        this.regOREven.updateLampGlow(gamma);
        this.regOROdd.updateLampGlow(gamma);
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
            this.regMBRE.value = (pair >> 8) & Register.digitMask;
            if (this.regMBRE.parityError) {
                this.parityMBRECheck.value = 1;
                if (this.parityStopSwitch) {
                    this.checkStop();
                }
            }

            this.regMBRO.value = pair & Register.digitMask;
            if (this.regMBRO.parityError) {
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

    /**************************************/
    async run() {
        /* Main execution control loop for the processor. Attempts to throttle
        performance to approximate that of a real 1620. The drum manages the
        system timing, updating its L and eTime properties as calls on its
        waitFor() and waitUntil() methods are made. We await drum.throttle()
        after every instruction completes to determine if drum.eTime exceeds the
        current slice time limit, in which case it delays until real time catches
        up to emulation time. We continue to run until the a halt condition is
        detected */

        do {                            // run until halted
            if (this.RC.value) {        // enter READ COMMAND state
                this.readCommand();
                if (this.tracing) {
                    this.traceState();  // DEBUG ONLY
                }

                if (this.computeSwitch == 2) {  // Compute switch set to BP
                    // Do not stop on a Mark Return command; stop on the next command
                    // instead. See Tech Memo 41.
                    if  (this.deferredBP) {     // if breakpoint has been deferred, take it now
                        this.deferredBP = false;
                        this.stop();
                    } else if (this.BP.value) { // if this is a Mark Return, defer the BP
                        if (this.D.value == 31 && this.S.value == 20) {
                            this.deferredBP = true;
                        } else {
                            this.stop();
                        }
                    }
                }
            } else if (this.TR.value) { // enter TRANSFER (execute) state
                this.transfer();
                await this.drum.throttle();
                this.CZ.value = 1;      // disable stepping
            } else {
                this.violation("State neither RC nor TR");
                debugger;
                this.stop();
            }
        } while (!this.CH.value || !this.CZ.value);

        this.updateLampGlow(1);
    }

    /**************************************/
    start() {
        /* Initiates the processor on the Javascript thread */

        if (this.poweredOn && this.CH.value) {
            this.CZ.value = 1;          // disable stepping
            this.CH.value = 0;          // reset HALT FF
            this.drum.startTiming();
            this.run();                 // async -- returns immediately
        }
    }

    /**************************************/
    stop() {
        /* Stops running the processor on the Javascript thread */

        if (this.poweredOn && !this.gateSTOP.value) {
            this.gateSTOP.value = 1;    // set HALT FF
            this.gateRUN.value = 0;     // disable stepping
            this.manual.value = 1;
            this.automatic.value = 0;
        }
    }

    /**************************************/
    checkStop() {
        /* Stops running the processor as a result of a check indication */

        this.gateCheckStop.value = 1;
        this.stop();
    }

    /**************************************/
    step() {
        /* Single-steps the processor. This will execute the next command
        only, then stop the processor. Note that this.CH remains set during
        the step execution */

        if (this.poweredOn && this.gateSTOP.value) {
            this.run();                 // async -- returns immediately
        }
    }

    /**************************************/
    async systemReset() {
        /* Resets the system and initiates loading paper tape. Activated from
        the ControlPanel RESET button */

        if (this.tracing) {
            console.log("<System Reset>");
        }

        this.poweredOn = true;
        if (this.CH.value) {
            this.CZ.value = 1;          // enable read-command state (i.e., disable stepping)
            this.RC.value = 1;          // set read-command state
            this.TR.value = 0;          // reset transfer state
            this.CG.value = 0;          // reset Next-From-AR FF
            this.CQ.value = 0;          // reset TEST FF
            this.OC.value = IOCodes.ioCmdReady;

            // Load the Number Track, CN
            this.drum.startTiming();
            if (!await this.readPaperTape()) {
                this.drum.waitUntil(0);         // number track data to line 19
                for (let x=0; x<Util.longLineSize; ++x) {
                    this.drum.writeCN(this.drum.read(19));
                    this.drum.waitFor(1);
                }
            }

            // Load the next block from paper tape
            this.setCommandLine(7);             // execute code from line 23
            this.N.value = 0;
            await this.readPaperTape();         // read a bootstrap loader, ignore any hang
        }
    }

    /**************************************/
    powerUp() {
        /* Powers up and initializes the processor */

        if (!this.poweredOn) {
            this.gateSTOP.value = 1;                    // set HALT FF
            this.manual.value = 1;
            this.regMAR.binaryValue = 12345; //**TEST**//
            this.devices = this.context.devices;        // I/O device objects
            //this.loadMemory();                        // >>> DEBUG ONLY <<<
        }
    }

    /**************************************/
    powerDown() {
        /* Powers down the processor */

        this.stop();
        this.releaseIO();
        this.poweredOn = false;
    }

    /**************************************/
    loadMemory() {
        /* Loads debugging code into the initial memory image. The routine
        should be enabled in this.powerUp() only temporarily for demo and
        debugging purposes */
    }

} // class Processor


// Static class properties

