34000480070136000480070260000365100060024025100911963611300102 1620-2 MON-I BOOT
||JOB 5                         POINT FOR FORTRAN II-D
||DUP                           WILL HALT ON FIRST USE BECAUSE POINT ISNT THERE
*DELETPOINT
||SPS 5
**POINT -- FORTRAN II-D PLOTTER POINT ROUTINE
*PRINT SYMBOL TABLE
*LIST PRINTER
* ERROR STOP
* ASSEMBLE RELOCATABLE
* STORE RELOADABLE
* NAME POINT
*OUTPUT CARD
00010*  SUBROUTINE POINT
00020S     DS  ,*+101,STANDARD FORTRAN SUBPROGRAMME HEADING
00030      DC  6,987898,5-S
00040      DAC 6,POINT ,7-S
00050      DVLC22-S,5,END-1,2,08,2,04,5,POINT-6,5,0,30,0
00060      DSC 17,0,0
00070      DORGS-100
00080      DS  5
00090POINT SF  LINK,,,BEGIN TRANSFER OF ARGUMENTS
00100      SM  LINK,5,10
00110      TF  STYLE,LINK,11
00120      SM  LINK,5,10
00130CF    CF  LINK
00140      TF  *+35,-LINK
00150SF    SF  LINK
00160      BTM TOFAC
00170      SM  LINK,5,10
00180      TF  TIMES,LINK,11
00190      SM  LINK,5,10
00200      TF  DOT,LINK,11
00210      SM  LINK,1,10,CALCULATE RETURN ADDRESS
00220      CF  LINK
00230      BTM FDV,FOUR,7,SCALE AND FIX SIZE
00240      BTM FAD,HALF,7
00250BTM   BTM FIX,FAC,7
00260      TF  SIZE,FAC
00270      SF  STYLE-1,,,SPLIT STYLE IN TWO
           SF  STYLE-3
