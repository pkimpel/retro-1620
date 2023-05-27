00010*
00020*         1311 FILE DIAGNOSTIC
00030*
00040*         DT 0022 - FAULT ISOLATION
00050*
00060*
00070*         CONTROL ROUTINES
00080*
           DORG00402
00100S     B   *+12,,,        RESTART BRANCH
00110      RCTY,,,            RET CARR
00120      WATYT1,,,          TYPE TEST NAME
12345      RCTY
12345      WATYWRCD1,,,       REMOVE DISK
12345      RCTY
12345      WATYWRCD2,,,         PACKS
12345      BNC3*,,,           WAIT TILL SW3 IS ON
00130*
00140*         TYPE OUT SWITCH SETTINGS
00150*
00160      RCTY,,,            RET CARR
00170      WATYT30,,,         TYPE SW3 ON
00180      RCTY,,,            RET CARR
00190      WATYT2,,,          T/O SW SETTINGS
00200      RCTY,,,            RET CARR
00210      WATYT3,,,          T/O SENSE - OFF
00220      RCTY,,,            RET CARR
00230      WATYT4,,,          T/O DATA -PROG
06220      TDM NOPAD+1,1,,    INSURE NOP
00240      H   ,,,            HALT
00250*
00260*         ASK IF PROGRAM IS TO CHECK
00270*         FLAGGED ADDRESS PROTECTION
00280*
00290      RCTY,,,            RET CARR
00300      WATYT6,,,          CK FLG ADRS
00310      RATYANS,,,         ACCEPT ANSWER
00320      BC3 *-12,,,        SW3 ON TYP AGN
00330      SF  ANS-1,,,       SET FLAG
00340      CM  ANS,68,10,     CK FOR YES
00350      BNE *+36,,,        BRCH NOT EQUAL
00360      TD  TSM,RM,,       PUT RM IN MAP
00370      B   *+24,,,        SKIP NEXT INST
00380      TDM TSM,00,,       CLEAR MAP
00390      TFM S+6,*,,        LOAD RESTART
00400*
00410*         REQUEST AND ACCEPT THE
00420*         MODULE NUMBER THAT
00430*         DISK PACK IS ON
00440*
06240SAD1  RCTY
00460      WATYT5,,,          RQT MOD NO.
00470      RNTYN,,,           ACCEPT NO.
00480      BC3 *-12,,,        SW3 ON,KEY AGAIN
00490*
00500*         COMPUTE DRIVE CODE DIG FROM
00510*         MOD NO.AND LOAD SUB-INST
00520*         AND STORE MATH TABLES
00530*
00540      MM  N,2,10,        DOUBLE MOD NO.
00550      AM  99,01,8,       ADD ONE
00560      TD  M,99,,         STORE DRIVE CODE
00570      TD  S1,M,,         LOAD SUB-INST
00580      TD  S2,M,,         LOAD SUB-INST
00590      TD  S3,M,,         LOAD SUB-INST
00600      TR  TAB,00100,,    STORE MATH TABLES
06210NOPAD NOP SAD
00610      TFM S+6,*,,        LOAD RESTART
00620*
00630*         RESET THE INDICATORS THAT
00640*         TURN ON ANY DATA CHECK
00650*
00660J0    BNI *+24,01900,,   ANY DATA CK
00670      BTM RS,*,,         BRCH TO SUB-ROUT
00680*
00690*         THIS ROUTINE SEEKS CYLINDER 97
00700*         AND CHECKS ADR CK INDICATOR
00710*
00720J1    TFM S2+5,19400,,   INIT SUB-INST
00730      TFM S2+8,001,9,    INIT SCTR CNT
00740      K   S2,00701,,     SEEK CYLINDER 97
00750      BNI *+48,01900,,   ANY DATA CHECK
00760      TFM ERR+18,*-24,,  LOAD RETURN
00770      TFM E1+6,ER8,,     LOAD OPERATON
00780      B   ERR,,,         BRCH TO ER ROUT
00790      TFM S2+5,00000,,   INIT SUB-INST
00800J4    RN  S2,00702,,     READ SECTOR
00810J3    BI  J5,03600,,     ADRESS CK
00820      TFM S2+8,020,9,    INIT SUB-INST
00830      TF  A2+5,RM,,      PUT RM IN A2 ADS
00840      RN  S2,00706,,     READ TRACK
00850      BNR *+36,A2+5,,    CK FOR RM IN A2
00860      BTM ET,ER51,,      BRCH,LOAD ER T/O
00870      B   J1,,,          TRY AGAIN
00880      SF  A2+1,,,        SET FLAG
00890      MM  A2+3,05,10,    MULTIPLY BY 5
00900      BD  *+24,096,,     BRCH DIGIT
00910      B   *+60,,,        BYPASS
00920      TD  ER70+104,96,,  LOAD SCTR RANGE
00930      BTM ET,ER70,,      BRCH,LOAD ER T/O
00940      BTM ET,ER80,,      BRCH,LOAD ER T/O
00950      B   J1,,,          TRY AGAIN
00960      CM  99,970,,       IS IT CYL 97
00970      BNE *+36,,,        BRCH IF NOT EQ
00980      BTM ET,ER52,,      BRCH,LOAD ER T/O
00990      B   J1,,,          TRY AGAIN
01000      TD  ER54+22,97,,   LOAD CYL NO.
01010      TD  ER54+24,98,,   LOAD CYL NO.
01020      BTM ET,ER54,,      BRCH,LOAD ER T/O
01030      BTM ET,ER80,,      BRCH,LOAD ER T/O
01040      B   J1,,,          TRY AGAIN
01050J5    TFM S2+8,020,9,    INIT SUB-INST
01060      RN  S2,00706,,     READ TRACK
01070      SF  A2+1,,,        SET FLAG
01080      MM  A2+3,05,10,    MULTIPLY BY 5
01090      BD  *+24,096,,     BRCH DIGIT
01100      B   *+48,,,        BYPASS
01110      TD  ER70+104,96,,  LOAD SCTR RANGE
01120      BTM ET,ER70,,      BRCH,LOAD ER T/O
01130      B   J1,,,          TRY AGAIN
01140      CM  99,970,,       IS IT CYL 97
01150      BE  *+60,,,        BRCH IF EQUAL
01160      TD  ER54+22,97,,   LOAD CYL NO.
01170      TD  ER54+24,98,,   LOAD CYL NO.
01180      BTM ET,ER54,,      BRCH,LOAD ER T/O
01190      B   J1,,,          TRY AGAIN
01200      TFM S+6,*,,        LOAD RESTART
01210      BC2 J1,,,          SW3 ON REPEAT
01220*
01230*         THIS ROUTINE ATTEMPTS TO FIND
01240*         A GOOD HD TO TEST OUT SEEKS
01250*
01260      BNI *+24,01900,,   ANY DATA CK
01270      BTM RS,*,,         RESET INDICATORS
01280J6    TFM S2+5,19400,,   INIT SUB-INST
01290      TFM S2+8,001,9,    INIT SUB-INST
01300      TDM A2,00,11,      SET FLG ZERO
01310      TFM J7+11,TD+1,,   INITIALIZE
01320J9    TFM M1,00000,,     RESET ERROR MAP
01330      RN  S2,00702,,     READ SECTOR
01340      BNI *+24,00600,,   READ CHECK
01350      TDM M1-2,01,,      PUT DIG IN MAP
01360      BNI *+24,01600,,   MBR-E CK
01370      TDM M1-1,01,,      PUT DIG IN MAP
01380      BNI *+24,01700,,   MBR-O CK
01390      TDM M1-1,01,,      PUT DIG IN MAP
01400      BNI *+24,03600,,   ADRS CK IND
01410      TDM M1,01,,        PUT DIG IN MAP
01420J7    TD  *+23,99999,,   LOAD COMPARE
01430      CM  A2+1,00000,10, COMPARE HD NO.
01440      BE  *+24,,,        BRCH IF EQUAL
01450      TDM M1-3,01,,      PUT DIG IN MAP
01460      CM  M1,00000,,     IS MAP ALL ZEROS
01470      BE  J8,,,          BRCH IF EQUAL
01480      CM  S2+5,19580,,   SEE IF DONE
01490      BE  *+48,,,        BRCH IF EQUAL
01500      AM  S2+5,00020,,   UPDATE
01510      AM  J7+11,010,,    UPDATE
01520      B   J9,,,          TRY NEXT HEAD
01530      BTM ET,ER55,,      BRCH,LOAD ER T/O
01540      B   J6,,,          TRY AGAIN
01550J8    TFM S+6,*,,        LOAD RESTART
01560      BC2 J6-24,,,       LOOP ROUTINE
01570*
01580*         COMPUTE GOOD HEAD,AND
01590*         RESET INDICATORS
01600*
01610      MM  S2+4,05,10,    MULTIPLY
01620      TD  *+23,98,,      LOAD MULT.
01630J14   MM  C2,00000,10,   MULTIPLY
01640      TF  C3,C1,,        LOAD CYL 11
01650      A   C3-1,99,,      ADD CORRECT HD
01660      BNI *+24,01900,,   ANY DATA CHECK
01670      BTM RS,*,,         RESET INDICATORS
01680*
01690*         THIS ROUTINE TESTS THE
01700*         SEEK OPERATIONS
01710*
01720      TF  S2+5,C3,,      LOAD SUB-INST
01730      TFM S2+8,001,9,    LOAD SUB-INST
01740J11   K   S2,00701,,     SEEK CYLINDER
01750      BNI *+48,01900,,   ANY DATA CHECK
01760      TFM ERR+18,*-24,,  LOAD RETURN
01770      TFM E1+6,ER8,,     LOAD OPERATION
01780      B   ERR,,,         BRCH TO ER ROUT
01790      RN  S2,00702,,     READ SECTOR
01792      BI  *+12,00600
01794      BI  *+12,01600
01796      BI  *+12,01700
01800      BNI J10,03600,,    ADRS CHECK
01810      TFM S2+8,020,9,    LOAD SUB-INST
01820      RN  S2,00706,,     READ TRACK
01830      MM  S2+4,05,,      MULTIPLY BY 5
01840      TD  ER56+50,96,,   LOAD CYL NO.
01850      TD  ER56+52,97,,   LOAD CYL NO.
01860      MM  A2+4,05,,      MULTIPLY BY 5
01870      TD  ER56+22,96,,   LOAD CYL NO.
01880      TD  ER56+24,97,,   LOAD CYL NO.
01890      BTM ET,ER56,,      BRCH,LOAD ER T/O
01900      B   J11-12,,,      TRY AGAIN
01910J10   CM  S2+2,017,10,   SEE IF DONE
01920      BNL *+36,,,        BRCH IF EQUAL
01930      AM  S2+5,02200,,   UPDATE-NEXT CYL
01940      B   J11,,,         TRY NEXT CYL
01950      TFM S+6,*,,        LOAD RESTART
01960      BC2 J11-24,,,      SW2 ON LOO9P BK
01970*
01980*         THIS ROUTINE TESTS THAT
01990*         HEADS ARE WORKING PROPERLY
02000*
02010*         FIRST GENERATE TEST DATA
02020*
02030      SF  TD,,,          SET FLAG
02040      TFM *+30,A1+100,,  INITIALIZE
02050      TFM *+30,A1+1,,    INITIALIZE
02060      TF  99999,TD+99,,  PUT DATA IN A1
02070      CF  99999,,,       CLEAR FLAG
02080      CM  *-18,A1+2000,, SEE IF DONE
02090      BE  *+48,,,        BRCH IF EQUAL
02100      AM  *-42,100,,     UPDATE
02110      AM  *-42,100,,     UPDATE
02120      B   *-72,,,        LOAD NEXT SECTOR
02130      TFM S+6,*,,        LOAD RESTART
02140*
02150*         SEEK CYLINDER 97 FOR ATTEMPTED
02160*         READ WITH EACH HEAD
02170*
02180J15   TFM S2+5,19400,,   INITIALIZE
02190      TFM S2+8,001,9,    SET UP SCTR CNT
02200      K   S2,00701,,     SEEK CYLINDER 97
02210      BNI *+48,01900,,   ANY DATA CHECK
02220      TFM ERR+18,*-24,,  LOAD RETURN
02230      TFM E1+6,ER8,,     LOAD OPERATION
02240      B   ERR,,,         BRCH TO ER ROUT
02250      RN  S2,00702,,     READ SECTOR
02260      BNI J17-24,03600,, ADRS CHECK
02270      TFM S2+8,020,9,    SET UP SCTR CNT
02280      TFM S2+5,19400,,   RESET ADDRESS
02290      TD  *+23,J14+11,,  PUT DIG IN MULT
02300      MM  C2,00000,10,   MULTIPLY
02310      A   S2+4,99,,      ADD CORRECT HD
02320      RN  S2,00706,,     READ TRACK
02330      SF  A2+1,,,        SET FLAG
02340      MM  A2+3,05,10,    MULTIPLY BY 5
02350      TD  ER54+22,97,,   LOAD
02360      TD  ER54+24,98,,     CYLINDER
02370      BTM ET,ER54,,      BRCH,LOAD ER T/O
02380      B   J15,,,         TRY AGAIN
02390*
02400*         CLEAR READ IN AREA
02410*
02420      BNI *+24,01900,,   ANY  DATA CHECK
02430      BTM RS,*,,         RESET INDICATORS
02440J17   TFM *+18,A2+100,,  INITIALIZE
02450      TFM 99999,,,       LOAD ZEROS
02460      SM  *-6,4,,        SUBTRACT
02470      CM  *-18,A2,,      SEE IF DONE
02480      BNE *-36,,,        BRCH NOT EQUAL
02490*
02500*         READ SECTOR INTO A2
02510*
02520J13   RN  S2,00702,,     READ SECTOR
02530      BNI *+48,01900,,   ANY DATA CHECK
02540      TFM ERR+18,J16,,   LOAD RETURN
02550      TFM E1+6,ER5S,,    LOAD ER T/O
02560      B   ERR,,,         BRCH TO ER TOUT
02570*
02580*         PROGRAM COMPARE OF DATA READ
02590*
02600      MM  S2+4,05,,      MULTIPLY BY 5
02610      TD  A1+1,98,,      LOAD HD DIGIT
02620      TDM A1,00,11,      SET FLAG
02630      TDM A2,00,11,      SET FLAG
02640      C   A1+100,A2+100,,COMPARE
02650      BE  J16,,,         BRCH IF EQUAL
02660      C   A1+1,A2+1,,    COMPARE HD
02670      TFM ERR+18,J16,,   LOAD RETURN
02680      TFM E1+6,ER6,,     LOAD ER T/O
02690      BE  *+36,,,        BRCH IF EQUAL
02700      TDM ER57+12,A2+1,, INSERT HD NO.
02710      BTM ETO,ER57,,     BRCH,LOAD ER T/O
02720      BTM ETO,ER58,,     BRCH,LOAD ER T/O
02730J16   CM  S2+5,19580,,   SEE IF DONE
02740      BE  *+36,,,        BRCH IF EQUAL
02750      AM  S2+5,00020,,   UPDATE
02760      B   J17,,,         NEXT HEAD
02770      TFM S+6,*,,        LOAD RESTART
02780      BC2 J15,,,         SW2 ON LOOP
02790*
02800*         THIS ROUTINE CHECKS THAT THE
02810*         DISK OPERATIONS WORK CORRECTLY
02820*
02830*         READ TK WITH AND W/O WRL CK
02840*
02850J20   BNI *+24,01900,,   ANY DATA CHECK
02860      BTM RS,*,,         RESET IND
02870      TDM A2+2101,0,,    CLEAR GM
02880      TDM J19+11,06,,    INIT INST
02890      TFM S2+8,020,9,,   INIT
02900      TFM S2+5,19400,,   INIT
02910      TD  *+23,J14+11,,  LOAD MULT
02920      MM  C2,00,10,      MULTIPLY
02930      A   S2+4,99,,      ADD CORRECT HD
02940J19   RN  S2,00706,,     READ TRACK
02950      BNI *+84,01900,,   ANY DATA CHECK
02960      TFM ERR+18,J18,,   LOAD RETURN
02970      55  *+36,A2+2101,, CK FOR GM
02980      TFM E1+6,ER5G,,    LOAD ER T/O
02990      B   ERR,,,         BRCH TO ER T/O
03000      TFM E1+6,ER5,,     LOAD ER T/O
03010      B   ERR,,,         BRCH TO ER ROUT
03020      AM  S2+5,00019,,   LAST ADRS
03030      SF  A2+1996,,,     SET FLAG
03040      C   A2+2000,S2+5,, COMP LAST ADRS
03050      BE  J18,,,         BRCH IF EQUAL
03060      55  *+36,A2+2101,, CK FOR GM
03070      BTM ET,ER59,,      BRCH,LOAD ER T/O
03080      B   J18,,,         NEXT OPERATION
03090      BTM ET,ER60,,      BRCH,LOAD ER T/O
03100J18   55  *+24,A2+2101,, CK FOR GM
03110      B   *+48,,,        DONE
03120      TD  A2+2101,GM,,   PUT IN GM
03130      TDM J19+11,04,,    CHANGE INST
03140      B   J19-48,,,      TRY NEXT OP
03150      TFM S+6,*,,        RELOAD RESTART
03160      BC2 J20,,,         SW2 ON LOOP
03170*
03180*         WRITE SECTORS,RD BK CK,READ
03190*         AND PROGRAM COMPARE ON CYL 3
03200*
03210*         SEEK CYLINDER 3 AND INITIALIZE
03220*
03230      BNI *+24,01900,,   ANY DATA CK
03240      BTM RS,*,,         RESET INDICATORS
03250K2    TFM S1+8,020,9,    SECTOR CNT
03260      TDM K4+11,02,,     INIT
03270      TDM K6+11,03,,     INIT
03280      TDM K7+11,02,,     INIT
03290      TDM A1+2001,0,,    CLEAR GM
03300      TDM A2+2001,0,,    CLEAR GM
03310K8    TFM S1+5,00600,,   LOAD SUB INST
03320      TFM S2+5,00600,,   LOAD SUB INST
03330      TFM K3+23,TD+1,,   INIT
03340      TFM S2+8,001,9,    SECTOR CNT
03350      K   S2,00701,,     SEEK CYL 3
03360      BNI *+48,01900,,   ANY DATA CHECK
03370      TFM ERR+18,*-24,,  LOAD RETURN
03380      TFM E1+6,ER8,,     LOAD OPERATION
03390      B   ERR,,,         BRCH TO ER ROUT
03400      RN  S2,00702,,     READ A SECTOR
03410      BNI K3,03600,,     ADRS CK
03420      TFM S2+8,020,9,    CHNG SECT CNT
03430      TD  *+23,J14+11,,  LOAD MULT
03440      MM  C2,00,10,,     MULTIPLY
03450      A   S2+4,99,,      ADD CORRECT HD
03460      RN  S2,00706,,     RD TK
03470      SF  A2+1,,,        SET FLG
03480      MM  A2+3,05,10,    MULT BY 5
03490      TD  ER61+22,97,,   LOAD
03500      TD  ER61+24,98,,     CYL NO.
03510      BTM ET,ER61,,      BRCH,LOAD ER T/O
03520      B   K2,,,          TRY AGAIN
03530*
03540*         WRITE TRACKS ON CYL 3
03550*
03560K3    TFM S2+8,020,9,    INIT SCT CNT
03570      TD  A1+1,99999,,   LOAD HD DIG
03580      AM  *-1,10,,       UPDATE
03590K4    WN  S1,00702,,     WRITE 20 SECT
03600      BNI *+84,01900,,   ANY DATA CHECK
03610      TFM ERR+18,K5,,    LOAD RETURN
03620      55  *+36,A1+2001,, CK FOR GM
03630      TFM E1+6,ER3,,     LOAD ER T/O
03640      B   ERR,,,         GO TO ER ROUT
03650      TFM E1+6,ER3G,,    LOAD ER T/O
03660      B   ERR,,,         GO TO ER ROUT
03670*
03680*         READ BACK CHECK
03690*
03700K6    RN  S1,00703,,     RD BK CK
03710      BNI *+84,01900,,   ANY DATA CK
03720      TFM ERR+18,K5,,    LOAD RETURN
03730      55  *+36,A1+2001,, CK FOR GM
03740      TFM E1+6,ER4,,     LOAD ER T/O
03750      B   ERR,,,         GO TO ER ROUT
03760      TFM E1+6,ER4G,,    LOAD ER T/O
03770      B   ERR,,,         GO TO ER ROUT
03780*
03790*         READ DATA INTO AREA A2
03800*
03810K7    RN  S2,00702,,     RD 20 SECT
03820      BNI *+84,01900,,   ANY DATA CK
03830      TFM ERR+18,K5,,    LOAD RETURN
03840      55  *+36,A2+2001,, CK FOR GM
03850      TFM E1+6,ER6G,,    LOAD ER T/O
03860      B   ERR,,,         BRCH TO ER ROUT
03870      TFM E1+6,ER6GM,,   LOAD ER T/O
03880      B   ERR,,,         GO TO ER ROUT
03890*
03900*         PROGRAM COMPARE OF DATA READ
03910*         WITH DATA THAT WAS WRITTEN
03920*
03930      SF  A1+1,,,        SET FLAG
03940      SF  A2+1,,,        SET FLAG
03950      C   A1+2000,A2+2000,,COMPARE DATA
03960      BE  K5,,,          BRCH IF EQUAL
03970      TFM ERR+18,K5,,    LOAD RETURN
03980      TFM E1+6,ER6,,     LOAD ER T/O
03990      BTM ETO,ER7,,      BRCH,LOAD ER T/O
04000K5    CM  S1+5,00780,,   CK DONE
04010      BE  *+48,,,        BRCH IF DONE
04020      AM  S1+5,20,,      UPDATE
04030      AM  S2+5,20,,      UPDATE
04040      B   K3+12,,,       NEXT HEAD
04050      TFM S3+5,00600,,   INIT SECTOR ADRS
04060      WN  S3,00702,,     RESET CYL. 3
04070      RN  S3,00703,,     READ BACK COMPARE
04080      BNI *+60,1900,,    ANY DATA CHECK
04090      TFM ERR+18,*+48,,  LOAD RETURN
04100      TFM E1+6,ER9,,     LOAD ER T/O
04110      TF  S2+5,S3+5,,    STORE SCTR ADRS
04120      B   ERR,,,         GO TO ER SUBROUT
04130      AM  S3+5,20,,      UPDATE SCTR ADRS
04140      CM  S3+5,00800,,   CHK DONE
04150      BNE *-108,,,       BRCH IF NOT
04160      55  *+24,A1+2001,, CK FOR GM
04170      B   K9,,,          BRCH DONE
04180      TD  A1+2001,GM,,   INSERT GM
04190      TD  A2+2001,GM,,   INSERT GM
04200      TDM K4+11,00,,     CHANGE INST
04210      TDM K6+11,01,,         FOR
04220      TDM K7+11,00,,     WLR CK
04230      B   K8,,,          TRY WITH WLR CK
04240K9    TFM S+6,*,,        LOAD RESTART
04250      BC2 K2,,,          S2 ON LOOP
04260*
04270*         THIS ROUTINE CHECKS THAT
04280*         OVFLO AND WLR CK WILL TURN ON
04290*
04300*         OVERFLOW
04310*
04320F2    BNI *+24,01900,,   ANY DATA CHECK
04330      BTM RS,*,,         RESET IND
04340      TFM S2+8,021,9,    INIT SECT CNT
04350      TFM S2+5,00780,,   INIT SUB-INST
04360      RN  S2,00702,,     RD 21 SECTORS
04370      BNI *+48,03900,,   CK ANY FILE IND
04380      BI  F1,03800,,     CK OVFLO IND
04390      BTM ET,ER62,,      BRCH,LOAD ER T/O
04400      B   F1,,,          BRCH-NEXT ROUT
04410      BI  *+36,03800,,   CK OVFLOW
04420      BTM ET,ER71,,      BRCH,LOAD ER/T/O
04430      B   F1,,,          BRCH-NEXT ROUT
04440      BTM ET,ER72,,      BRCH,LOAD ER T/O
04450*
04460*         WLR CK VIA RD BK COMP ER
04470*
04480F1    BNI *+24,01900,,   ANY DATA CHECK
04490      BTM RS,*,,         RESET IND
04500F12   TFM S1+8,001,9,    INITIALIZE
04510      TFM S1+5,00600,,   INITIALIZE
04520      TDM A1+1,00,,      CLEAR DIGIT
04530      WN  S1,00702,,     WRITE SECTOR
04540      TDM A1+1,01,,      CHANGE DIGIT
04550      RN  S1,00703,,     RD BK CK
04560      BNI *+48,03900,,   CK ANY FILE IND
04570      BI  F3,03700,,     WLR CK IND
04580      BTM ET,ER63,,      BRCH,LOAD ER T/O
04590      B   F3,,,          BRCH-NEXT ROUT
04600      BI  *+36,03700,,   CK WLR IND
04610      BTM ET,ER73,,      BRCH,LOAD ER T/O
04620      B   F3,,,          BRCH-NEXT ROUT
04630      BTM ET,ER74,,      BRCH,LOAD ER T/O
04640*
04650*         WLR CK VIA LATE TERM OF GM
04660*
04670F3    BNI *+24,01900,,   ANY DATA CK
04680      BTM RS,*,,         RESET IND
04690      TFM S2+8,001,9,    INIT SECT
04700      TFM S2+5,00600,,   INIT SUB-INST
04710      TD  A2+102,GM,,    INSERT GM
04720      RN  S2,0700,,      RD A SECTOR
04730      BI  F4,03700,,     WLR CK IND
04740      BTM ET,ER64,,      BRCH,LOAD ER T/O
04750*
04760*         WLR CK VIA EARLY TERM OF GM
04770*
04780F4    TDM A2+102,00,,    CL GM
04790      TD  A2+100,GM,,    LOAD GM
04800      RN  S2,00700,,     RD A SCTR
04810      BI  F14,03700,,    CK WLR IND
04820      BTM ET,ER68,,      BRCH,LOAD ER T/O
04830*
04840*         WLR CK VIA CORRECT TERM OF GM
04850*
04860F14   TDM A2+100,00,,    CL GM
04870      TD  A2+101,GM,,    INSERT GM
04880      RN  S2,00700,,     READ A SECTOR
04890      BNI *+24,03700,,   CK WLR IND
04900      BTM ET,ER67,,      BRCH,LOAD ER T/O
04901*
04902*         CHECK THAT A GROUP MARK (GM)
04903*         IN THE DATA (1 SECTOR) ON THE
04904*         DISK WILL TERMINATE DATA TRANSFER
04905*         FROM DISK TO CORE STORAGE
04906*
04907      TD  A1+85,GM
04908      TFM S1+5,600,,     INITIALIZE
04909      TFM S1+8,001,9
04910      WN  S1,00702,,     WRITE DATA AND GM
04910      TDM A1+85,8
04911      SF  *+19
04911      TFM A2+88,0,,      SET RD AREA TO RM
04912      DC  01,@,*
04914      DC  01,@,*-1
04915      DC  01,@,*-2
04916      DC  01,@,*-3
04917      DC  01,@,*-4
04917      RN  S2,700,,       READ DATA
04917      BNR GME1,A2+88
04918      BNR GME1,A2+87,,   CK FOR RM
04920      BNR GME1,A2+86
04921      55  GME2,A2+85,,   CK FOR GM
04922      B   *+48
04923GME1  BTM ET,ER90
04924      B   *-36
04925GME2  BTM ET,ER91
04930      BI  *+24,3700
04932      BTM ET,ER92
04934      BNI *+24,1900
04936      BTM RS,*
04910*
04920*         CHECK THAT ADDRESS CK IND
04930*         36 WILL TURN ON ANY FILE
04940*
04950      BNI *+24,01900,,   ANY DATA CK
04960      BTM RS,*,,         RESET IND
04970      TFM S2+5,00000,,   INITIALIZE
04980      RN  S2,00702,,     READ SCTR
04990      BNI *+48,03900,,   ANY FILE CK
05000      BI  *+84,03600,,   ADRS CK
05010      BTM ET,ER52,,      BRCH,LOAD ER T/O
05020      B   *+60,,,        NEXT ROUTINE
05030      BI  *+36,03600,,   ADRS CK
05040      BTM ET,ER75,,      BRCH,LOAD ER T/O
05050      B   *+24,,,        NEXT ROUTINE
05060      BTM ET,ER76,,      BRCH,LOAD ER T/O
05070*
05080*         CK THAT ANY FILE TURNS
05090*         ON ANY DATA CHECK 19
05100*         ADRS CK IND MUST TURN ON
05110*         ANY FILE CHECK 39
05120*
05130      BNI *+24,01900,,   ANY DATA CK
05140      BTM RS,*,,         RESET IND
05150      TFM S2+5,00000,,   INITIALIZE
05160      RN  S2,00702,,     READ SCTR
05170      BNI *+72,01900,,   ANY DATA CK
05180      BNI *+36,03900,,   ANY FILE
05190      BI  *+12,03600,,   RESET ADRS CK
05200      B   F15,,,         BRCH=NEXT ROUT
05210      BTM ET,ER77,,      BRCH,LOAD ER T/O
05220      B   F15,,,         BRCH-NEXT ROUT
05230      BNI *+36,03900,,   ANY FILE CK
05240      BTM ET,ER78,,      BRCH,LOAD ER T/O
05250      B   *+24,,,        BYPASS
05260      BTM ET,ER79,,      BRCH,LOAD ER T/O
05270      BI  *+12,03600,,   RESET ADRS CK
05280F15   TFM S+6,*,,        LOAD RESTART
05290      BC2 F2,,,          SW2 ON LOOP
05300*
05310*         PUT FLG ADRS AND AN ADRS NOT
05320*         INCREMENTED BY ONE ON A  TK
05330*
05340F16   BNR F5,TSM,,       CK FOR RM
05350      TFM S2+5,00600,,   INIT SUB-INST
05360      TFM S2+8,020,9,    INIT SECT CNT
05370      RN  S2,00706,,     READ TRACK
05380      SF  A2+1,,,        SET FLAG
05390      TDM A2+215,03,,    ADD ONE TO ADRS
05400      RCTY,,,            RET CARR
05410      WATYT7,,,          TYPE ADRS SW ON
05420      H   ,,,            HALT
05430      WN  S2,00706,,     WRITE TRACK
05440      RCTY,,,            RET CARR
05450      WATYT8,,,          TYPE  OFF
05460      H   ,,,            HALT
05470*
05480*         WRITE ON FLAGGED SECTOR ADDRESS
05490*
05500      BNI *+24,01900,,   ANY DATA CK
05510      BTM RS,*,,         RESET IND
05520      TFM S1+5,00600,,   INITIALIZE
05530      TFM S1+8,001,9,    INITIALIZE
05540      WN  S1,00702,,     WRITE SECTOR
05550      BI  F6,03600,,     ADRS CK IND
05560      BTM ET,ER65,,      BRCH,LOAD ER T/O
05570*
05580*         READ SECT ADRS NOT INCR BY ONE
05590*
05600F6    BNI *+24,01900,,   ANY DATA CK
05610      BTM RS,*,,         RESET IND
05620      TFM S2+5,00600,,   INITIALIZE
05630      TFM S2+8,003,,     INITIALIZE
05640      RN  S2,00702,,     READ SECTORS
05650      BI  F7,03600,,     ADRS CK IND
05660      BTM ET,ER66,,      BRCH,LOAD ER T/O
05670F7    TFM S2+5,00600,,   INIT
05680      TFM S2+8,020,9,    INIT
05690      RN  S2,00706,,     READ TRACK
05700      CF  A2+1,,,        CLEAR FLAG
05710      TDM A2+215,02,,    SUB ONE FROM AD
05720      RCTY,,,            RET CARR
05730      WATYT17,,,         TYPE  SW ON
05740      H   ,,,            HALT
05750      WN  S2,00706,,     WRITE TRACK
05760      RCTY,,,            RET CARR
05770      WATYT18,,,         TYPE  OFF
05780      H   ,,,            HALT
05790      TFM S+6,*,,        LOAD RESTART
05800      BC2 F16,,,         SW 2 ON LOOP
05810*
05820*         TEST COMPLETE ROUTINES
05830*
05840F5    BC4 J0,,,          SW 4 ON LOOP BK
05850      BNC1*+48,,,        SW 1 OFF BYPASS
05860      BNR *+36,ERM,,     CK FOR RM IN MAP
05870      RCTY,,,            RETURN CARRIAGE
05880      WATYER30,,,        TYPE ER OCCURRED
05890      RCTY,,,            RETURN CARRIAGE
05900      WATYT10,,,         TEST COMPLETED
05910      RCTY,,,            RETURNCARRIAGE
05920      TFM S+6,S+12,,     LOAD RESTART
05930      H   ,,,            HALT
05940      B   S,,,           RESTART TEST
06010*
06020*         THIS ROUTINE READS AND
06030*         CHECKS THE SECTOR ADDRESSES
06040*         ON A CYLINDER OF THE DISK PACS
06050*
06060*         BRANCH TO MAINLINE PROGRAM
06070*         TO REQUEST MOD.NO. AND INSERT
06080*         DRIVE CODE IN SUBINST.
06090*
06100      TDM NOPAD+1,9,,    NOP TO B
06110      B   SAD1,,,
06120*
06130*         REQUEST CYLINDER NUMBER
06140*         AND ADDRESS RANGE
06150*
06160SAD   RCTY
06230      TDM NOPAD+1,1,,    INSURE NOP
06170      WATYSAD2,,,        REQUEST DATA
06180      RNTYCNAR,,,        ACCEPT
06190      BC3 *-12,,,        OOPS SW
06200*         COMPUTE SECTOR ADDRESS
07010SAD6  TFM S2+5,0,
07020      A   S2+3,CNAR+1,,  DOUBLE
07030      A   S2+3,CNAR+1,,    CYL.NO.
07040      TD  SAD3-2,CNAR+2,,
07050      SF  SAD3-2,
07060      AM  S2+2,00,10,    ADD (20000) X SCTR RNG
07070SAD3  A   S2+2,SAD3-1,,
07075      TF  S3+5,S2+5,,    STORE BEGIN ADRS
07076      AM  S3+5,200,9,    ADD FOR LAST ADRS
07077      TDM 19994,0,11,
01080*
01090*         SEEK CYLINDER
01100*
01110      K   S2,00701,,     SEEK CYL.
01120*
01130*         READ TRACK
01135*
07140SAD5  RN  S2,00706,,     READ FULL TRACK
07150      BNI *+24,1900,,    ANY DATA CHK
07160      BTM RS,*,,         GO TURN OFF IND
07170*
07180*         INITIALIZE
07190*
08010      TFM IS1+11,A2+1,,  IN
08020      TFM IS2+11,A2+2,,    IT
08030      TFM IS3+11,A2+3,,      IA
08040      TFM IS4+11,A2+4,,        LI
08050      TFM IS5+11,A2+5,,          ZE
08080*         INSERT SECTOR ADDRES
08090IS1   TD  19995,99999,,  INSERT
08100IS2   TD  19996,99999,,   SECTOR
08110IS3   TD  19997,99999,,    ADDRESS
08120IS4   TD  19998,99999,,
08130IS5   TD  19999,99999,,
08145*         COMPARE SECTOR ADDRESSES
12345      BI  SAER,01600,,   EVEN CHK
12345      BI  SAER,01700,,   ODD CHK
00123      TFM *+23,19995,,   INIT
00123      BNR *+24,99999,,   CHK FOR RM,GM
00123      B   SAER,,,        ER T/O
00123      AM  *-13,01,10,
00123      CM  *-25,20000,,   CHK DONE
00123      BNE *-48,,,
08150      C   19999,S2+5
08160      BE  SAD4
08170SAER  TR  00100,TAB,,    REPLACE MATH TAB
08180      BNI *+24,1900,,    ANY DATA CHK
08190      BTM RS,*,,         TURN OFF IND
08200      RCTY
08210      DNTY19995,,,       DUMP ADDRESS
08220      WATYS/B,,,         TYPE S/B
08230      TF  SBTOB,S2+5,,
08240      CF  SBTOB-4
08250      WNTYSBTOB-4,,,     TYPE S/B ADRS
09010*         UPDATE SECTOR ADDRESS TRANSFER
09020SAD4  AM  IS1+11,105,,
09030      AM  IS2+11,105,,
09040      AM  IS3+11,105,,
09050      AM  IS4+11,105,,
09060      AM  IS5+11,105,,
09070      AM  S2+5,01,10,
09090      CM  IS1+11,A2+2101,,CH TK DONE
09100      BNE IS1,,
09110      C   S2+5,S3+5,,    CHK CYL.DONE
09120      BNE SAD5,,
09130      BC2 SAD6,,,        SW 2 ON LOOP
09150      H   ,,,            HALT
09160      B   S+12,,,        RUN TEST
           DORG*-4
