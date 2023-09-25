34000480070136000480070260000365100060024025100911963611300102 1620-2 MON-I BOOT
||JOB 5                         99 BOTTLES OF BEER DEMO
||SPSX5
**99 BOTTLES OF BEER
*LIST PRINTER
*PRINT SYMBOL TABLE
     * DOWNLOADED 2023-07-02 FROM
     *   http //99-bottles-of-beer.net/language-ibm-1620-sps-916.html
     *333333
     *  BOTTLES OF BEER PROGRAM FOR THE IBM 1620 MODEL I
     *
     *  HAMMERS THE WHOLE THING OUT ON THE CONSOLE TYPEWRITER.
     *
     *  A MISERABLE WASTE OF TIME ON 10/2005 BY
     *         CHUCK GUZIS   CHUCK @ SYDEX.COM
     *
     *  THIS CODE IS SHOWN IN ASSEMBLY-LISTING FORMAT WITH SPS MNEMONICS.
     *  I HAVE SPREAD THE SPS FIELDS OUT A BIT FOR READABILITY.
     *
     *  THERE ARE SOME SPECIAL NUMERIC CHARACTERS-
     *          ] = FLAGGED 0
     *          J-R = FLAGGED 1-9
     *          | = RECORD MARK
     *          ! = FLAGGED RECORD MARK (NOT USED HERE)
     *
     *  IF YOU-RE GOING TO RUN THIS ON THE CADET, YOU NEED TO HAVE AT LEAST
     *  THE ADDITION TABLES LOADED.  INDIRECT ADDRESSING IS USEFUL, BUT NOT
     *  ABSOLUTELY NECESSARY (SEE NOTE BELOW).
     *
     *  EXECUTION STARTS AT 00402.
     *
     START RCTY                ,,, RETURN CARRIAGE
           BTM DBEERS,*+12     ,,, SHOW COUNT
           WATYMSG2            ,,, OF BEER ON...
           RCTY                ,,, RETURN CARR.
           BTM DBEERS,*+12     ,,, SHOW COUNT
           WATYMSG4            ,,, OF BEER.
           RCTY                ,,, ZZZZIP...
           WATYMSG6            ,,, TAKE ONE DOWN
           RCTY                ,,, ZZZIP...
           SM  BEERS,1         ,,, A DEAD SOLDIER
           BZ  EMPTY           ,,, IF ALL GONE
           BTM DBEERS,*+12     ,,, SHOW COUNT
           WATYMSG2            ,,, ON THE WALL
           RCTY                ,,, ZZZZZIP...
           B7  START           ,,, DO IT AGAIN
     EMPTY WATYMSG8            ,,, NO MORE BEER
           RCTY                ,,, ZZZZIP...
           H                   ,,, STOP
           B7  EMPTY           ,,, IN CASE RUN PUSHED
     *
     *  SUBROUTINE TO DISPLAY BOTTLE COUNT AND EITHER *BOTTLE* OR *BOTTLES*
     *
     *  THIS ASSUMES THAT THE INDIRECT ADDRESSING FEATURE IS PRESENT, BUT
     *  IF NOT, SIMPLY USE A BB (42) INSTRUCTION IN PLACE OF THE INDIRECT
     *  BRANCHES.
     *
     DBRET DC  5,0             ,,, RETURN ADD
     DBEERSCM  BEERS,10        ,,, DISPLAY BOTTLES
           BNL DBEER2          ,,, 10 OR MORE
           WNTYBEERS           ,,, 1 DIGIT
           CM  BEERS,1         ,,, JUST 1 Q
           BNE DBEER4          ,,, NO, *BOTTLES*
           WATYBTL             ,,, SAY *BOTTLE*
           B7  -DBRET          ,,, EXIT
     DBEER2WNTYBEERS-1         ,,, 2 DIGITS
     DBEER4WATYBTLS            ,,, SAY BOTTLES
           B7  -DBRET          ,,, EXIT
     BEERS DC  5,99            ,,, BOTTLE COUNT
           DC  1,@
     BTLS  DAC 8, BOTTLES
           DAC 1,@
     BTL   DAC 8, BOTTLE@
     MSG2  DAC 8, OF BEER
           DAC 7, ON THE
           DAC 7, WALL.@
     MSG4  DAC 8, OF BEER
           DAC 2,.@
     MSG6  DAC 8,TAKE ONE
           DAC 6, DOWN,
           DAC 8, PASS IT
           DAC 9, AROUND -
           DAC 1,@
     MSG8  DAC 7,NO MORE
           DAC 7, BEER.@
           DENDSTART
||||
