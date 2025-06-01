     **********************************************************************
     *                           WINTER-PI                                *
     **********************************************************************
     * CALCULATE N DIGITS OF PI BASED ON A SPECIFIED AMOUNT OF MEMORY.
     * THE TOTAL AMOUNT OF MEMORY (MAX ADDRESS+1) IS SPECIFIED IN LOCATIONS
     * 00402-00406. THIS MAY BE CHANGED BY AN INSERT OF THE FORM
     *     1600406L00004900540
     * WHERE THE L IS A FLAGGED 3 TO SET THE FIELD MARK. THIS WILL USE
     * THE FIRST 30000 DIGITS OF MEMORY. TO COMPUTE THE NUMBER OF PI DIGITS
     * THIS WILL GENERATE, USE THE FORMULA (WHERE THE DIVISIONS TRUNCATE)
     *     (((MEMSIZE - 1500)/9)/14)*4
     * THUS, 30000 DIGITS OF MEMORY WILL GENERATE 904 PI DIGITS.
     *
     * THIS WAS WRITTEN FOR A 1620 MODEL 2, BUT IT SHOULD RUN ON A MODEL 1
     * WITH AUTOMATIC DIVISION AND INDIRECT INDEXING IF YOU CHANGE THE
     * BSIA (60) INSTRUCTION AT LABEL -START- TO A NOOP (41).
     *
     * BASED ON A C PROGRAM BY DIK WINTER OF CWI, AMSTERDAM AS DISCUSSED IN
     * HTTPS..//CRYPTO.STANFORD.EDU/PBC/NOTES/PI/CODE.HTML
     **********************************************************************
     * 2023-04-15  P.KIMPEL
     *   ORIGINAL VERSION, FROM RETRO-B5500 (BURROUGHS B5500) VERSION.
     * 2025-05-31  P.KIMPEL
     *   UPDATE FOR 9-DIGIT PRECISION AND 60K DIGIT MEMORY.
     **********************************************************************
     PROD  DS  20,99,,                  ADDR OF PRODUCT AREA
     WORK  DS  20,PROD-20,,             ADDR OF SCRATCH AREA
     SCALDGDS  2,4,,                    DECIMAL PLACES IN SCALE FACTOR
     WORDDGDS  2,SCALDG*2+1,,           DIGITS PER TERM WORD
     PGMMEMDS  5,1500,,                 MEMORY REQ FOR PROGRAM CODE
           DORG402
     MEMSZ DC  5,60000,,                MAX ADDRESS ON SYSTEM
     WORDBTDC  2,14,,                   BITS REQUIRED FOR SCALE FACTOR
     DIGITSDC  4,0,,                    DIGITS OF PI TO COMPUTE
     *
     A     DC  5,10000,,                INTEGER ARITHMETIC SCALE FACTOR
     B     DC  5,0,,                    CURRENT INDEX INTO F
     C     DC  5,0,,                    CURRENT LAST TERM IN F
     D     DC  WORDDG,0,,               SCALED F TERM
     E     DC  4,0,,                    RESIDUE FROM PRIOR CYCLE
     FADJ  DC  4,0,,                    FTOP ADDR ADJ EACH CYCLE
     FLIM  DC  5,0,,                    NR TERMS IN F ARRAY
     FLOC  DC  5,0,,                    CURRENT F TERM ADDRESS, F(B)
     FTOP  DC  5,0,,                    CURRENT ADDR OF STARTING F TERM
     G     DC  5,0,,                    BASICALLY B*2
     *
     LINECTDC  2,10,,                   LINE COUNTER, 10 GROUPS/LINE
     MSG1  DAC 14,CALCULATE ****,
     PIDIG DAS 0,MSG1+26,,
           DAC 2, @
     MSG2  DAC 13,DIGITS OF PI@
     FINITODAC 7,FINITO@
     *
     START 60  *+12,9,,                 BSIA..TURN ON INDIRECT ADDRESSING
           MM  WORDBT,WORDDG,10,        COMPUTE F ADDR ADJUSTMENT
           TF  FADJ,PROD,,              FADJ=FTOP ADJUSTMENT EACH CYCLE
           TF  WORK,MEMSZ,,             LOAD TOTAL SIZE OF MEMORY
           SM  WORK,PGMMEM,,            SUBTRACT MEM REQ FOR PROGRAM
           LD  PROD,WORK,,              LOAD MEM DIGITS AVAIL AS DIVIDEND
           DM  PROD-4,WORDDG,10,        DIVIDE BY DIGITS PER WORD
           TF  WORK,PROD-2,,            SAVE QUOTIENT, NR WORDS
           LD  PROD,WORK,,              LOAD NR WORDS AS DIVIDEND
           D   PROD-4,WORDBT,,          DIVIDE BY BITS/WORD
           TF  WORK,PROD-2,,            SAVE QUOTIENT, DISCARD REMAINDER
           MM  WORK,SCALDG,10,          COMPUTE NUMBER OF PI DIGITS
           SF  PROD-3,,,                LIMIT PRODUCT TO 4 DIGITS
           TF  DIGITS,PROD,,            SAVE NUMBER OF PI DIGITS
           M   WORK,WORDBT,,            MUL BY BITS/WORD, ACTUAL NR WORDS
           SF  PROD-4,,,                LIMIT PRODUCT TO 5 DIGITS
           TF  FLIM,PROD,,              SAVE ACTUAL NR WORDS IN F
           TF  C,FLIM,,                 INITIALIZE C TO LAST F TERM INDEX
           TF  FTOP,MEMSZ,,             FTOP=SIZE OF MEMORY
           SM  FTOP,1,10,               FTOP=ADDR OF LAST TERM
     *
           RCTY
           RCTY
           TNF PIDIG,DIGITS,,
           WATYMSG1,,,                  PRINT NUMBER OF PI DIGITS
           WATYMSG2,,,
           RCTY
           RCTY
     *
     * INITIALIZE F ARRAY
     *
           TF  B,FLIM,,                 B=MAX F INDEX
           AM  B,1,10,                  B+=1, CLEAR FLIM+1 TERMS
           TF  FLOC,FTOP,,              SET ADDR OF LAST F TERM
     INITF TFM -FLOC,2000,8,            STORE INITIAL F TERM VALUE
           SM  FLOC,WORDDG,10,          STEP TO NEXT TERM
           SM  B,1,10,                  DECREMENT B
           BNZ INITF,,,                 LOOP UNTIL DONE
     *
     * OUTER LOOP - INITIALIZE NEXT SET OF TERMS TO GENERATE PI DIGITS
     *
     L1    TF  G,C,,                    SET G TO CURRENT LAST TERM INDEX
           A   G,C,,                    G = C*2
           BZ  DONE,,,                  IF G=C=0, WE ARE DONE
     *
           S   D,D,,                    D=0, RESIDUE FOR THIS CYCLE
           TF  B,C,,                    B=C, TERM INDEX FOR THIS CYCLE
           TF  FLOC,FTOP,,              INITIALIZE FLOC TO LAST TERM ADDR
     *
     * INNER LOOP - PROCESS NEXT SET OF TERMS
     *
     L2    M   -FLOC,A,,                F(B)*A, SHIFT LEFT 4 DIGITS
           SF  PROD-WORDDG+1,,,         LIMIT PRODUCT TO WORDDG DIGITS
           A   D,PROD,,                 D += F(B)*A
           SM  G,1,10,                  --G
           LD  PROD,D,,                 LOAD D AS DIVIDEND
           D   PROD-WORDDG+1,G,,        COMPUTE D/G
           TF  -FLOC,PROD,,             SAVE D MOD G IN F TERM
           TF  D,PROD-5,,               SAVE D/G IN D
           SM  G,1,10,                  --G (AGAIN)
           SM  B,1,10,                  --B
           BZ  ENDL2,,,                 IF B=0, JUMP OUT OF INNER LOOP
           SM  FLOC,WORDDG,10,          ELSE DECREMENT FLOC TO MATCH B
           M   D,B,,                    COMPUTE D*B
           SF  PROD-WORDDG+1,,,         LIMIT PRODUCT TO WORDDG DIGITS
           TF  D,PROD,,                 D = D*B
           B   L2,,,                    REPEAT INNER LOOP FOR NEXT TERM
     *
     ENDL2 LD  PROD,D,,                 LOAD D AS DIVIDEND
           D   PROD-WORDDG+1,A,,        DIVIDE BY 10000
           SF  PROD-8,,,                LIMIT QUOTIENT TO 4 DIGITS
           A   E,PROD-5,,               E += D/A (REMAINDER USE BELOW)
           TNF PIDIG,E,,                MOVE 4 DIGITS TO OUTPUT
           WATYPIDIG-6,,,               PRINT 4 DIGITS OF PI
           SM  LINECT,1,10,             --LINECT
           BNZ *+36,,,                  IF NON-ZERO, CONTINUE ON SAME LINE
           RCTY,,,                      ELSE, START NEW LINE
           TFM LINECT,10,10,            RESET LINE COUNTER
     *
           S   C,WORDBT,,               DECREMENT C BY NR TERMS COMPLETED
           S   FTOP,FADJ,,              DECREMENT FTOP ADDR ACCORDINGLY
           SF  PROD-3,,,                LIMIT REMAINDER TO 4 DIGITS
           TF  E,PROD,,                 E = D MOD A
           B   L1,,,                    LOOP TO NEXT SET OF TERMS
     *
     DONE  RCTY
           RCTY
           WATYFINITO,,,
           H   99999,77777,,
           DENDSTART
