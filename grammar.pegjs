{
  function twoargs(left, right) {
    if(right.length === 0) return left;
    const r = right[0];
    const newel = { type: r.type, left, right: r.right };    
    return twoargs( newel, right.slice(1));    
  }
  
  function program(items) { return { type: "program", items }; }
  function include(filename) { return { type: "include", filename }; }
  function pragma(keyword, expr,items) { return { type: "pragma", keyword, expr, items }; }
  function constnode(id,expr) { return { type: "const", id, expr }; }
  function assignment(id,expr) { return { type: "assignment", id, expr }; }
  function ifnode(cond, ramoThen, ramoElse) { return { type: "if", cond, ramoThen, ramoElse } } 
  function ifsingle(cond, ramoThen) { return { type: "ifsingle", cond, ramoThen } } 
  function donode(body, dotype, cond) { return { type: "do", body, dotype, cond } }
  function repeat(body, repeattype, cond) { return { type: "repeat", body, repeattype, cond } }
  function whilenode(body, cond) { return { type: "while", body, cond } }
  function fornode(start,valstart,end,step,body) { return { type: "for", start, valstart, end, step, body }; }
  function sub(id, body) { return { type: "sub", id, body }; }
  function exitnode(exittype) { return { type: "exit", exittype }; }
  function macro(id, body) { return { type: "macro", id, body }; }
  function bitmap(value) { return { type: "bitmap", value }; }
  function sprite(value) { return { type: "sprite", value }; }
  function float(values) { return { type: "float", values }; }
  function constnode(id, value) { return { type: "const", value }; }
  function flagcond(rcond) { return { type: "flagcond", rcond }; }
  function registercond(register, rcond) { return { type: "registercond", register, rcond }; }
  function eqcond(leftvalue, op, value) { return { type: "eqcond", leftvalue, op, value  }; }
  function immediateExpression(expr) { return { type: "immediate", expr }; }
  function instructions(list) { return { type: "instructions", list } }
  function instruction(opcode, args) { return { type: "istruction", opcode, args }; }
  function opcode(opcode) { return { type: "opcode", opcode }; }
  function argumentsnode(args) { return { type: "arguments", args }; }
  function label(name) { return { type: "label", name}; }
  function identifier(name) { return { type: "identifier", name}; }
  function byte(bytetype, list) { return { type: "byte", bytetype, list }; }
}

// =====================================================================================

program 
  = g:(global_item)*               { return program(g.filter(e=>e!==null)) }

global_item 
  = basic
  / include
  / macro
  / sub
  / item
  
items = item*  

item = emptyspace
  / pragmaif  
  / emptyline
  / label
  / istructions eol
  / if
  / doloop
  / repeat
  / while
  / for
  / bitmap
  / sprite
  / float
  / const
  / exit
  / byte
  / assignment

DO = "do"i
LOOP = "loop"i
REPEAT = "repeat"i
UNTIL = "until"i
WHILE = "while"i
WEND = "wend"i / ("end"i __ "while"i)
FOR = "for"i
TO = "to"i
STEP = "step"i
NEXT = "next"i
SUB = "sub"i
END_SUB = "end"i __ "sub"i
MACRO = "macro"i
END_MACRO = "end"i __ "macro"i
IF = "if"i
THEN = "then"i
ELSE = "else"i
END_IF = "end"i _ "if"i

BASIC_START = "basic"i __ "start"i
BASIC_END = ("basic"i __ "end"i / "end"i __ "basic"i)

INCLUDE = "include"i

keywords = DO / LOOP /
           REPEAT / UNTIL /
           WHILE / WEND /
           FOR / NEXT /
           END_SUB / 
           END_MACRO / 
           IF / ELSE /END_IF

// ===============================================

include = INCLUDE __ filename:Expression eol     { return include(filename); }

pragmaif = keyword:('#ifdef'i/'#if'i/'#ifndef'i) __ expr:Expression __ THEN __ items:istructions    { return pragma(keyword,expr,items) }
         / keyword:('#ifdef'i/'#if'i/'#ifndef'i) __ expr:Expression eol _ items:items _ '#endif'i eol  { return pragma(keyword,expr,items) }
         
// ===============================================

assignment = id:id _ "=" _ expr:Expression eol        { return assignment(id, expr) }

if 
  = ifsingle
  / ifmultiple

ifsingle 
   = IF __ cond:Cond __ THEN __ ramoThen:istructions eolnocolon
     { return ifsingle(cond, ramoThen) }
     
ifmultiple 
   =  IF __ cond:Cond __ THEN eol _ ramoThen:items _ ramoElse:else _ END_IF eol
     { return ifnode(cond, ramoThen, ramoElse) }
     
