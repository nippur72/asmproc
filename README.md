ASMPROC - quick reference manual 
================================

Asmproc is (C) 2006-2007 Antonino Porcino (Nippur72)
and is freely distributable.

WHAT IS
=======

Asmproc is a WIN32 tool that extends the DASM assembler 
syntax adding some new useful features. It works as
a pre-assembler: the source file is processed and another 
file is created. The created file can be then fed into
DASM for final assembly step. 

USAGE
=====

   The usage is simply: ASMPROC <inputfile> <destfile>

   - <inputfile> is the source file written according 
   to the asmproc syntax

   - <destfile> is the destination file that is going 
   to be compiled with DASM.

   both <inputfile> and <destfile> are plain text files.

   If Asmproc fails to compile due to an error in the source file
   the %ERRORLEVEL% shell variable is set to value -1 so that 
   the compiling script can be stopped. %ERRORLEVEL% is 0 if
   Asmproc has worked correctly.

COMMENTS
========

    C-style comments /* */, not nested, are permitted. 

STATEMENT SEPARATION
====================
    
    Statements can be separed onto a single line by ":". Space character
    is neede before and after the semicolon (" : "). Placing a semicolon
    in a "if-then" statement on a single line may cause confusion as 
    the statement after the semicolon is not considered part of the "if-then"
    branch, but a statement of its own. 

IF-THEN 
=======

    if <condition> then
      <blockthen>
    else
      <blockelse>
    end if  /* or endif */

    if <condition> then
       <blockthen>
    end if /* or endif */

    if <condition> then goto <label>
    if <condition> then exit repeat
    if <condition> then exit do
    if <condition> then exit while
    if <condition> then exit for
    if <condition> then exit sub

REPEAT-UNTIL
============

   repeat 
      <block>
      [exit repeat]
   until <condition>

DO-LOOP
=======

   do
      <block>
      [exit do]
   loop while <condition>   /* or: loop if <condition> */

   do
      <block>
      [exit do]
   loop until <condition>  

WHILE-WEND
==========

   while <condition>
      <block>
      [exit while]
   wend

FOR-NEXT
========

    for <register>=<start> to <end> [step <step>]
       <block>
       [exit for]
    next

    Register can be A,X,Y or memory location.

    While <Start> can be a costant or memory location,
    <End> and <Step> need to be fixed costants; in 
    particular <Step> can be only from #-4 to #4 (because
    it's translated with incs and decs).

    When using a memory location the value
    in A register is lost because it's used in
    the loop initialization and compare. 
    

EXPRESSING CONDITIONS
=====================

    All <conditions> expressed in control and looping statements 
    can be one of these:

    Z=1, ZERO, EQUAL  
    Z=0, NOT ZERO, NOT EQUAL
    C=1, CARRY
    C=0, NOT CARRY
    N=1, NEGATIVE
    N=0, NOT NEGATIVE
    V=1, OVERFLOW
    V=0, NOT OVERFLOW

    A <operator> <value>
    X <operator> <value>
    Y <operator> <value>
    <memory> <operator> <value>
    <memory> IS [NOT] ZERO
    <memory> IS [NOT] NEGATIVE

    <operator> can be: <, >, <=, >=, <>, !=, ==, =,

    <memory> specifies a memory location and the compare
    operation is done via the accumulator unless specified
    with one of predicates "(using x)" or "(using y)". 
    The operator "IS" syntax allows to avoid the 
    CMP istruction. 

    Compare operation is always unsigned unless the 
    predicate "(signed)" is specified.     
 

SUBROUTINE DEFINITION
=====================
    
    sub <Name>[()]
        <block>
    end sub         /* end sub does an rts */

BITMAP CHARACTER COSTANTS
=========================
    
    bitmap <code>

    For single-color <code> is 8-character 
       "." or "-" or "0" equals to bit 0
       Any other character equals to bit 1

    For multicolor <code> is 4-character
       "." or "-" or "0" equals to bits 00  background color
       "A" or "1"        equals to bits 01  border color
       "B" or "2"        equals to bits 10  foreground color
       "F" or "3"        equals to bits 11  auxiliary color (36878's high nibble)

FLOATING POINT COSTANTS
=======================

    [label] float value[,value...]

    Defines a floating point costant in CBM format (5 bytes).

MACRO DEFINITION
================

    macro <macroname> <parameter>,<parameter>,...
        <body>
    end macro

    Macros are polymorhpic, that is, more macros with the same name 
    but with different parameter specification can be defined.

    <parameter> can be:

        const - meaning a costant value (6502's immediate mode '#')
        mem - meaning a memory location (6502's absolute or zero page mode)
        indirect - pointer deference (6502's indirect mode, enclosed in ())
        "quoted value" - any literal value.

INLINE BASIC
============

    basic start [compact]
       <basic v2.0 text here>    
    basic end   

    Allows to enter basic programs directly from the assembler source.
    Enclosing an assembler symbol (e.g. a label) in "{}" causes the corresponding 
    4-digit decimal number to be entered in the basic text as tokens. It is thus allowed 
    to basic to call assembler subroutines (example: 10 sys{main}). The machine language 
    code is put after the basic code and it's hidden to LIST command. 

    Quoted string text can contain "{codes}" for special characters, in
    the format "{shift key}" or "{cbm k}" (substitute "k" with actual key).

    The following special codes are also supported:
     
    {pi} {left arrow} {run stop} {return} 

    {up} {down} {left} {right} {clr} {home} {inst} {del} {rvs on} {rvs off}

    {blk} {wht} {cyn} {red} {pur} {grn} {blu} {yel}  

    {rev a} {rev b} {rev d}  {rev f} {rev g} {rev h} {rev i}
    {rev j} {rev k} {rev l}  {rev n} {rev o} {rev p} {rev u} 
    {rev v} {rev w}  {rev x} {rev y} {rev z} {rev [} 
 
    {rev shift *} {rev shift a} {rev shift b} {rev shift c} {rev shift d}
    {rev shift m} {rev shift n} {rev shift o} {rev shift u} {rev shift v}
    {rev shift w} {rev shift x} {rev shift y} {rev shift z} {rev shift +}

    {f1} to {f8}

    {160} {224}


REDEFINED DASM KEYWORDS
=======================

    Since IF,ELSE,ENDIF have a new meaning in AsmProc, the corresponding DASM 
    keywords are accessible with the "#" prefix:

    #if      translates into  IF
    #else    translates into  ELSE
    #endif   translates into  ENDIF

    The following two keywords are also available for convenience:

    #ifdef   translates into  IFCONST
    #ifndef  translates into  IFNCONST
    
    also, #IFDEF/#IFNDEF have a single-line syntax:
    
    #ifdef  <symbol> then <statement>
    #ifndef <symbol> then <statement>
    


TO DO
=====

- loop forever
- : and ; in quotes
- dim
- // comment
- float
- float expr compiler
- line numbers
- else if
- then statement con endif automatico
- (...) in sub
- inline sub / call sub
- inline sub / call
- controllare operatori signed <,>,
- condizioni a<>#0 ==> if zero