00280DAVID CM  STYLE,10,10,EXAMINE ARGUMENTS FOR ERRORS
00290      BP  ER1
00300      CM  STYLE,1,10
00310      BN  ER1
00320      CM  SIZE,30,10
00330      BP  ER2
00340      CM  SIZE,1,10
00350      BN  ER3
00360      CM  TIMES,5,10
00370      BP  ER4
00380      CM  TIMES,1,10
00390      BN  ER4
00400      BD  NODOT,DOT,,EXAMINE DOT AND BRANCH IF NOT REQUIRED
00410      WN  R1,200,,PLOT DOT
00420NODOT WN  R2,200,,PEN DOWN
00430      TF  X,TIMES,,SET TIMES LOOP
00440      MM  STYLE,5,10,CALCULATE STYLE ADDRESS
00450      SF  95
00460      CF  96
00470CT    AM  99,PLUS-5,7
00480ROUND TF  N,-99,,PLANT INDIRECT ADDRESS OF PLOTTING INSTRUCTION
00490      SF  N
00500LOOP  TF  COUNT,SIZE,,SET LOOP FOR NUMBER OF TIMES EACH SIDE IS TO BE
00510BIGGERWN  ,200,,PLOT SIDE                                   REPEATED
00520      BNF SKIP,N,11,DETERMINE IF PEN UP OR DOWN,IF SO DO ONLY ONCE
00530      SM  COUNT,1,10
00540      CM  COUNT,0,10
00550      BNE BIGGER,,,COMPLETE LOOP FOR ONE SIDE
00560SKIP  SM  N,5,10,INCREMENT PLOTTING ADDRESS
00570      BNR LOOP,N,711,DETERMINE IF CHARACTER IS COMPLETE
00580      SM  X,1,10
00590      CM  X,0,10,DETERMINE IF TIMES LOOP IS COMPLETE,IF NOT,
00600      BNE ROUND,,,REPEAT CHARACTER
00610      CM  STYLE2,0,10,SEE IF A SECOND CHARACTER IS REQUIRED,IF NOT,
00620      BE  OUT,,,RETURN
00630      TF  STYLE,STYLE2,,,PLACE STYLE2 IN STYLE AND
00640      TFM STYLE2,0,10,PUT NAUGHT IN STYLE AND
00650      B7  DAVID,,,REPEAT OPERATION
00660OUT   B7  -LINK,,,     ****RETURN****
00670ER1   RCTY,,,PRINT APPROPRIATE ERROR MESSAGES
00680      WATYEC
00690      WATYE1
00700      B7  -LINK
00710ER2   RCTY
00720      WATYEC
00730      WATYE2
00740      B7  -LINK
00750ER3   RCTY
00760      WATYEC
00770      WATYE3
00780      B7  -LINK
00790ER4   RCTY
00800      WATYEC
00810      WATYE4
00820      B7  -LINK
00830N     DS  ,BIGGER+6,P ADDRESS OF PLOTTER INSTRUCTION
00840COUNT DS  ,CT-1
00850X     DS  ,LOOP-1
00860*ADDRESSES OF ADDRESSES OF FIRST SIDES
00870PLUS  DSA ONE,TWO,THREE,FOURQ,FIVE,SIX,SEVEN,EIGHT,NINE,TEN
00880*ADDRESSES OF SIDES
00890ONE   DSA    A,B,B,A,G,H,H,G,END1
00900TWO   DSA UP,P,A,DN,I,L,A,A,UP
00910      DSA B,R,DN,END1
00920THREE DSA    C,D,D,C,F,E,E,F,END1
00930FOURQ DSA UP,E,DN,G,G,B,B,H,H,A
00940      DSA A,UP,F,DN,END1
00950FIVE  DSA UP,H,DN,C,F,D,E, UP
00960      DSA      G,DN,END1
00970SIX   DSA UP,R,A,DN,L,I,A,A,UP,B
00980      DSA P,DN,END1
00990SEVEN DSA UP,T,H,DN,J,K,H,H,UP,G
01000      DSA Q,DN,END1
01010EIGHT DSA UP,Q,H,DN,K,J,H,H,UP,G
01020      DSA T,DN,END1
01030NINE  DSA    G,Q,A,Q,H,H,Q,A,Q
01040      DSA G,END1
01050TEN   DSA    A,R,H,R,B,B,R,H,R
01060      DSA A,END1
01070*PLOTTING OPERATIONS
01080A     DSC 3,N5@
01090B     DSC 3,J1@
01100C     DSC 3,M4@
01110D     DSC 3,Q8@
01120E     DSC 3,O6@
01130F     DSC 3,K2@
01140G     DSC 3,L3@
01150H     DSC 3,P7@
01160I     DSC 4,K32@
01170J     DSC 4,K12@
01180K     DSC 4,M54@
01190L     DSC 4,Q78@
01200P     DSC 2,P@
01210Q     DSC 2,J@
01220R     DSC 2,L@
01230T     DSC 2,N@
01240UP    DSC 2,9@
01250DN    DSC 2,0@
01260END1  DSC 1,@
01270*ERROR MESSAGES
01280EC    DAC 13,POINT ERROR-@
01290E1    DAC 14,UNKOWN SYMBOL@
01300E2    DAC 15,SIZE TOO LARGE@
01310E3    DAC 15,SIZE TOO SMALL@
01320E4    DAC 18,TOO MANY RETRACES@
01330STYLE DS  ,BTM+11,DEFINE SYMBOLS IN Q ADDRESSES OF
01340STYLE2DS  ,STYLE-2, SF AND CF INSTRUCTIONS
01350LINK  DS  ,POINT-1,RETURN ADDRESS
01360SIZE  DS  5
01370TIMES DS  ,POINT+11
01380FOUR  DC  10,M0000000]J
01390HALF  DC  10,N0000000]0
01400COUNT1DS  ,SF+11
01410R1    DSC 6,07135@
01420R2    DS  ,DN
01430DOT   DS  ,CF+11
01440FDV   DS  ,4162,ADDRESSES OF FORTRAN SUBROUTINES
01450FAD   DS  ,4090
01460FIX   DS  ,3854
01470FAC   DS  ,2492
01480TOFAC DS  ,3408
01490END   DAC 1, ,
01500      DC  1,@,END-1
01510      DEND
98010********** TRANSCRIPTION NOTES (P.KIMPEL, DEC 2023)
98030*     INTEGER SIZE IN FORTRAN HEADER DVLC CHANGED FROM 05 TO 04
98040*     TO MATCH THE DEFAULT FOR MONITOR I BUILDS.
||||