10010*
10020*         DATA,CONSTANTS,AND TYPEOUTS
10030*
10040SAD2  DAC 25,KEY IN 2 DIG.CYL.NO.AND 1
10050      DAC 16, DIG.ADRS RNG  @
10060      DC  01,0
10070CNAR  DSC 05,0
10080S/B   DAC 08,  S/B  @
10090SBTOB DC  05,0
10100      DC  01,@
05950*
05960*         ERROR SUBROUTINE
05970*
05980ERR   BI  *+24,01900,,   ANY DATA CHECK
05990      B   99999,,,       RETURN TO PROG
06000      BNI J30,03900,,    ANY FILE CHECK
06010      BNI BYSL,03600,,   ADDRESS CHECK
06020      CM  E1+6,ER8,,     WAS OP A SEEK
06030      BE  *+60,,,        BRCH - YES
06040      CM  E1+6,ER5,,     WAS OP A RD TK
06050      BE  *+36,,,        BRCH - YES
06060      CM  E1+6,ER5G,,    WAS OP A RD TK
06070      BNE *+36,,,        BRCH - NO
06080      TFM E1+1,41,10,    CHANG WATY TO NOP
06090      BTM ETO,ER19,,     BRCH LOAD ER T/O
06100      BTM ETO,ER10,,     BRCH LOAD ER T/O
06110BYSL  BNI *+24,03700,,   RECORD LENGTH CK
06120      BTM ETO,ER11,,     BRCH,LOAD ER T/O
06130      BNI *+24,03800,,   OVERFLOW CHECK
06140      BTM ETO,ER12,,     BRCH,LOAD ER T/O
06150      BTM ETO,ER13,,     BRCH,LOAD ER T/O
06160J30   BNI *+24,00600,,   READ CHECK
06170      BTM ETO,ER14,,     BRCH,LOAD ER T/O
06180      BNI *+24,00700,,   WRITE CHECK
06190      BTM ETO,ER15,,     BRCH,LOAD ER T/O
06200      BNI *+24,01600,,   MBR-E CHECK
06210      BTM ETO,ER16,,     BRCH,LOAD ER T/O
06220      BNI *+24,01700,,   MBR-O CHECK
06230      BTM ETO,ER17,,     BRCH,LOAD ER T/O
06240      BI  *+12,0800,,    MAR CHECK
06250      BI  *+12,02100,,   TAS CHECK
06260      BI  *+12,02200,,   F R CHECK
06270      BI  *+12,02300,,   A O CHECK
06280      B   ERR,,,         LOOP BACK
06290*
06300*         ERROR TYPE OUT ROUTINE
06310*         FOR THE ABOVE ERROR SUBROUTINE
06320*
06330ETO   BC1 E11,,,         SW 1 ON BYPASS
06340      MM  S2+5,05,10,    MULTIPLY
06350      TD  ER20+10,95,,   CYL. NUMBER
06360      TD  ER20+12,96,,   CYL. NUMBER
06370      TD  ER20+24,97,,   HD  NUMBER
06380      TF  E1+18,ETO-1,,  LOAD ER T/O
06390      RCTY,,,            RETURN CARRIAGE
06400E1    WATY99999,,,       TYPE ERROR
06410      WATY99999,,,       TYPE ERROR
06420      WATYER20,,,        TYPE ERROR
06430E11   TD  ERM,RM,,       PUT RM IN MAP
06440      TR  00100,TAB,,    REPLACE MATH TAB
06450      TFM E1+1,39,10,    CHNG NOP TO WATY
06460      BNC3*+24,,,        SW 3 ON HALT
06470      H   ,,,            HALT
06480      B   ERR,,,         SEE IF MORE ERS
06490*
06500*         THIS ROUTINE RESETS THE
06510*         INDICATORS THAT TURN
06520*         ON ANY DATA CHECK
06530*
06540RS    BI  *+12,03600,,   ADRS CH
06570      BI  *+12,03700,,   WLR CK
06580      BI  *+12,03800,,   OVFLO CK
06590      BI  *+12,00600,,   READ CK
06600      BI  *+12,00700,,   WRITE CK
06610      BI  *+12,01600,,   MBR-E CK
06620      BI  *+12,01700,,   MBR-O CK
06630      BI  *+12,00800,,   MAR CK
06640      BI  *+12,02100,,   TAS CK
06650      BI  *+12,02200,,   F R CK
06660      BI  *+12,02300,,   A O CK
06670      BB  ,,,            BRCH-BACK
06680*
06690*         ERROR TYPE OUT ROUTINE FOR
06700*         ERRORS DURING MAIN PROGRAM
06710*
06720ET    BC1 *+48,,,        SW1 ON BYPASS
06730      TF  *+30,*-13,,    LOAD WATY
06740      RCTY,,,            RET CARR
06750      WATY99999,,,       TYPE ERROR
06760      TD  ERM,RM,,       PUT RM IN MAP
06770      TR  00100,TAB,,    REPLACE MATH TAB
06780      BNC3*+24,,,        SW3 ON HALT
06790      H   ,,,            HALT
06800      BB  ,,,            BRCH-BACK
06810      DORG*-9
06820*
06830*         DATA,CONSTANTS,WORKING AREAS,
06840*         TYPEOUTS,AND ERROR MESSAGES
06850*
06860T1    DAC 14,DT 0022 - 1311
06870      DAC 17, FAULT ISOLATION@
12345WRCD1 DAC 35,WARNING-REMOVE CUSTOMER DISK PACKS@
12345WRCD2 DAC 31,FROM ALL MODULES,TURN SW 3 ON.@
06880T2    DAC 16,SWITCH SETTINGS@
06890T3    DAC 21,PROGRAM - AS DESIRED@
06900T4    DAC 16,DATA -- PROGRAM@
06910T5    DAC 25,KEY IN 1 DIGIT MODULE NO.
06920      DAC 18, DISK PACK IS ON @
06930T6    DAC 27,CK FLG ADRS,TYPE YES OR NO@
06940T7    DAC 27,TURN WR ADRS SW ON AND COMP
06950      DAC 19, DSBLE SW ON (OUT)@
06960T8    DAC 23,NOW TURN THEM OFF (IN)@
06970T10   DAC 16,TEST COMPLETED @
06980T17   DAC 09,ON AGAIN@
06990T18   DAC 10,OFF AGAIN@
07000T30   DAC 22,SW 3 ON FOR CORRECTING
07010      DAC 08, KEY IN@
07020*
07030*         ERROR MESSAGES
07040*
07050ER3   DAC 18,WRITE 20 SCT WLR @
07060ER4   DAC 18,READ BK COMP WLR @
07070ER5   DAC 17,READ TK W/O WLR @
07080ER5G  DAC 16,RD TK WITH WLR @
07090ER6   DAC 14,PROG COMPARE @
07100ER7   DAC 15,DATA NOT EQUAL@
07110ER8   DAC 06,SEEK @
07120ER9   DAC 18,CYL.3 ZERO RESET @
07130ER10  DAC 14, ADS CK (36) @
07140ER11  DAC 14, WRL CK (37) @
07150ER12  DAC 15, OVFO CK (38) @
07160ER13  DAC 19, FILE NO IND (39) @
07170ER14  DAC 13, RD CK (06) @
07180ER15  DAC 13, WR CK (07) @
07190ER16  DAC 13, MBR-E (16) @
07200ER17  DAC 13, MBR-O (17) @
07210ER19  DAC 14,SELECT LOCK  @
07220ER20  DAC 14, CYL 99  HD 9@
07230ER30  DAC 23,ERROR OCCURRED BUT SW 1
07240      DAC 21, WAS ON THUS NO ETO.@
07250ER3G  DAC 19,WR 20 SCT W/O WLR @
07260ER4G  DAC 18,RD BK CK W/O WLR @
07270ER6G  DAC 15,RD 20 SCT,WLR @
07280ER6GM DAC 19,RD 20 SCT,W/O WLR @
07290ER5S  DAC 21,READ SECTOR W/O WLR @
07300ER51  DAC 21,RD TK,NO ADRS,ADRS CK
07310      DAC 09, IND OFF@
07320ER52  DAC 21,ADRS CK IND (36) WONT
07330      DAC 09, TURN ON@
07340ER54  DAC 28,HDS AT CYL 99,SHD BE CYL 97@
07350ER55  DAC 25,RD,MBR-E/O,ADS CK,OR WRNG
07360      DAC 23, HD RD TK,ON ALL HEADS@
07370ER56  DAC 28,HDS AT CYL 99 SHD BE CYL 99@
07380ER57  DAC 09,RD TK 9 @
07390ER58  DAC 26,CORRECT TK,DATA NOT COMP @
07400ER59  DAC 22,RD TK WLR,ADRS NOT EQ@
07410ER60  DAC 26,RD TK W/O WLR,ADRS NOT EQ@
07420ER61  DAC 28,HDS AT CYL 99 SHD BE CYL 03@
07430ER62  DAC 27,OVFLO CK (38) WONT TURN ON@
07440ER63  DAC 24,WLR CK (37) WONT TURN ON
07450      DAC 14, VIA RD BK ER@
07460ER64  DAC 24,WLR CK (37) WONT TURN ON
07470      DAC 18, VIA GM LATE TERM@
07480ER65  DAC 26,ADRS CK WONT TURN ON VIA A
07490      DAC 16, WR ON FLG ADRS@
07500ER66  DAC 24,ADRS CK IND WONT TURN ON
07510      DAC 26, VIA ADRS NOT INCR BY ONE@
07520ER67  DAC 27,WLR CK ON,GM CORRECT PLACE,
07530      DAC 13, RD SCT WLR @
07540ER68  DAC 27,WLR CK IND WONT TURN ON VIA
07550      DAC 15, GM EARLY TERM@
07560ER70  DAC 26,SELECTING WRNG STORAGE DR,
07570      DAC 28,DISK PACK SCTR ADRS RANGE 9@
07580ER71  DAC 29,ANY FILE 39 OFF,OVFLO 38 OFF@
07590ER72  DAC 28,ANY FILE 39 OFF,OVFLO 38 ON@
07600ER73  DAC 27,ANY FILE 39 OFF,WLR 37 OFF@
07610ER74  DAC 26,ANY FILE 39 OFF,WLR 37 ON@
07620ER75  DAC 28,ANY FILE 39 OFF,ADRS 36 OFF@
07630ER76  DAC 27,ANY FILE 39 OFF,ADRS 36 ON@
07640ER77  DAC 25,ANY DATA ON,ANY FILE OFF@
07650ER78  DAC 25,ANY DATA OFF,ANY FILE ON@
07660ER79  DAC 26,ANY DATA OFF,ANY FILE OFF@
07670ER80  DAC 20,,ADRS CK IND 36 OFF@
06123ER90  DAC 35,GM IN DISK DATA FAILED TO TERMINATE
06123      DAC 36, XFER FROM DISK TO CORE,RN WITH WLR@
06234ER91  DAC 35,GM IN DISK DATA FAILED TO BE XFERED
06234      DAC 31, TO CORE FROM DISK,RN WITH WLR@
06345ER92  DAC 33,GM IN DISK DATA,EARLY TERMINATION
06345      DAC 33, FAILED TO TURN ON WLR CK,IND 37@
07680*
07690*         DATA AND CONSTANTS
07700*
07710N     DC  2,00,,         MODULE NUMBER
07720      DC  2,00,,         BUFFER
07730M     DC  2,00,,         DRIVE CODE
07740M1    DC  5,00000,,      ERROR MAP
07750RM    DC  2,0@,,         RECORD MARK
07760GM    DC  1,@
07770ERM   DC  2,00,,         ERROR MAP
07780C5    DC  2,05,,         CONSTANT
07790C2    DC  2,02,,         CONSTANT
07800C1    DC  5,02200,,      CONSTANT
07810C3    DC  5,00000,,      CONSTANT
07820TSM   DC  2,00,,         MAP
07830ANS   DAC 6,000000,,     ANSWER
07840TD    DSC 20,00000000001111111111,,T
07850      DSC 20,22222222223333333333,, E
07860      DSC 20,44444444445555555555,,  S
07870      DSC 20,66666666667777777777,,   T
07880      DSC 20,88888888889999999999,,DATA
07890TAB   DSC 2,0
07900      DSB 100,3,,        MATH TABLES
07910*
07920*         SUB-INSTRUCTIONS AND
07930*         READ-IN AREAS
07940*
07950      DAC 1,0
07960S1    DSC 9,000000000,,  SUB-INST 1
07970      DSA A1+1
07980S2    DSC 9,000000000,,  SUB-INST 2
07990      DSA A2+1
08000S3    DSC 09,000000020,, SUB-INST 3
08010      DSA A3
08070A3    DS  ,T1-1
     MON   DS  ,18117
     MONIT DS  ,18000
12345      DAC 04,DT22
12345      DSA LAST
     DIPAL BNR DIPAL6      ,MON
           B   *+48
           NOP J0
           TDM *-11,9
           B   S
           TF  F5+18       ,DIPAL1+6
           B   MONIT
     DIPAL6H   
           B   S
           DORG*-4
     DIPAL1B   DIPAL2,,0
           DORG*-4
     DIPAL2BNR *+24        ,MON
           B   MONIT
           BNC1F5+60
           B   F5+24
08020      DAC 1,0
08030A1    DC  2,00,,         AREA A1
08040      DSB 105,20,,       2000 CHARACTERS
08050A2    DC  2,00,,         AREA A2
08060      DSB 105,20,,       2100 CHARACTERS
12345LAST  DC  01,0,,
07970      DENDDIPAL