else
  = (ELSE eol _ ramoElse:items { return ramoElse } )? 

doloop
  = DO eol _ body:items _ LOOP __ dotype:(WHILE / UNTIL / IF) __ cond:Cond eol
  { return donode(body, dotype, cond) }

repeat
  = REPEAT eol _ body:items _ repeattype:(WHILE / UNTIL) __ cond:Cond eol
  { return repeat(body, repeattype, cond) }

while
  = WHILE __ cond:Cond eol _ body:items _ WEND  eol
  { return whilenode(body, cond) }

for
  = FOR __ start:Expression _ "=" valstart:opExpression __ TO __ end:opExpression step:(__ step:STEP stepExpr:opExpression { return step })? eol 
    _ body:items 
    _ NEXT eol
  { return fornode(start,valstart,end,step,body) }
  
sub
  = SUB __ id:id _ "()" eol _ body:items _ END_SUB eol 
  { return sub(id, body) }

exit = "exit"i __ exittype:(SUB / DO / WHILE / FOR / REPEAT) eol
  { return exitnode(exittype) }

macro
  = MACRO __ id:id eol __ body:items _ END_MACRO 
  { return macro(id, body) }

bitmapvalue = ("." / "-" / [0-9a-zA-Z])+

bitmap = "bitmap"i __ value:bitmapvalue eol   { return bitmap(value) }

sprite = "sprite"i __ value:bitmapvalue eol   { return sprite(value) }

float = "float"i __ values:Expressions eol    { return float(values) }

const = "const"i __ id:id _ "=" _ expr:Expression eol       { return constnode(id,expr); }

// ===============================================

Cond = using:(
		"(using a)"i __ { return "a" } / 
        "(using x)"i __ { return "x" } / 
        "(using y)"i __ { return "y" })? 
       signed:(
         "(signed)"i __   { return "signed" } / 
         "(unsigned)"i __ { return "unsigned" } )?        
       cond:(
          flagcond / 
          !flagcond rcond:registercond { return rcond } / 
          !flagcond eqcond:eqcond { return eqcond }
       ) 
       { return { type: "cond", using, signed, cond } }

flagcond =  "Z"i _ "=" _ "1"   { return flagcond("z=1") } / 
            "ZERO"i            { return flagcond("z=1") } / 
            "EQUAL"i           { return flagcond("z=1") } /
            "Z"i _ "=" _ "0"   { return flagcond("z=0") } /
            "NOT"i __ "ZERO"i  { return flagcond("z=0") } /
            "NOT"i __ "EQUAL"i { return flagcond("z=0") } /
            "C"i _ "=" _ "1"   { return flagcond("c=1") } /
            "CARRY"i           { return flagcond("c=1") } /
            "C"i _ "=" _ "0"   { return flagcond("c=0") } /
            "NOT"i __ "CARRY"i { return flagcond("c=0") } /
            "NEGATIVE"i        { return flagcond("n=1") } / 
            "SIGN"i            { return flagcond("n=1") } / 
            "N"i _ "=" _ "1"   { return flagcond("n=1") } / 
            "S"i _ "=" _ "1"   { return flagcond("n=1") } / 
            "NOT"i __ "NEGATIVE"i { return flagcond("n=0") } / 
            "NOT"i _ "SIGN"i      { return flagcond("n=0") } / 
            "N"i _ "=" _ "0"      { return flagcond("n=0") } / 
            "S"i _ "=" _ "0"      { return flagcond("n=0") } / 
            "V"i _ "=" _ "1"      { return flagcond("v=1") } / 
            "OVERFLOW"i           { return flagcond("v=1") } / 
            "V"i _ "=" _ "0"      { return flagcond("v=0") } / 
            "NOT"i __ "OVERFLOW"i { return flagcond("v=0") }  

registercond = register:(register / memory) __ "is"i __ rcond:(
   "zero"i               { return "zero" } / 
   "not"i __ "zero"i     { return "not zero" } / 
   "negative"i           { return "negative" } / 
   "not"i __ "negative"i { return "not negative" } 
)
{ return registercond(register, rcond)}

register = ("a"i / "x"i / "y"i) { return text().toUpperCase() }

memory = expr:Expression

eqcond = leftvalue:(register / memory) _ op:condop _ value:opExpression
{ return eqcond(leftvalue, op, value) }

condop = "=" / "==" / "!=" / "<>" / "<" / ">" / "<=" / ">="

opExpression = ( Expression / "#" expr:Expression { return immediateExpression(expr) } ) 

// ===============================================

istructions = head:istruction tail:(_":"_ istruction)*      
{ if(tail.length==0) return head;
  const list = [head, ...(tail.map(e=>e[3]))];
  return instructions(list);
}

