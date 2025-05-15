     *  FPTEST - TEST LARGE COMBINATION OF FP ARITHMETIC ON KEY VALUES
     *           ORIGINAL DESIGN BY PAUL KIMPEL
     *           MODIFIED DESIGN IMPLEMENTED BY DAVE BABCOCK
     *           IBM 1620 JR. PROJECT
     *
     *  PROCEDURE
     *     1. LOOP THROUGH ALL COMBINATIONS OF TEST DATA
     *     2. PERFORM HARDWARE FLOATING POINT ADD, SUBTRACT,
     *        MULTIPLY, AND DIVIDE ON EACH PAIR OF TEST DATA
     *     3. CAPTURE NUMERIC RESULT AND E/Z, H/P, EXPONENT
     *        CHECK, AND ARITHMETIC CHECK
     *     4. PERFORM SOFTWARE FLOATING POINT ADD, SUBTRACT,
     *        MULTIPLY, AND DIVIDE ON SAME PAIR OF TEST DATA
     *     5. CAPTURE NUMERIC RESULT AND E/Z, H/P, EXPONENT
     *        OVERFLOW/UNDERFLOW, AND DIVIDE BY ZERO
     *     6. COMPARE RESULTS AND INDICATORS OF HARDWARE AND
     *        SOFTWARE ARITHMETIC OPERATONS
     *     7. REPORT ANY DIFFERENCES
     *
     *  PROGRAM SWITCHES
     *     1 - SKIP FLOATING POINT ADD TESTS
     *     2 - SKIP FLOATING POINT SUBTRACT TESTS
     *     3 - SKIP FLOATING POINT MULTIPLY TESTS
     *     4 - SKIP FLOATING POINT DIVIDE TESTS
     *
     * ---------------------------------------------------------------
     *
     *  START OF FLOATING POINT ARITHMETIC TEST PROGRAM
     *
           DORG 402
     START RCTY
           WATY TITLE
           RCTY
           RCTY
           WATY LEGND1
           RCTY
           WATY LEGND2
           RCTY
           WATY LEGND3
           RCTY
           RCTY
     *
     * ---------------------------------------------------------------
     *
     *  PATCH PICK SUBROUTINE
     *    1. CAPTURE EXPONENT OVERFLOW AND UNDERFLOW
     *    2. CAPTURE DIVIDE BY ZERO
     *    3. PROHIBIT ERROR PRINTOUTS
     *    4. BYPASS DIVIDE BY ZERO HALT
     *
           B    CONT
     DUMMY FA   0,0
     CONT  SF   DUMMY+2,,,         COMPUTE PICK ADDRESS
           TF   PICK,DUMMY+6
           SM   PICK,11
     *
           TF   *+30,PICK,,        PATCH EXPONENT OVERFLOW
           AM   *+18,488
           TR   *,PATCH1
     *
           TF   *+30,PICK,,        PATCH EXPONENT UNDERFLOW
           AM   *+18,568
           TR   *,PATCH1
     *
           TF   PATCH2+18,PICK,,   PATCH DIVIDE BY ZERO
           AM   PATCH2+18,482
           SF   PATCH2+18
           TF   *+30,PICK
           AM   *+18,648
           TR   *,PATCH2
     *
     * ---------------------------------------------------------------
     *
     *  DOUBLE LOOP THROUGH ALL COMBINATIONS OF TEST DATA
     *
           TFM  CTR,0
           TFM  PTR1,FPTAB
     LOOP1 TFL  X,-PTR1
     *
           TFM  PTR2,FPTAB
     LOOP2 TFL  Y,-PTR2
           AM   CTR,1
     *
     * ---------------------------------------------------------------
     *
     *  PERFORM FLOATING POINT ADD TEST
     *
     FADD  BC1  FSUB
     *
           BZ   *+12
           BP   *+12
           BV   *+12
           BXV  *+12
           TFM  SADDHW,0,8
           TFL  RADDHW,X
           FADD RADDHW,Y
           BNZ  *+24
           TDM  SADDHW,1
           BNP  *+24
           TDM  SADDHW-1,1
           BNV  *+24
           TDM  SADDHW-2,1
           BNXV *+24
           TDM  SADDHW-3,1,11
     *
           BZ   *+12
           BP   *+12
           BV   *+12
           BXV  *+12
           TFM  SWCHK,0,10
           TFM  SADDSW,0,8
           TFL  RADDSW,X
           FA   RADDSW,Y
           BNZ  *+24
           TDM  SADDSW,1
           BNP  *+24
           TDM  SADDSW-1,1
           TF   SADDSW-2,SWCHK
     *
           C    RADDHW-2,RADDSW-2
           BNE  *+60
           C    RADDHW,RADDSW
           BNE  *+36
           C    SADDHW,SADDSW
           BE   FSUB
           RCTY
           WNTY X-9
           WATY TADD
           WNTY Y-9
           RCTY
           WATY INDENT
           WNTY RADDHW-9
           SPTY
           WNTY SADDHW-3
           RCTY
           WATY INDENT
           WNTY RADDSW-9
           SPTY
           WNTY SADDSW-3
           RCTY
     *
     * ---------------------------------------------------------------
     *
     *  PERFORM FLOATING POINT SUBTRACT TEST
     *
     FSUB  BC2  FMUL
     *
           BZ   *+12
           BP   *+12
           BV   *+12
           BXV  *+12
           TFM  SSUBHW,0,8
           TFL  RSUBHW,X
           FSUB RSUBHW,Y
           BNZ  *+24
           TDM  SSUBHW,1
           BNP  *+24
           TDM  SSUBHW-1,1
           BNV  *+24
           TDM  SSUBHW-2,1
           BNXV *+24
           TDM  SSUBHW-3,1,11
     *
           BZ   *+12
           BP   *+12
           BV   *+12
           BXV  *+12
           TFM  SWCHK,0,10
           TFM  SSUBSW,0,8
           TFL  RSUBSW,X
           FS   RSUBSW,Y
           BNZ  *+24
           TDM  SSUBSW,1
           BNP  *+24
           TDM  SSUBSW-1,1
           TF   SSUBSW-2,SWCHK
     *
           C    RSUBHW-2,RSUBSW-2
           BNE  *+60
           C    RSUBHW,RSUBSW
           BNE  *+36
           C    SSUBHW,SSUBSW
           BE   FMUL
           RCTY
           WNTY X-9
           WATY TSUB
           WNTY Y-9
           RCTY
           WATY INDENT
           WNTY RSUBHW-9
           SPTY
           WNTY SSUBHW-3
           RCTY
           WATY INDENT
           WNTY RSUBSW-9
           SPTY
           WNTY SSUBSW-3
           RCTY
     *
     * ---------------------------------------------------------------
     *
     *  PERFORM FLOATING POINT MULTIPLY TEST
     *
     FMUL  BC3  FDIV
     *
           BZ   *+12
           BP   *+12
           BV   *+12
           BXV  *+12
           TFM  SMULHW,0,8
           TFL  RMULHW,X
           FMUL RMULHW,Y
           BNZ  *+24
           TDM  SMULHW,1
           BNP  *+24
           TDM  SMULHW-1,1
           BNV  *+24
           TDM  SMULHW-2,1
           BNXV *+24
           TDM  SMULHW-3,1,11
     *
           BZ   *+12
           BP   *+12
           BV   *+12
           BXV  *+12
           TFM  SWCHK,0,10
           TFM  SMULSW,0,8
           TFL  RMULSW,X
           FM   RMULSW,Y
           BNZ  *+24
           TDM  SMULSW,1
           BNP  *+24
           TDM  SMULSW-1,1
           TF   SMULSW-2,SWCHK
     *
           C    RMULHW-2,RMULSW-2
           BNE  *+60
           C    RMULHW,RMULSW
           BNE  *+36
           C    SMULHW,SMULSW
           BE   FDIV
           RCTY
           WNTY X-9
           WATY TMUL
           WNTY Y-9
           RCTY
           WATY INDENT
           WNTY RMULHW-9
           SPTY
           WNTY SMULHW-3
           RCTY
           WATY INDENT
           WNTY RMULSW-9
           SPTY
           WNTY SMULSW-3
           RCTY
     *
     * ---------------------------------------------------------------
     *
     *  PERFORM FLOATING POINT DIVIDE TEST
     *
     FDIV  BC4  NEXT2
     *
           BZ   *+12
           BP   *+12
           BV   *+12
           BXV  *+12
           TFM  SDIVHW,0,8
           TFL  RDIVHW,X
           FDIV RDIVHW,Y
           BNZ  *+24
           TDM  SDIVHW,1
           BNP  *+24
           TDM  SDIVHW-1,1
           BNV  *+24
           TDM  SDIVHW-2,1
           BNXV *+24
           TDM  SDIVHW-3,1,11
     *
           BZ   *+12
           BP   *+12
           BV   *+12
           BXV  *+12
           TFM  SWCHK,0,10
           TFM  SDIVSW,0,8
           TFL  RDIVSW,X
           FD   RDIVSW,Y
           BNZ  *+24
           TDM  SDIVSW,1
           BNP  *+24
           TDM  SDIVSW-1,1
           TF   SDIVSW-2,SWCHK
     *
           C    RDIVHW-2,RDIVSW-2
           BNE  *+60
           C    RDIVHW,RDIVSW
           BNE  *+36
           C    SDIVHW,SDIVSW
           BE   NEXT2
           RCTY
           WNTY X-9
           WATY TDIV
           WNTY Y-9
           RCTY
           WATY INDENT
           WNTY RDIVHW-9
           SPTY
           WNTY SDIVHW-3
           RCTY
           WATY INDENT
           WNTY RDIVSW-9
           SPTY
           WNTY SDIVSW-3
           RCTY
     *
     * ---------------------------------------------------------------
     *
     *  END OF LOOPS
     *
     NEXT2 AM   PTR2,10
           CM   PTR2,TABEND
           BNH  LOOP2
     *
     NEXT1 AM   PTR1,10
           CM   PTR1,TABEND
           BNH  LOOP1
     *
     * ---------------------------------------------------------------
     *
     *  END OF TEST PROGRAM
     *
     DONE  RCTY
           WATY COUNT
           WNTY CTR-3
           RCTY
           RCTY
           WATY FINIS
           RCTY
           H
           B    START
     *
     * ---------------------------------------------------------------
     *
     *  PRINT MESSAGES
     *
     TITLE DAC  32,FLOATING POINT ARITHMETIC TESTS@
     LEGND1DAC  7,X OP Y@
     LEGND2DAC  36,   HWRESULT HWIND (EXP/ARITH/HP/EZ)@
     LEGND3DAC  35,   SWRESULT SWIND (EXP/DIV0/HP/EZ)@
     TADD  DAC  4, + @
     TSUB  DAC  4, - @
     TMUL  DAC  4, * @
     TDIV  DAC  4, / @
     INDENTDAC  4,   @
     COUNT DAC  30,COUNT OF TEST COMBINATIONS = @
     FINIS DAC  13,END OF TESTS@
     *
     *  PICK PATCH DATA
     *
     PICK  DS  5,,,                PICK ADDRESS
     SWCHK DS  2,,,                PICK INDICATORS (EXP/DIV0)
     PATCH1TDM SWCHK-1,1,11,       EXPONENT OVERFLOW/UNDERFLOW PATCH
           NOP
           DORG*-9
           DC  1,@
     PATCH2TDM SWCHK,1,,           DIVIDE BY ZERO PATCH
           B   0
           DORG*-4
           DC  1,@
     *
     *  COMPUTATION DATA
     *
     PTR1  DS  5,,,                POINTER TO FPTAB FOR OPERAND 1
     PTR2  DS  5,,,                POINTER TO FPTAB FOR OPERAND 2
     *
     CTR   DS  5,,,                COUNT OF TEST COMBINATIONS
           DC  1,@
     *
     X     DS  10,,,               OPERAND 1
           DC  1,@
     Y     DS  10,,,               OPERAND 2
           DC  1,@
     *
     RADDHWDS  10,,,               RESULT FOR HW ADD
           DC  1,@
     SADDHWDS  4,,,                STATUS INDICATORS FOR HW ADD
           DC  1,@
     RADDSWDS  10,,,               RESULT FOR SW ADD
           DC  1,@
     SADDSWDS  4,,,                STATUS INDICATORS FOR HW ADD
           DC  1,@
     *
     RSUBHWDS  10,,,               RESULT FOR HW SUBTRACT
           DC  1,@
     SSUBHWDS  4,,,                STATUS INDICATORS FOR HW ADD
           DC  1,@
     RSUBSWDS  10,,,               RESULT FOR SW SUBTRACT
           DC  1,@
     SSUBSWDS  4,,,                STATUS INDICATORS FOR SW SUBTRACT
           DC  1,@
     *
     RMULHWDS  10,,,               RESULT FOR HW MULTIPLY
           DC  1,@
     SMULHWDS  4,,,                STATUS INDICATORS FOR HW MULTIPLY
           DC  1,@
     RMULSWDS  10,,,               RESULT FOR SW MULTIPLY
           DC  1,@
     SMULSWDS  4,,,                STATUS INDICATORS FOR SW MULTIPLY
           DC  1,@
     *
     RDIVHWDS  10,,,               RESULT FOR HW DIVIDE
           DC  1,@
     SDIVHWDS  4,,,                STATUS INDICATORS FOR HW DIVIDE
           DC  1,@
     RDIVSWDS  10,,,               RESULT FOR SW DIVIDE
           DC  1,@
     SDIVSWDS  4,,,                STATUS INDICATORS FOR SW DIVIDE
           DC  1,@
     *
     *  FLOATING POINT DATA TABLE (FROM PAUL KIMPEL, WITH CORRECTIONS)
     *
           DC  8,10000000
     FPTAB DC  2,01,,               1.0E+00
           DC  8,20000000
           DC  2,01,,               2.0E+00
           DC  8,30000000
           DC  2,01,,               3.0E+00
           DC  8,40000000
           DC  2,01,,               4.0E+00
           DC  8,-50000000
           DC  2,01,,              -5.0E+00
           DC  8,-60000000
           DC  2,01,,              -6.0E+00
           DC  8,-70000000
           DC  2,01,,              -7.0E+00
           DC  8,-80000000
           DC  2,01,,              -8.0E+00
           DC  8,-10000000
           DC  2,02,,              -1.0E+01
           DC  8,-20000000
           DC  2,03,,              -2.0E+02
           DC  8,-30000000
           DC  2,04,,              -3.0E+03
           DC  8,-40000000
           DC  2,05,,              -4.0E+04
           DC  8,50000000
           DC  2,-04,,              5.0E-05
           DC  8,60000000
           DC  2,-05,,              6.0E-06
           DC  8,70000000
           DC  2,-06,,              7.0E-07
           DC  8,80000000
           DC  2,01,,               8.0E-00
           DC  8,90000000
           DC  2,-08,,              9.0E-09
           DC  8,-90000000
           DC  2,10,,              -9.0E+09
           DC  8,00000000
           DC  2,-99,,              0.0E-99
           DC  8,-00000000
           DC  2,-99,,             -0.0E-99
           DC  8,11111111
           DC  2,10,,               0.11111111E+10
           DC  8,22222222
           DC  2,20,,               0.22222222E+20
           DC  8,33333333
           DC  2,30,,               0.33333333E+30
           DC  8,44444444
           DC  2,40,,               0.44444444E+40
           DC  8,55555555
           DC  2,50,,               0.55555555E+50
           DC  8,66666666
           DC  2,60,,               0.66666666E+60
           DC  8,77777777
           DC  2,70,,               0.77777777E+70
           DC  8,88888888
           DC  2,80,,               0.88888888E+80
           DC  8,99999999
           DC  2,90,,               0.99999999E+90
           DC  8,12345678
           DC  2,99,,               0.12345678E+99
           DC  8,11111111
           DC  2,-10,,              0.11111111E-10
           DC  8,22222222
           DC  2,-20,,              0.22222222E-20
           DC  8,33333333
           DC  2,-30,,              0.33333333E-30
           DC  8,44444444
           DC  2,-40,,              0.44444444E-40
           DC  8,55555555
           DC  2,-50,,              0.55555555E-50
           DC  8,66666666
           DC  2,-60,,              0.66666666E-60
           DC  8,77777777
           DC  2,-70,,              0.77777777E-70
           DC  8,88888888
           DC  2,-80,,              0.88888888E-80
           DC  8,99999999
           DC  2,-90,,              0.99999999E-90
           DC  8,12345678
           DC  2,-99,,              0.12345678E-99
           DC  8,99999999
           DC  2,99,,               0.99999999E+99
           DC  8,-99999999
           DC  2,99,,              -0.99999999E+99
           DC  8,99999999
           DC  2,-99,,              0.99999999E-99
           DC  8,-99999999
           DC  2,-99,,             -0.99999999E-99
           DC  8,10101011
           DC  2,11,,               0.10101011E+11
           DC  8,20202022
           DC  2,22,,               0.20202022E+22
           DC  8,30303033
           DC  2,33,,               0.30303033E+33
           DC  8,40404044
           DC  2,44,,               0.40404044E+44
           DC  8,50505055
           DC  2,55,,               0.50505055E+55
           DC  8,-60606066
           DC  2,66,,              -0.60606066E+66
           DC  8,-70707077
           DC  2,77,,              -0.70707077E+77
           DC  8,-80808088
           DC  2,88,,              -0.80808088E+88
           DC  8,-90909099
           DC  2,99,,              -0.90909099E+99
           DC  8,-12345678
           DC  2,99,,              -0.12345678E+99
           DC  8,-10101011
           DC  2,11,,              -0.10101011E+11
           DC  8,-20202022
           DC  2,22,,              -0.20202022E+22
           DC  8,-30303033
           DC  2,33,,              -0.30303033E+33
           DC  8,-40404044
           DC  2,44,,              -0.40404044E+44
           DC  8,-50505055
           DC  2,55,,              -0.50505055E+55
           DC  8,60606066
           DC  2,-66,,              0.60606066E-66
           DC  8,70707077
           DC  2,-77,,              0.70707077E-77
           DC  8,80808088
           DC  2,-88,,              0.80808088E-88
           DC  8,90909099
           DC  2,-99,,              0.90909099E-99
           DC  8,-12345678
     TABENDDC  2,-99,,             -0.12345678E-99
     *
     *  FLOATING POINT LIBRARY PARAMETERS
     *
           DSC 1,1,401,            ALLOW OVERFLOW/UNDERFLOW
           DAC 1,0,,               NOISY DIGIT = 0
     *
           DENDSTART
