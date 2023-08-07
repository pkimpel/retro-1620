00010**********************************************************************
00020*
00030*                                 EQTCD
00040*
00050*          PUNCH THE SYMBOL TABLE IN ALPHA ORDER WITH -DIM- NO.
00060*             ONTO CARDS.
00070*          MODIFIED FROM BRUCE KITCHEN-S  -EQTBL-
00080*
00090*          VERSION 2             12 DEC 1968          P H KIMPEL
00100*
00110**********************************************************************
00120*
00130EQ    DDA ,0,5000,80,20000
00140NINES DC  12,999999999999
00150NT    DS  5
00160ST    DS  5
00170ALP   DAS 81
00180M1    DAC 9,OPERATOR@
00190M2    DAC 30,TYPE IN DATE AS DD MMM YYYY  @
00200DATE  DAC 12,DATE  DD MMM
00210      DAC 6, 1968@
00220M3    DAC 23,TYPE IN TIME AS HHMM  @
00230TIME  DAC 11,TIME  HHMM@
00240ER    DAC 28,SSW 4 IF ERRORS, ELSE START@
00250TITLE DAC 26,*** EQUIVALENCE TABLE ***@
00260FORT  DAC 44,FORTRAN LIBRARY FUNCTIONS   *DO NOT DELETE*@
00270USER  DAC 42,USER PROGRAMS, SUBROUTINES, AND FUNCTIONS@
00280BLANK DAC 40,                                        ,
00290      DAC 41,                                        @
00300**********************************************************************
00310*            EXECUTION BEGINS HERE
00320**********************************************************************
00330START SK  EQ,,                 ,READ OCCURS JUST BEFORE HALT
00340      RCTY
00350      WATYM1
00360      RCTY
00370DMSG  WATYM2
00380      RATYDATE+12
00390      RCTY
00400      WATYM3
00410      RATYTIME+12
00420      RCTY
00430      RCTY
00440      WATYER
00450      RDN EQ,,                 ,READ THE AWFUL MESS....
00460      H
00470      RCTY
00480      BC4 DMSG,,               ,BR BACK TO TYPE-IN ON SSW 4
00490      TR  ALP-1,BLANK-1
00500      TRNMALP+53,TITLE-1
00510      TDM  ALP,1,              ,CARRIAGE CONTROL
00520      TDM  ALP-1,7
00530      WACDALP
00540      WACDBLANK
00550      WACDBLANK
00560      TR  ALP-1,BLANK-1
00570      TRNMALP+1,FORT-1
00580      WACDALP
00590      WACDBLANK
00600*
00610      BSIA *+12,,              ,SELECT INDIRECT ADDRESSING
00620      BSBA*+12,,               ,SELECT XR BAND -A-
00630INIT  BLXM*+12,16(A1),          ,,CARD COL POINTER IN XA1
00640      BLXM*+12,5(A2)           ,POINTER FOR NO. OF ENTRIES ON CARD
00650      TR   ALP-1,BLANK-1,      ,BLANK CARD AREA
00660      TFM ST,2011
00670      TFM NT,20027
00680LOOP  C   -ST,-NT
00690      BNH *+24
00700      TF  ST,NT
00710      AM  NT,16,10
00720      BNR *+20,-NT             ,TEST FOR END OF USER TABLE
00730      B7  L1
00740      C   -NT,NINES
00750      BNE LOOP,,               ,TEST FOR END OF TABLE
00760L1    TF  ALP(A1),-ST,         , TRANSFER ALPHA NAME TO CARD AREA
00770      AM  ST,4,10
00780      TNF ALP+12(A1),-ST,      ,TRANSFER DIM NO.
00790      BXM *+12,32(A1),         ,INCR CARD COL POINTER
00800      BCXM*+60,-1(A2),         ,CK FOR FULL CARD AREA
00810      WACDALP,,                ,PUNCH A LINE
00820      TR   ALP-1,BLANK-1       ,BLANK CARD AREA
00830      BLXM*+12,5(A2),          ,RESTORE  ))
00840      BLXM*+12,16(A1),         ,POINTERS ))
00850      TF  NT,ST
00860      SM  NT,15,10
00870      AM  ST,1,10
00880      TR  -NT,-ST,             ,WIPE OUT SORTED ITEM
00890      TFM ST,20011
00900      TFM NT,20027
00910      BNR  *+32,-NT,           ,CK  FOR END OF USER TABLE
00920      BNR  *+44,-ST,
00930      B7   QUIT,,              , ALL DONE IF RECORD MARKS AT BOTH
00940      C    -NT,NINES,          ,CK FOR END OF FORT TABLE
00950      BNE  LOOP
00960      C    -ST,NINES
00970      BNE  L1
00980      WACD ALP,,               ,PUNCH LAST LINE OF FORT TABLE
00990      WACDBLANK
01000      TR  20000,20016,         ,LOOK FOR USER TABLE
01010      C   20011,NINES
01020      BE  *-24
01030      WACDBLANK
01040      TR  ALP-1,BLANK-1
01050      TRNMALP+1,USER-1
01060      WACDALP
01070      WACDBLANK
01080      B7  INIT
01090*
01100*
01110QUIT  WACDALP,,                ,PUNCH LAST LINE OF USER TABLE
01120      WACDBLANK
01130      WACDBLANK
01140      TR  ALP-1,BLANK-1
01150      TRNMALP+1,DATE-1
01160      WACDALP
01170      TR  ALP-1,BLANK-1
01180      TRNMALP+1,TIME-1
01190      WACDALP
01200      WACDBLANK
01210      CALLEXIT
01220      DENDSTART
||||