istruction 
  = !keywords opcode:opcode args:(__ arguments)?      { return instruction(opcode, args == null ? args : args[1]); }

opcode 
  = id       { return opcode(text()) }
  
arguments 
  = a:arg b:(_ "," _ arg)*   { return argumentsnode([a, ...(b.map(e=>e[3]))]); }

arg 
  = opExpression
  
emptyline "empty line" = eol   { return null }

emptyspace "empty space" = [ \t]+  { return null }

SingleLineComment
  = ("//" / ";") (![\n] .)*
  
label
  = name:id ":" eol     { return label(name.id) }
  
id = 
  [_a-zA-Z]+ [_a-zA-Z0-9]* { return identifier(text()) }

_ "whitespace"
  = [ \t]*

__ "space"
  = [ \t]+

eol
  = _ SingleLineComment? (":"/[\n]) 

eolnocolon
  = _ SingleLineComment? [\n]

// ===============================================

byte = bytetype:("byte"i / "word"i / "defb"i / "defw"i ) list:Expressions        { return byte(bytetype, list) }

Expressions = head:Expression tail:(_","_ Expression)*
{ if(tail.length==0) return head;
  return { type: "expressions", list: [head, ...(tail.map(e=>e[3]))] } }

// ===============================================

basic 
  = BASIC_START eol 
      lines:basiclines 
    _ BASIC_END eol     { return { type: "basic", lines: lines.filter(e=>e!==null) }  }

basiclines
  = basicline*

basicline
  = _ num:Integer __ testo:basictext eol  { return { type: "basicline", num: num, testo: testo }  }
  / eol                                   { return null }  
  
basictext 
  = [^\n]* { return text() }

// ===============================================
  
// =====================================================================================  
// https://en.cppreference.com/w/c/language/operator_precedence
// =====================================================================================  

Expression = expr:Level12 

Level12 = left:Level11 right:(_ op:'||' _ right:Level11 { return { type: op, right }})*   
          { return twoargs(left,right) }

Level11 = left:Level10 right:(_ op:'&&' _ right:Level10 { return { type: op, right }})*   
          { return twoargs(left,right) }

Level10 = left:Level4 right:(_ op:'|' _ right:Level4 { return { type: op, right }})*   
          { return twoargs(left,right) }

Level9 = left:Level8 right:(_ op:'^' _ right:Level8 { return { type: op, right }})*   
          { return twoargs(left,right) }

Level8 = left:Level5 right:(_ op:'&' _ right:Level5 { return { type: op, right }})*   
          { return twoargs(left,right) }

Level5 = left:Level4 right:(_ op:('<<'/'>>') _ right:Level4 { return { type: op, right }})*   
          { return twoargs(left,right) }

Level4 = left:Level3 right:(_ op:('+'/'-') _ right:Level3 { return { type: op, right }})*
         { return twoargs(left,right)}
         
Level3 = left:Level2 right:(_ op:('*' / '/' / '%' / "MOD") _ right:Level2 { return { type: op, right }})*
         { return twoargs(left,right)}

Level2 = '-' _ expr:Level1   { return { type: "unaryminus", expr } } 
       / '+' _ Level1        { return { type: "unaryplus", expr } }  
       / Level1
       
Level1 = id:id props:('.' property:Expression)+  { return { type: "dot", id, props } }
       / id:id args:( _ '(' args:Expressions ')' { return args })?  { return { type: "id", id, args } }
       / Primary
         
Primary = '(' _ expr:Expression _ ')'   { return { type: "()", expr } }
        / '[' _ expr:Expression _ ']'   { return { type: "[]", expr } }        
        / num:Integer                   { return { type: "integer", num } }
        / num:HexNumber                 { return { type: "integer", num } }
        / num:BinNumber                 { return { type: "integer", num } }
        / str:String                    { return { type: "string", str } }                

// =====================================================================================

QuoteChar = ('"'/"'")

String = QuoteChar testo:(!QuoteChar .)* QuoteChar { return testo.map(e=>e[1]).join(""); }

Integer "integer"
  = !BinPrefix [0-9]+ !HexSuffix { return parseInt(text(), 10); }

HexNumber 
  = HexPrefix number:[0-9a-fA-F]+    { return number.join(""); }
  / number:[0-9a-fA-F]+ HexSuffix    { return number.join(""); }
  
HexPrefix = "&h"i / "$" / "0x"i
HexSuffix = "h"i

BinNumber = BinPrefix number:[0-1]+ { return number.join(""); }
BinPrefix = "0b"i

// =====================================================================================

/* 
continue?
dim?
goto, gosub?
else if
*/

/*
expressions
selfmodlabel
MOD
HIBYTE
LOBYTE
*/
