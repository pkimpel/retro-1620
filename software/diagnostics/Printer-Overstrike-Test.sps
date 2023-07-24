3400032007013600032007024902402511963611300102 COLD START CARD - 1620 MONITOR I
||JOB                        1620-1443 PRINTER CARRIAGE CONTROL TEST
||SPSX      |                                                              00002
**SPS II-D     1443 PRINTER CARRIAGE CONTROL TEST
*LIST PRINTER                                                              00004
*PRINT SYMBOL TABLE                                                        00005
     *         1443 PRINTER OVERSTRIKE TEST
     START K   0,00963,,                SPACE 3 AFTER PRINT
           WA  BLANK,00901,,
           K   0,00971,,                SKIP 1 BEFORE PRINT
           WA  KBP1,00901,,
           K   0,00951,,                SPACE 1 BEFORE PRINT
           WA  SBP1,00901,,
           K   0,00952,,                SPACE 2 BEFORE PRINT
           WA  SBP2,00901,,
           K   0,00953,,                SPACE 3 BEFORE PRINT
           WA  SBP3,00901,,
           WA  SAPD,00900,,             SPACE NORMAL AFTER PRINT
           WA  SAP0,00901,,             SUPPRESS SPACE AFTER PRINT
           WA  SOS1,00901,,             OVERSTRIKE PRINT ONE
           WA  SOS2,00901,,             OVERSTRIKE PRINT ONE TWO
           WA  SOS3,00900,,             OVERSTRIKE PRINT ONE TWO THREE, SAP
     *
           WA  SAPD,00900,,             SPACE NORMAL AFTER PRINT
           K   0,00921
           WA  SAP1,00901,,             SPACE 1 AFTER PRINT
           K   0,00962
           WA  SAP2,00901,,             SPACE 2 AFTER PRINT
           K   0,00963
           WA  SAP3,00901,,             SPACE 3 AFTER PRINT
           WA  SAPD,00900,,             SPACE NORMAL AFTER PRINT
     *
           K   0,00953,,                SPACE 3 BEFORE PRINT
           WA  SAPD,00900,,             SPACE NORMAL AFTER PRINT
           WA  ALTCH,00901,,            SUPPRESS SPACE AFTER PRINT
           WA  ALTCH,00900,,            SPACE NORMAL AFTER PRNT
           CALLEXIT
     *
     BLANK DAC 1,@
     KBP1  DAC 20,SKIP 1 BEFORE PRINT@
     SBP1  DAC 21,SPACE 1 BEFORE PRINT@
     SBP2  DAC 21,SPACE 2 BEFORE PRINT@
     SBP3  DAC 21,SPACE 3 BEFORE PRINT@
     SAPD  DAC 28,SPACE   AFTER  PRINT NORMAL@
     SAP0  DAC 37,SPACE   AFTER  PRINT        SUPPRESS@
     SAP1  DAC 21,SPACE 1 AFTER  PRINT@
     SAP2  DAC 21,SPACE 2 AFTER  PRINT@
     SAP3  DAC 21,SPACE 3 AFTER  PRINT@
     SOS1  DAC 25,     OS        PRINT ONE@
     SOS2  DAC 29,     OS        PRINT ONE TWO@
     SOS3  DAC 40,     OS        PRINT ONE TWO THREE, SAP@
     ALTCH DAC 49,M M M M M M M M M M M M M M M M M M M M M M M M M
           DAC 48, M M M M M M M M M M M M M M M M M M M M M M M M
           DAC 24, M M M M M M M M M M M @
           DENDSTART
|||| END OF JOB
