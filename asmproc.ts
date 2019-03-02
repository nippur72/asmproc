#!/usr/bin/env node

// TODO ELSE IF
// TODO --version
// TODO macro in if single
// TODO dim/zeropage
// TODO bye/word in #const
// TODO slowly convert to nearley
// TODO peephole optimizer
// TODO on goto
// TODO switch case
// TODO parse line with nearley
// TODO zero page pool ? 
// TODO uses/preserve/lock?
// TODO input in sub
// TODO conditional include
// TODO test suite with 6502.js and Z80.js
// TODO float compiler with nearley
// TODO DIV, HIBYTE, LOBYTE functions
// TODO ' hypen comments?
// TODO "/*" comments when in quoted text
// TODO JMP simulate BRA branch always
// TODO self modifying code
// TODO WHILE, LOOP, UNTIL check no condition or loop forever
// TODO SUB nomesub = Identifier
// TODO SUB then rts or then exit sub ?
// TODO SUB implement RETURN
// TODO IF THEN GOTO move into IF SINGLE
// TODO bitmap, output as comment
// TODO float, output as comment
// TODO change float into cbmfloat, output as comment
// TODO basic compact by default // preserve
// TODO first char space in DASM?
// TODO #define ?
// TODO Z80 if then ret / return
// TODO Z80 FOR
// TODO Z80 Macro
// TODO Z80 Condition
// TODO macro fix literal value call
// TODO bitmap for c64 sprites
// TODO cc65
// TODO basic tokenizer: {cm } as {cbm}
// TODO basic tokenizer: ? as print
// TODO basic tokenizer: c64 colors
// TODO basic tokenizer: alternate names (wht -> white)
// TODO basic tokenizer: {rev shift} ?
// TODO basic tokenizer: {cbm } shortcuts
// TODO document preferences: DO LOOP vs WHILE/FOR, IF on single line etc.

/*

startfrom:
  - if single
  - bitmap
  - sprite
  - float
  - const

*/

/*
TO DO
=====

- loop forever
- dim
- float
- float expr compiler
- line numbers
- else if
- then statement con endif automatico
- (...) in sub
- inline sub / call sub
- inline sub / call
- controllare operatori signed <,>,
*/

/*
DASM 
   include
   IF ELSE ENDIF IFDEF IFNDEF
   byte
   word
   equ (define)
   parens: []

ca65
   .include
   .if .else .endif .ifdef .ifndef
   .byte
   .word
   .define   
   parens: ()

Z80ASM
   include
   IF ELSE ENDIF IFDEF IFNDEF
   defb
   defw
   define
   defl, defm, defs size, fill 
   parens: ?

6502        Z80
===========================
C           C    carry   
V           V    overflow
N           S    negative / sign
Z           Z    zero

*/

import fs from "fs";

import commandLineArgs, { OptionDefinition } from 'command-line-args';

function parseOptions(optionDefinitions: OptionDefinition[]) {
   try {       
      return commandLineArgs(optionDefinitions);
   } catch(ex) {
      console.log(ex.message);
      process.exit(-1);
   }
}

interface Macro 
{ 
   Name: string;
   Id: string;
   Parameters: string[];
   Code: string; 
}

class TStack<T=number>
{
   Strings: T[];

   constructor() {        
      this.Strings = [];
   } 
    
   get Count() {
      return this.Strings.length;
   }

   Add(s: T) {
      this.Strings.push(s);
   }

   Pop() {
      if(this.Strings.length === 0) throw `stack empty`;
      return this.Strings.pop() as T;
   }

   Last() {
      return this.Strings[this.Strings.length-1];
   }

   get IsEmpty() {
      return this.Strings.length === 0;
   }
}

export class TStringList extends TStack<string>
{
   SaveToFile(fname: string) {
      const content = this.Text();
      fs.writeFileSync(fname, content);
   }

   LoadFromFile(fname: string) {
      const text = fs.readFileSync(fname).toString();      
      this.SetText(text);
   }

   Text(): string {
      return this.Strings.join("\n");
   }

   SetText(text: string): void {      
      (this.Strings as unknown as string[]) = text.split("\n");
   }
}

function ChangeFileExt(name: string, ext: string): string 
{
   // taken from https://stackoverflow.com/questions/5953239/how-do-i-change-file-extension-with-javascript
   return name.replace(/\.[^\.]+$/, ext);
}

function FileExists(name: string): boolean 
{
   return fs.existsSync(name);
}

function RemoveQuote(S: string) {
    return S.substr(1, S.length-2);
}

function RemoveHash(S: string) {
   if(S.startsWith("#")) return S.substr(1);
   else return S;
}

declare global 
{
   interface String
   {
      AnsiPos(text: string): number;
      SubString(start: number, count?: number): string;
      Length(): number;
      ToInt(): number;
      CharCodeAt(index: number): number;
      CharAt(index: number): string;
      SetCharAt(index: number, ch: string): string;
   }
}

String.prototype.AnsiPos = function(text: string): number {    
   const pos = this.indexOf(text);
   return pos + 1;  // Borland strings are 1-based
}

String.prototype.SubString = function(start: number, count?: number): string {    
   // Borland strings are 1-based
   return this.substr(start-1, count);
}

String.prototype.Length = function(): number {    
   return this.length;
}

String.prototype.ToInt = function(): number {    
   return Number(this);
}

String.prototype.CharAt = function(index: number) {
   // Borland strings are 1-based
   return this.charAt(index-1);   
}

String.prototype.CharCodeAt = function(index: number) {
   // Borland strings are 1-based
   return this.charCodeAt(index-1);   
}

String.prototype.SetCharAt = function(index: number, chr: string): string {
   // Borland strings are 1-based
   if(index-1 > this.length-1) return this as string;
   return this.substr(0,index-1) + chr + this.substr(index-1+1);
}

let L = new TStringList();

let StackIf: TStack;
let StackRepeat: TStack;
let StackDo: TStack;
let StackWhile: TStack;
let StackFor: TStack;
let StackSub: TStack;
let StackIf_U = new TStringList();
let StackFor_U = new TStringList();

let AllMacros: Macro[] = [];

let Ferr: string;

import { target, Jump, MOD } from "./cross";
import { GetParm, GetToken, Trim, UpperCase } from "./utils";
import { IsBasicStart, IsBasic, IsBasicEnd } from "./basic";

let defines: string[];

export function error(msg: string, cline?: number)
{
    if(cline !== undefined) {
        error(msg + " in line " + cline + " of " + Ferr);
        return;
    }

    msg = "? " + msg;
    console.log(`${msg}`);
    if(Ferr!="") L.SaveToFile(Ferr);
    process.exit(-1);
}

function main()
{
   const options = parseOptions([
      { name: 'input',      alias: 'i', type: String },
      { name: 'output',     alias: 'o', type: String }, 
      { name: 'target',     alias: 't', type: String,  defaultValue: 'dasm' },
      { name: 'define',     alias: 'd', type: String }
   ]);   

   if(options === undefined || options.input === undefined || options.output === undefined) 
   {
      console.log("Usage: asmproc -i <inputfile> -o <outputfile>");
      process.exit(-1);
      return;
   }   

   // set target
   target.dasm = options.target === "dasm";
   target.ca65 = options.target === "ca65";
   target.z80asm = options.target === "z80asm";
   target.cpu6502 = target.dasm || target.ca65;
   target.cpuz80 = target.z80asm;   

   defines = options.define === undefined ? [] : options.define.split(",");

   L = new TStringList();

   let FName = options.input;
   let FOut = options.output;

   Ferr = ChangeFileExt(FOut, ".err");

   if(FName == FOut)
   {
      error("file names must be different");
   }

   if(!FileExists(FName))
   {
      error("can't find file");
   }

   StackIf = new TStack();
   StackRepeat = new TStack();
   StackDo = new TStack();
   StackWhile = new TStack();
   StackFor = new TStack();
   StackSub = new TStack();

   StackIf_U = new TStringList();
   StackFor_U = new TStringList();

   L.LoadFromFile(FName);

   ProcessFile();

   L.SaveToFile(FOut);

   console.log(`asmproc OK, created: "${FOut}"`);
   process.exit(0);
}

/*
function GlobalConstants() {
   let Linea = L.Strings[0];

   if(dasm) {
      Linea = "DASM EQU 1§"+Linea;
   }
   else if(ca65) {
      Linea = "DEFINE CA65 1§"+Linea;
   }
}
*/

function RemoveComments()
{
    // remove C comments
    let Whole = L.Text();
    let x,y;
    for(;;)
    {
        x = Whole.AnsiPos("/*");
        if(x==0) break;
        y = Whole.AnsiPos("*/");
        if(y<x)
        {
           error("unmatched /* */ comment");
        }

        for(let t=x; t<=y+1; t++)
        {
           let c = Whole.CharCodeAt(t);
           if(c != 13 && c != 10) Whole = Whole.SetCharAt(t, ' ');
        }
    }
    L.SetText(Whole);

   // remove // comments   
   for(let t=0; t<L.Count; t++) 
   {
      const R = new RegExp(/(.*)\/\/(?=(?:[^"]*"[^"]*")*[^"]*$)(.*)/gmi);
      const Linea = L.Strings[t];
      const match = R.exec(Linea);
      if(match !== null) {
         const [all, purged, comment] = match;
         L.Strings[t] = purged;     
      }
   }

   // remove ; comments   
   let inbasic = false;
   for(let t=0; t<L.Count; t++) 
   {
      const R = new RegExp(/(.*);(?=(?:[^"]*"[^"]*")*[^"]*$)(.*)/gmi);   
      const Linea = L.Strings[t];      
      const match = R.exec(Linea);
      
      if(match !== null) {         
         const [all, purged, comment] = match;         
         // special case of ; comment in BASIC START / BASIC END
         if(IsBasicStart(purged)) {
            inbasic = true;            
            L.Strings[t] = purged;
         }
         else if(IsBasicEnd(purged)) {
            inbasic = false;            
            L.Strings[t] = purged;     
         }       

         if(!inbasic) L.Strings[t] = purged;
      }
      else 
      {
         if(IsBasicStart(Linea)) inbasic = true;
         if(IsBasicEnd(Linea)) inbasic = false;
      }
   }   
}

function ModOperator()
{
   // transform MOD   
   for(let t=0; t<L.Count; t++) 
   {
      while(true)
      {
         const R = new RegExp(/(.*)\sMOD\s(?=(?:[^"]*"[^"]*")*[^"]*$)(.*)/gmi);   
         const Linea = L.Strings[t];      
         const match = R.exec(Linea);
         if(match !== null) {         
            const [all, left, right] = match;            
            L.Strings[t] = MOD(left, right);
         }
         else break;
      }
   }
}

function ResolveInclude(): boolean
{
    for(let t=0; t<L.Count; t++)
    {
        let Linea = UpperCase(Trim(L.Strings[t]))+" ";
        
        let Include = GetParm(Linea, " ", 0);
                
        if(Include=="INCLUDE")
        {
           let NomeFile = GetParm(Linea, " ", 1);
           if(NomeFile.length < 2)
           {
              error(`invalid file name "${NomeFile}" in include`, t);
           }
           NomeFile = RemoveQuote(NomeFile);
           if(!FileExists(NomeFile))
           {
              error(`include file "${NomeFile}" not found`, t);
           }
           let IF = new TStringList();
           IF.LoadFromFile(NomeFile);
           L.Strings[t] = IF.Text();           
           return true;
        }
    }
    return false;
}

function IsIdentifier(s: string) 
{
   const R = new RegExp(/^\s*[_a-zA-Z]+[_a-zA-Z0-9]*$/gmi);
   const match = R.exec(s);
   if(match === null) return false;
   return true;
}

function RemoveColon()
{  
   // remove : colon
   for(let t=0; t<L.Count; t++) 
   {      
      while(true)
      {
         const Linea = L.Strings[t];      
         const R = new RegExp(/(.*):(?=(?:[^"]*"[^"]*")*[^"]*$)(.*)/gmi);   
         const match = R.exec(Linea);
         if(match !== null) {         
            const [all, leftpart, rightpart] = match;         
            if(IsIdentifier(leftpart)) break;            
            L.Strings[t] = `${leftpart}§   ${rightpart}`;            
         }
         else break;
      }       
   }
}

function MakeAllUpperCase()
{
    let Whole = L.Text();
    L.SetText(UpperCase(Whole));
}

// spezza su piu linee #IFDEF / #IFNDEF su singola linea 
function IsIFDEFSingle(Linea: string, nl: number): string | undefined
{   
   // "_ #ifdef|#ifndef _ {cond} _ then {statement}";
   const R = new RegExp(/\s*(#ifdef|#ifndef)\s+(.*)\s+then\s+(.*)/i);
   const match = R.exec(Linea);

   if(match === null) return undefined;

   const [ all, ifdef, cond, statement ] = match;
   return `${ifdef} ${cond}§   ${statement}§#ENDIF`;
}

// change assembler reserved keywords
function IsReservedKeywords(Linea: string, nl: number): string|undefined
{
   Linea = Trim(Linea);
   if(Linea.startsWith("#"))
   {
      if(target.dasm || target.z80asm) 
      {
         Linea = Linea.replace("#IFDEF","IFCONST");
         Linea = Linea.replace("#IFNDEF","IFNCONST");
         Linea = Linea.replace("#IF","IF");
         Linea = Linea.replace("#ELSE","ELSE");
         Linea = Linea.replace("#ENDIF","ENDIF");
         //Linea = Linea.replace("#INCLUDE","INCLUDE");
         let ReplaceTo = " " + Linea;
         return ReplaceTo;
      }
      else if(target.ca65) 
      {
         Linea = Linea.replace("#IFDEF",".IFDEF");
         Linea = Linea.replace("#IFNDEF",".IFNDEF");
         Linea = Linea.replace("#IF",".IF");
         Linea = Linea.replace("#ELSE",".ELSE");
         Linea = Linea.replace("#ENDIF",".ENDIF");
         //Linea = Linea.replace("#INCLUDE","INCLUDE");
         let ReplaceTo = " " + Linea;
         return ReplaceTo;
      }
   }   
   return undefined;
}

function ProcessFile()
{
   let t;

   for(;;)
   {
      RemoveComments();
      let hasinclude = ResolveInclude();
      if(!hasinclude) break;
   }

   // remove \r new lines and tabs
   L.SetText(L.Text().replace(/\r/g, ""));
   L.SetText(L.Text().replace(/\t/g, "   "));

   // scan for basic, needs to be done first before of semicolon replacement
   for(t=0;t<L.Count;t++)
   {
    	let Dummy = L.Strings[t];                
      let ReplaceTo = IsBasic(L, Dummy, t);
      // IsBasic does replace by itself
    	// if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;        
   }
   
   ModOperator();

   RemoveColon();

   MakeAllUpperCase();

   // substitute DASM IF THEN on single line
   for(t=0; t<L.Count; t++)
   {
   	let Dummy = L.Strings[t];
      let ReplaceTo = IsIFDEFSingle(Dummy, t);

      if(ReplaceTo !== undefined)
    	{
         L.Strings[t] = ReplaceTo;
      }
   }
   
   // change § into newlines (needed for DASM IF-THENs)   
   L.SetText(L.Text().replace(/§/g, "\n"));

   // self modifying labels
   for(t=0; t<L.Count; t++)
   {
    	let Dummy = L.Strings[t];    	
      let ReplaceTo;
      ReplaceTo = IsSelfModLabel(Dummy, t); 
      if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;   
   }

   // scan for sub...end sub, need before macro to avoid conflicts with "sub"
   for(t=0;t<L.Count;t++)
   {
    	let Dummy = L.Strings[t];
    	let ReplaceTo;

      ReplaceTo = IsSUB(Dummy, t);     if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
      ReplaceTo = IsEXITSUB(Dummy, t); if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
      ReplaceTo = IsENDSUB(Dummy, t);  if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;      
   }

   if(!StackSub.IsEmpty) error("SUB without END SUB");    
   
   // pre-process macros and build macro list   
   for(t=0; t<L.Count; t++)
   {
    	let Dummy = L.Strings[t];    	
      let ReplaceTo;
      ReplaceTo = IsMACRO(Dummy,    t); if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
      ReplaceTo = IsENDMACRO(Dummy, t); if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
   }
   
   substitute_macro(L);

   // scan for repeat ... until then
   for(t=0; t<L.Count; t++)
   {
    	let Dummy = L.Strings[t];
    	let ReplaceTo;

      ReplaceTo = IsREPEAT(Dummy, t);     if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
      ReplaceTo = IsEXITREPEAT(Dummy, t); if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
      ReplaceTo = IsUNTIL(Dummy, t);      if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;      
   }

   if(!StackRepeat.IsEmpty) error("REPEAT without UNTIL");

   // scan for do ... loop then
   for(t=0;t<L.Count;t++)
   {
    	let Dummy = L.Strings[t];
      let ReplaceTo;
      
      ReplaceTo = IsDO(Dummy, t);     if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
      ReplaceTo = IsEXITDO(Dummy, t); if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
      ReplaceTo = IsLOOP(Dummy, t);   if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
   }

   if(!StackDo.IsEmpty) error("DO without LOOP");

   // scan for while ... wend then
   for(t=0;t<L.Count;t++)
   {
    	let Dummy = L.Strings[t];
    	let ReplaceTo;

      ReplaceTo = IsWHILE(Dummy, t);     if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
      ReplaceTo = IsEXITWHILE(Dummy, t); if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
      ReplaceTo = IsWEND(Dummy, t);      if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
   }

   if(!StackWhile.IsEmpty) error("WHILE without WEND");

   // scan for for ... next then
   for(t=0;t<L.Count;t++)
   {
    	let Dummy = L.Strings[t];
    	let ReplaceTo;

      ReplaceTo = IsFOR(Dummy, t);     if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
      ReplaceTo = IsEXITFOR(Dummy, t); if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
      ReplaceTo = IsNEXT(Dummy, t);    if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;      
   }

   if(!StackFor.IsEmpty) error("FOR without NEXT");

   // scan for on single line: "if then <statement>"
   for(t=0;t<L.Count;t++)
   {
    	let Dummy = L.Strings[t];
    	let ReplaceTo;

      ReplaceTo = IsIFSINGLE(Dummy, t); if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;      
   }

   // change § into newlines (needed after IF-THEN <statement>)
   L.SetText(L.Text().replace(/§/g, "\n"));

   // do another macro substitition for macro in if-single
   substitute_macro(L);

   // scan for if then
   for(t=0;t<L.Count;t++)
   {
    	let Dummy = L.Strings[t];
    	let ReplaceTo;

      ReplaceTo = IsIF(Dummy, t);    if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;
      ReplaceTo = IsENDIF(Dummy, t); if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;

      ReplaceTo = IsELSE(Dummy, t);      
      if(ReplaceTo !== undefined)
	   {
         L.Strings[t] = ReplaceTo;
         StackIf_U.Pop();
         StackIf_U.Add("true");         
       }
   }

   if(!StackIf.IsEmpty) error("malformed IF");
   
   /*
   // bitmap values
   for(t=0;t<L.Count;t++)
   {
      let Dummy = L.Strings[t];
    	let ReplaceTo = IsBitmap(Dummy, t);
      if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;      
   }
   */

   /*
   // sprite values
   for(t=0;t<L.Count;t++)
   {
      let Dummy = L.Strings[t];
    	let ReplaceTo = IsSprite(Dummy, t);
      if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;      
   }
   */

   for(t=0;t<L.Count;t++)
   {
    	let Dummy = L.Strings[t];
      let ReplaceTo = IsCombined(Dummy, t);

      if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;      
   }

   /*
   // floating point values
   for(t=0;t<L.Count;t++)
   {
    	let Dummy = L.Strings[t];
      let ReplaceTo = IsFloat(Dummy, t);

      if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;      
   }

   // substitute const
   for(t=0; t<L.Count; t++)
   {
   	let Dummy = L.Strings[t];
      let ReplaceTo = IsConst(Dummy, t);

      if(ReplaceTo !== undefined)
    	{
         L.Strings[t] = ReplaceTo;
      }
   }
   */

   // add defines on top of the file
   const definecode = defines.map(e=>{
      if(e.indexOf("=")<0) return `${e}=1`;
      else return `${e}=1`;
   }).join("§");
   
   L.Strings[0] = definecode + L.Strings[0];

   // change § into newlines
   L.SetText(L.Text().replace(/§/g,"\n"));

   // substitute reserved keywords
   for(t=0;t<L.Count;t++)
   {
    	let Dummy = L.Strings[t];
    	let ReplaceTo = IsReservedKeywords(Dummy, t);

      if(ReplaceTo !== undefined) 
    	{
         L.Strings[t] = ReplaceTo;
      }
   }   
}


function Label(Header: string, nr: number, suffix: string)
{
   return `${Header}_${nr}_${suffix}`;
}

function substitute_macro(L: TStringList) {
   // substitute macros. substitution is repeated until all macro are expanded (recursively)
   let replaced;
   do
   {
      replaced = false;
      for(let t=0; t<L.Count; t++)
      {
         let Dummy = L.Strings[t];
         let ReplaceTo = IsMacroCall(Dummy, t);
         if(ReplaceTo !== undefined) {
            L.Strings[t] = ReplaceTo;      
            replaced = true;
         }
      }

      // change § into newlines (needed for macros)   
      L.SetText(L.Text().replace(/§/g, "\n"));   

   } while(replaced);
}

function IsIFSINGLE(Linea: string, nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let StringaIF;
   let StringaCond;
   let StringaAfterThen;

   let G = GetToken(Linea," "); Linea = G.Rest;
   StringaIF = G.Token;
   
   if(StringaIF!="IF") return undefined;

   G = GetToken(Linea," THEN"); Linea = G.Rest
   StringaCond = G.Token;
   if(StringaCond=="") return undefined;

   Linea = Trim(Linea);
   let LastPart = Linea;

   G = GetToken(Linea+" "," "); Linea = G.Rest;
   StringaAfterThen = Trim(G.Token);

   if(StringaAfterThen=="") return undefined;       // if composto
   if(StringaAfterThen=="GOTO") return undefined;   // if then goto

   // if <cond> then <statement>

   let ReplaceTo = ` IF ${StringaCond} THEN § ${LastPart} § END IF§ `;
   return ReplaceTo;
}

function IsIF(Linea: string, nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let StringaIF;
   let StringaCond;
   let StringaAfterThen;

   let G = GetToken(Linea," "); Linea = G.Rest;
   StringaIF = G.Token;
   if(StringaIF!="IF") return undefined;

   G = GetToken(Linea," THEN"); Linea = G.Rest;
   StringaCond = G.Token;
   if(StringaCond=="") return undefined;

   Linea = Trim(Linea);

   G = GetToken(Linea," "); Linea = G.Rest;
   StringaAfterThen = Trim(G.Token);

   let ReplaceTo = "";

   if(StringaAfterThen=="GOTO")
   {
       // if then goto
       let { Eval, BranchNot, Branch } = ParseCond(StringaCond);
       let Lab = Linea;
       Branch = Branch.replace(/\*/g, Lab);

       ReplaceTo = "";
       if(Eval!="") ReplaceTo = ReplaceTo+ "\t"+Eval+"§";
       ReplaceTo = ReplaceTo + "\t"+Branch;
       return ReplaceTo;
   }
      
   // if composto
   StackIf.Add(nl);
   StackIf_U.Add("false");

   let { Eval,BranchNot,Branch } = ParseCond(StringaCond);

   let Lab = Label("IF", nl, "ELSE");
   BranchNot = BranchNot.replace(/\*/g, Lab);

   ReplaceTo = Label("IF", nl, "START")+":§";
   if(Eval!="") ReplaceTo = ReplaceTo+ "\t"+Eval+"§";
   ReplaceTo = ReplaceTo + "\t"+BranchNot;
   
   return ReplaceTo;
}

function IsENDIF(Linea: string,  nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let G = GetToken(Linea," "); Linea = G.Rest;
   let StringaENDIF = G.Token;
   
   if(StringaENDIF!="ENDIF" && !(StringaENDIF=="END" && Linea=="IF ")) return undefined;

   if(StackIf.IsEmpty)
   {
      error("ENDIF without IF", nl);
      process.exit(-1);
   }

   let ReplaceTo = "";
   let n = StackIf.Pop();
   let cond = StackIf_U.Pop();

   if(cond=="false") ReplaceTo = Label("IF",n,"ELSE")+":§";
   ReplaceTo = ReplaceTo+Label("IF",n,"END")+":";   
   return ReplaceTo;
}

function IsELSE(Linea: string, n: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let G = GetToken(Linea," "); Linea = G.Rest;
   let StringaELSE = G.Token;   

   if(StringaELSE!="ELSE") return undefined;

   if(StackIf.IsEmpty)
   {
      error("ELSE without IF",n);
   }
   let nl = StackIf.Last();

   let ReplaceTo = "\t"+Jump(Label("IF",nl,"END"))+"§"+Label("IF",nl,"ELSE")+":";
   return ReplaceTo;
}

function IsREPEAT(Linea: string, nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let StringaREPEAT = GetParm(Linea, " ", 0);

   if(StringaREPEAT!="REPEAT") return undefined;
   
   StackRepeat.Add(nl);

   let ReplaceTo = Label("REPEAT", nl, "START")+":";
   return ReplaceTo;
}

function IsSelfModLabel(Linea: string, nl: number): string | undefined
{   
   let R = new RegExp(/^(.*)\*\*([_a-zA-Z]+[_a-zA-Z0-9]*)(?:\((.*)\))?(.*)$/gmi);
   let match = R.exec(Linea);
   if(match !== null) {            
      const [all, leftside, varname, varparm, rightside] = match;      
      let arg = (varparm === undefined || varparm === "") ? "$0000" : varparm;
      let ReplaceTo = `${varname} = _${varname}+1 §_${varname}:${leftside} ${arg}${rightside}`;
      return ReplaceTo;
   }   
}

function IsEXITREPEAT(Linea: string, nl: number): string | undefined
{
   // CASE 1: turns "IF cond THEN EXIT REPEAT" into "IF cond THEN GOTO REPEAT_n_END"
   let R = new RegExp(/^(.*)\s+then\s+exit\s+repeat\s*$/i);
   let match = R.exec(Linea);
   if(match !== null) {      
      if(StackRepeat.IsEmpty) error("not in REPEAT", nl);
      let n = StackRepeat.Last();
      const [all, first, then] = match;
      let label = Label("REPEAT", n, "END");
      let ReplaceTo = `${first} THEN GOTO ${label}`;
      return ReplaceTo;
   }

   // CASE 2: turns "EXIT REPEAT" into "JMP"
   R = new RegExp(/^(\s*)exit\s+repeat\s*$/i);
   match = R.exec(Linea);
   if(match !== null) {      
      if(StackRepeat.IsEmpty) error("not in REPEAT", nl);
      let n = StackRepeat.Last();      
      let label = Label("REPEAT", n, "END");
      const [all, spaces, exit_repeat] = match;
      let ReplaceTo = `${spaces}${Jump(label)}`;
      return ReplaceTo;
   }
}

function IsUNTIL(Linea: string, n: number): string | undefined
{
   Linea = Trim(Linea);

   let G = GetToken(Linea," "); Linea = G.Rest;
   let StringaUNTIL= G.Token;
   let StringaCond = Trim(Linea);

   if(StringaCond=="") return undefined;
   if(UpperCase(StringaUNTIL)!="UNTIL") return undefined;

   if(StackRepeat.Count-1<0)
   {
       error("UNTIL without REPEAT",n);
   }

   let nl = StackRepeat.Pop();

   let { Eval, BranchNot, Branch } = ParseCond(StringaCond);

   let Lab = Label("REPEAT",nl,"START");
   BranchNot = BranchNot.replace(/\*/g,Lab);

   let ReplaceTo = "";
   if(Eval!="") ReplaceTo = ReplaceTo+ "\t"+Eval+"§";
   ReplaceTo = ReplaceTo + "\t"+BranchNot;
   ReplaceTo = ReplaceTo + "§" + Label("REPEAT",nl,"END")+":§";

   return ReplaceTo;
}

function IsDO(Linea: string, nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let StringaDO = GetParm(Linea," ",0);

   if(StringaDO!="DO") return undefined;

   StackDo.Add(nl);   

   let ReplaceTo = Label("DO", nl, "START")+":";
   return ReplaceTo;
}

function IsEXITDO(Linea: string, nl: number): string | undefined
{
   // CASE 1: turns "IF cond THEN EXIT DO" into "IF cond THEN GOTO DO_n_END"
   let R = new RegExp(/^(.*)\s+then\s+exit\s+do\s*$/i);
   let match = R.exec(Linea);
   if(match !== null) {      
      if(StackDo.IsEmpty) error("not in DO", nl);
      let n = StackDo.Last();
      const [all, first, then] = match;
      let label = Label("DO", n, "END");
      let ReplaceTo = `${first} THEN GOTO ${label}`;
      return ReplaceTo;
   }

   // CASE 2: turns "EXIT DO" into "JMP"
   R = new RegExp(/^(\s*)exit\s+do\s*$/i);
   match = R.exec(Linea);
   if(match !== null) {      
      if(StackDo.IsEmpty) error("not in DO", nl);
      let n = StackDo.Last();      
      let label = Label("DO", n, "END");
      const [all, spaces, exit_do] = match;
      let ReplaceTo = `${spaces}${Jump(label)}`;
      return ReplaceTo;
   }
}

function IsLOOP(Linea: string, n: number): string | undefined
{
   const R = new RegExp(/^(\s*)loop\s+(if|while|until)\s+(.*)$/gmi);
   const match = R.exec(Linea);   
   if(match === null) return undefined;
         
   if(StackDo.IsEmpty) error("DO without LOOP");
   
   const [all, spaces, type, cond] = match;

   let CondNot = true;

        if(UpperCase(type)=="WHILE") CondNot = false;
   else if(UpperCase(type)=="IF"   ) CondNot = false;
   else if(UpperCase(type)=="UNTIL") CondNot = true;

   let nl = StackDo.Pop();   

   let { Eval, BranchNot, Branch } = ParseCond(cond);

   let Lab = Label("DO", nl, "START");
   Branch    = Branch.replace(/\*/g,Lab);
   BranchNot = BranchNot.replace(/\*/g,Lab);

   let ReplaceTo = "";
   if(Eval!="") ReplaceTo = ReplaceTo+ "\t"+Eval+"§";
   if(CondNot)  ReplaceTo = ReplaceTo + "\t"+BranchNot;
   else         ReplaceTo = ReplaceTo + "\t"+Branch;

   ReplaceTo = ReplaceTo + "§" + Label("DO", nl, "END")+":§";

   return ReplaceTo;
}

function IsWHILE(Linea: string,  nl: number): string | undefined
{   
   Linea = Trim(Linea);

   let StringaWHILE;
   let StringaCond;

   let G = GetToken(Linea," "); Linea = G.Rest; StringaWHILE = G.Token;
   StringaCond = Trim(Linea);   

   if(StringaCond=="") return undefined;
   if(UpperCase(StringaWHILE)!="WHILE") return undefined;

   let { Eval, BranchNot, Branch } = ParseCond(StringaCond);

   let Lab = Label("WHILE",nl,"END");
   BranchNot = BranchNot.replace(/\*/g, Lab);

   let ReplaceTo = "";

   ReplaceTo = ReplaceTo + Label("WHILE", nl, "START")+":§";
   if(Eval!="") ReplaceTo = ReplaceTo+ "\t"+Eval+"§";
   ReplaceTo = ReplaceTo + "\t"+BranchNot;

   StackWhile.Add(nl);   

   return ReplaceTo;
}

function IsEXITWHILE(Linea: string, nl: number): string | undefined
{
   // CASE 1: turns "IF cond THEN EXIT WHILE" into "IF cond THEN GOTO WHILE_n_END"
   let R = new RegExp(/^(.*)\s+then\s+exit\s+while\s*$/i);
   let match = R.exec(Linea);
   if(match !== null) {      
      if(StackWhile.IsEmpty) error("not in WHILE", nl);
      let n = StackWhile.Last();
      const [all, first, then] = match;
      let label = Label("WHILE", n, "END");
      let ReplaceTo = `${first} THEN GOTO ${label}`;
      return ReplaceTo;
   }

   // CASE 2: turns "EXIT WHILE" into "JMP"
   R = new RegExp(/^(\s*)exit\s+while\s*$/i);
   match = R.exec(Linea);
   if(match !== null) {      
      if(StackWhile.IsEmpty) error("not in WHILE", nl);
      let n = StackWhile.Last();      
      let label = Label("WHILE", n, "END");
      const [all, spaces, exit_while] = match;
      let ReplaceTo = `${spaces}${Jump(label)}`;
      return ReplaceTo;
   }
}

function IsWEND(Linea: string, n: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let StringaWEND = GetParm(Linea," ",0);

   if(StringaWEND!="WEND") return undefined;

   if(StackWhile.IsEmpty) error("WEND without WHILE");

   let nl = StackWhile.Pop();;

   let ReplaceTo = "\t"+Jump(Label("WHILE",nl,"START"))+"§"+Label("WHILE",nl,"END")+":";
   
   return ReplaceTo;
}

function IsFOR(Linea: string,  nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea));

   let StringaFOR: string;
   let StringaStart: string;
   let StringaEnd: string;
   let Step: string;
   let Register: string;
   let StartValue: string;
   let StartIstruction: string;
   let StepInstruction: string = "";

   let G = GetToken(Linea," "); Linea = G.Rest;
   StringaFOR = G.Token;
   if(StringaFOR!="FOR") return undefined;
   G = GetToken(Linea,"TO"); Linea = G.Rest;
   StringaStart = G.Token
   StringaStart = Trim(StringaStart);
   if(StringaStart=="") return undefined;

   G = GetToken(Linea,"STEP"); Linea = G.Rest;
   StringaEnd = G.Token;
   if(StringaEnd!="")
   {
	  Step = Trim(Linea);
	  if(Step=="") return undefined;
   }
   else
   {
	  StringaEnd = Linea;
	  Step = "#1";
   }
   StringaEnd = Trim(StringaEnd);
   if(StringaEnd=="") return undefined;

   // find what register to use
   G = GetToken(StringaStart,"="); StringaStart = G.Rest;
   Register = G.Token;
   StartValue = StringaStart;
   if(Register=="")
   {
      error("invalid FOR starting condition");
   }

   if(Register=="X")
   {
      StartIstruction = "LDX "+StartValue;
           if(Step=="#1")  { StepInstruction = "\tinx";                    StringaEnd = Register + "!=" + StringaEnd + "+1"; }
      else if(Step=="#2")  { StepInstruction = "\tinx§\tinx";              StringaEnd = Register + "<"  + StringaEnd + "+2"; }
      else if(Step=="#3")  { StepInstruction = "\tinx§\tinx§\tinx";        StringaEnd = Register + "<"  + StringaEnd + "+3"; }
      else if(Step=="#4")  { StepInstruction = "\tinx§\tinx§\tinx§\tinx";  StringaEnd = Register + "<"  + StringaEnd + "+4"; }
      else if(Step=="#-1") { StepInstruction = "\tdex";                    StringaEnd = Register + "!=" + StringaEnd + "-1"; }
      else if(Step=="#-2") { StepInstruction = "\tdex§\tdex";              StringaEnd = Register + ">=" + StringaEnd + "-2"; }
      else if(Step=="#-3") { StepInstruction = "\tdex§\tdex§\tdexx";       StringaEnd = Register + ">=" + StringaEnd + "-3"; }
      else if(Step=="#-4") { StepInstruction = "\tdex§\tdex§\tdex§\tdexx"; StringaEnd = Register + ">=" + StringaEnd + "-4"; }
      else
      {
          error("invalid STEP in FOR");
      }
   }
   else if(Register=="Y")
   {
      StartIstruction = "LDY "+StartValue;
           if(Step=="#1")  { StepInstruction = "\tiny";                    StringaEnd = Register + "!=" + StringaEnd + "+1"; }
      else if(Step=="#2")  { StepInstruction = "\tiny§\tiny";              StringaEnd = Register + "<"  + StringaEnd + "+2"; }
      else if(Step=="#3")  { StepInstruction = "\tiny§\tiny§\tiny";        StringaEnd = Register + "<"  + StringaEnd + "+3"; }
      else if(Step=="#4")  { StepInstruction = "\tiny§\tiny§\tiny§\tiny";  StringaEnd = Register + "<"  + StringaEnd + "+4"; }
      else if(Step=="#-1") { StepInstruction = "\tdey";                    StringaEnd = Register + "!=" + StringaEnd + "-1"; }
      else if(Step=="#-2") { StepInstruction = "\tdey§\tdey";              StringaEnd = Register + ">=" + StringaEnd + "-2"; }
      else if(Step=="#-3") { StepInstruction = "\tdey§\tdey§\tdey";        StringaEnd = Register + ">=" + StringaEnd + "-3"; }
      else if(Step=="#-4") { StepInstruction = "\tdey§\tdey§\tdey§\tdey";  StringaEnd = Register + ">=" + StringaEnd + "-4"; }
      else
      {
          error("invalid STEP in FOR");
      }
   }
   else if(Register=="A")
   {
      StartIstruction = "LDA "+StartValue;
           if(Step=="#1")  { StepInstruction = "\tclc§\tadc #1";   StringaEnd = Register + "!=" + StringaEnd + "+1"; }
      else if(Step=="#2")  { StepInstruction = "\tclc§\tadc #2";   StringaEnd = Register + "<"  + StringaEnd + "+2"; }
      else if(Step=="#3")  { StepInstruction = "\tclc§\tadc #3";   StringaEnd = Register + "<"  + StringaEnd + "+3"; }
      else if(Step=="#4")  { StepInstruction = "\tclc§\tadc #4";   StringaEnd = Register + "<"  + StringaEnd + "+4"; }
      else if(Step=="#-1") { StepInstruction = "\tclc§\tadc #255"; StringaEnd = Register + "!=" + StringaEnd + "-1"; }
      else if(Step=="#-2") { StepInstruction = "\tclc§\tadc #254"; StringaEnd = Register + ">=" + StringaEnd + "-2"; }
      else if(Step=="#-3") { StepInstruction = "\tclc§\tadc #253"; StringaEnd = Register + ">=" + StringaEnd + "-3"; }
      else if(Step=="#-4") { StepInstruction = "\tclc§\tadc #252"; StringaEnd = Register + ">=" + StringaEnd + "-4"; }
      else
      {
          error("invalid STEP in FOR");
      }
   }
   else
   {
      StartIstruction = "LDA "+StartValue+"§\tSTA "+Register;
           if(Step=="#1")  { StepInstruction = "\tinc "+Register;                                                            StringaEnd = Register + "!=" + StringaEnd + "+1"; }
      else if(Step=="#2")  { StepInstruction = "\tinc "+Register+"§\tinc "+Register;                                         StringaEnd = Register + "<"  + StringaEnd + "+2"; }
      else if(Step=="#3")  { StepInstruction = "\tinc "+Register+"§\tinc "+Register+"§\tinc "+Register;                      StringaEnd = Register + "<"  + StringaEnd + "+3"; }
      else if(Step=="#4")  { StepInstruction = "\tinc "+Register+"§\tinc "+Register+"§\tinc "+Register+"§\tinc "+Register;   StringaEnd = Register + "<"  + StringaEnd + "+4"; }
      else if(Step=="#-1") { StepInstruction = "\tdec "+Register;                                                            StringaEnd = Register + "!=" + StringaEnd + "-1"; }
      else if(Step=="#-2") { StepInstruction = "\tdec "+Register+"§\tdec "+Register;                                         StringaEnd = Register + ">=" + StringaEnd + "-2"; }
      else if(Step=="#-3") { StepInstruction = "\tdec "+Register+"§\tdec "+Register+"§\tdec "+Register;                      StringaEnd = Register + ">=" + StringaEnd + "-3"; }
      else if(Step=="#-4") { StepInstruction = "\tdec "+Register+"§\tdec "+Register+"§\tdec "+Register+"§\tdec "+Register;   StringaEnd = Register + ">=" + StringaEnd + "-4"; }
      else
      {
          error("invalid STEP in FOR");
      }
   }

   let ReplaceTo = Label("FOR",nl,"START")+":§"+"\t"+StartIstruction+"§";
   ReplaceTo = ReplaceTo+Label("FOR",nl,"LOOP")+":";

   let { Eval, BranchNot, Branch } = ParseCond(StringaEnd);
   let Lab = Label("FOR",nl,"LOOP");
   Branch = Branch.replace(/\*/g,Lab);

   StepInstruction = "\t"+StepInstruction+"§\t"+Eval+"§\t"+Branch+"§";

   StackFor.Add(nl);
   StackFor_U.Add(StepInstruction);
   return ReplaceTo;
}

function IsEXITFOR(Linea: string, nl: number): string | undefined
{
   // CASE 1: turns "IF cond THEN EXIT FOR" into "IF cond THEN GOTO FOR_n_END"
   let R = new RegExp(/^(.*)\s+then\s+exit\s+for\s*$/i);
   let match = R.exec(Linea);
   if(match !== null) {      
      if(StackFor.IsEmpty) error("not in FOR", nl);
      let n = StackFor.Last();
      const [all, first, then] = match;
      let label = Label("FOR", n, "END");
      let ReplaceTo = `${first} THEN GOTO ${label}`;
      return ReplaceTo;
   }

   // CASE 2: turns "EXIT FOR" into "JMP"
   R = new RegExp(/^(\s*)exit\s+for\s*$/i);
   match = R.exec(Linea);
   if(match !== null) {      
      if(StackFor.IsEmpty) error("not in FOR", nl);
      let n = StackFor.Last();      
      let label = Label("FOR", n, "END");
      const [all, spaces, exit_for] = match;
      let ReplaceTo = `${spaces}${Jump(label)}`;
      return ReplaceTo;
   }
}

function IsNEXT(Linea: string, n: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let StringaNEXT = GetParm(Linea, " ", 0);

   if(StringaNEXT!="NEXT") return undefined;

   if(StackFor.IsEmpty) error("NEXT without FOR");   

   let nl = StackFor.Pop();
   let StepCondition = StackFor_U.Pop();

   let ReplaceTo = StepCondition+"§"+Label("FOR",nl,"END")+":";
   return ReplaceTo;
}

import { notequal, parens } from "./cross";

function ParseCond(W: string)
{
   let signedcond = false;
   let usinga = true;
   let usingx = false;
   let usingy = false;
   let x: number;

   let Cast;
   let OriginalW = W;
   
   const { cpu6502, cpuz80 } = target;

	W = UpperCase(Trim(W));

   Cast = "(SIGNED)";
   x = W.AnsiPos(Cast);
   if(x>0)
   {
      signedcond = true;
      W = W.SubString(1,x-1)+W.SubString(x+Cast.Length(),W.Length());
   }

   Cast = "(USING X)";
   x = W.AnsiPos(Cast);
   if(x>0)
   {
      usingx = true;
      usinga = false;
      W = W.SubString(1,x-1)+W.SubString(x+Cast.Length(),W.Length());
   }

   Cast = "(USING Y)";
   x = W.AnsiPos(Cast);
   if(x>0)
   {
      usingy = true;
      usinga = false;
      usingx = false;
      W = W.SubString(1,x-1)+W.SubString(x+Cast.Length(),W.Length());
   }

	let Branch="";
   let Eval="";
   let Eval1 = "";
	let BranchNot="";

   if(W=="Z=1" || W=="ZERO" || W=="EQUAL")
	{
      Eval = "";      
		Branch    = cpu6502 ? "BEQ *" : "JR Z, *";
		BranchNot = cpu6502 ? "BNE *" : "JR NZ, *";
	}
	else if(W=="Z=0" || W=="NOT ZERO" || W=="NOT EQUAL")
	{
		Eval = "";
		Branch    = cpu6502 ? "BNE *" : "JR NZ, *";
		BranchNot = cpu6502 ? "BEQ *" : "JR Z, *";
	}
	else if(W=="C=1" || W=="CARRY")
	{
		Eval = "";
		Branch    = cpu6502 ? "BCS *" : "JR C, *";
		BranchNot = cpu6502 ? "BCC *" : "JR NC, *";
	}
	else if(W=="C=0" || W=="NOT CARRY")
	{
		Eval = "";
		Branch    = cpu6502 ? "BCC *" : "JR NC, *";
		BranchNot = cpu6502 ? "BCS *" : "JR C, *";
	}
	else if(W=="NEGATIVE" || W=="SIGN" || (cpu6502 && W=="N=1") || (cpuz80 && W=="S=1")) 
	{
		Eval = "";
		Branch    = cpu6502 ? "BMI *" : "JP S, *";
		BranchNot = cpu6502 ? "BPL *" : "JP NS, *";
	}
	else if(W=="NOT NEGATIVE" || W=="NOT SIGN" || (cpu6502 && W=="N=0") || (cpuz80 && W=="S=0")) 
	{
		Eval = "";
		Branch    = cpu6502 ? "BPL *" : "JP NS, *";
		BranchNot = cpu6502 ? "BMI *" : "JP S, *";
	}
	else if(W=="V=1" || W=="OVERFLOW")
	{
		Eval = "";
		Branch    = cpu6502 ? "BVS *" : "JP V, *";
		BranchNot = cpu6502 ? "BVC *" : "JP NV, *";
	}
	else if(W=="V=0" || W=="NOT OVERFLOW")
	{
		Eval = "";
		Branch    = cpu6502 ? "BVC *" : "JP NV, *";
		BranchNot = cpu6502 ? "BVS *" : "JP V, *";
   }
   
   if(BranchNot !== "") 
   {
      return { Eval, BranchNot, Branch };      
   }

	let Register: string = "";
	let Operator: string = "";
	let Operand: string = "";

   W = Trim(W);

        if(W.AnsiPos(">=")>0) { Operator = ">="; let G = GetToken(W, Operator); Register = G.Token; Operand = G.Rest; }
   else if(W.AnsiPos("<=")>0) { Operator = "<="; let G = GetToken(W, Operator); Register = G.Token; Operand = G.Rest; }
   else if(W.AnsiPos("<>")>0) { Operator = "<>"; let G = GetToken(W, Operator); Register = G.Token; Operand = G.Rest; }
   else if(W.AnsiPos("!=")>0) { Operator = "!="; let G = GetToken(W, Operator); Register = G.Token; Operand = G.Rest; }
   else if(W.AnsiPos("==")>0) { Operator = "=="; let G = GetToken(W, Operator); Register = G.Token; Operand = G.Rest; }
   else if(W.AnsiPos("=") >0) { Operator = "=";  let G = GetToken(W, Operator); Register = G.Token; Operand = G.Rest; }
   else if(W.AnsiPos(">") >0) { Operator = ">";  let G = GetToken(W, Operator); Register = G.Token; Operand = G.Rest; }
   else if(W.AnsiPos("<") >0) { Operator = "<";  let G = GetToken(W, Operator); Register = G.Token; Operand = G.Rest; }
   else if(W.AnsiPos("IS")>0) { Operator = "IS"; let G = GetToken(W, Operator); Register = G.Token; Operand = G.Rest; }

   Operand = Trim(Operand);

   Register = UpperCase(Trim(Register));

   if(cpu6502) 
   {
      if(Operator=="IS")
      {         
         if(usinga) Eval = "LDA "+Register+"§";
         if(usingx) Eval = "LDX "+Register+"§";
         if(usingy) Eval = "LDY "+Register+"§";
         if(Operand=="ZERO")         { Operator = "=="; }
         if(Operand=="NOT ZERO")     { Operator = "!="; }
         if(Operand=="NEGATIVE")     { Operator = "<";  signedcond = true; }
         if(Operand=="NOT NEGATIVE") { Operator = ">="; signedcond = true; }
         // TODO positive?
      }
      else
      {
              if(Register=="A") Eval = "CMP "+Operand;
         else if(Register=="X") Eval = "CPX "+Operand;
         else if(Register=="Y") Eval = "CPY "+Operand;
         else
         {
            if(usinga) { Eval = "LDA "+Register+"§"; Eval1 = "\tCMP "+Operand; }
            if(usingx) { Eval = "LDX "+Register+"§"; Eval1 = "\tCPX "+Operand; }
            if(usingy) { Eval = "LDY "+Register+"§"; Eval1 = "\tCPY "+Operand; }
         }
      }
   }

   if(cpuz80) 
   {      
      if(Operator=="IS")
      {
         /*
         Operand = Trim(Operand);
         if(usinga) Eval = "LDA "+Register+"§";
         if(usingx) Eval = "LDX "+Register+"§";
         if(usingy) Eval = "LDY "+Register+"§";
         if(Operand=="ZERO")         { Operator = "=="; }
         if(Operand=="NOT ZERO")     { Operator = "!="; }
         if(Operand=="NEGATIVE")     { Operator = "<";  signedcond = true; }
         if(Operand=="NOT NEGATIVE") { Operator = ">="; signedcond = true; }
         // TODO positive?
         */
         throw "not implemented";
      }
      else
      {
              if(Register=="A") Eval = "CP A,"+Operand;
         else if(Register=="B") Eval = "CP B,"+Operand;
         else if(Register=="C") Eval = "CP C,"+Operand;
         else if(Register=="D") Eval = "CP D,"+Operand;
         else if(Register=="E") Eval = "CP E,"+Operand;
         else if(Register=="H") Eval = "CP H,"+Operand;
         else if(Register=="L") Eval = "CP L,"+Operand;
         /*
         else
         {
            if(usinga) Eval = "LDA "+Register+"§\tCMP "+Operand;
            if(usingx) Eval = "LDX "+Register+"§\tCPX "+Operand;
            if(usingy) Eval = "LDY "+Register+"§\tCPY "+Operand;
         }
         */
      }
   }
   
   if(cpu6502) 
   {
      let cmp_not_needed = false;

           if(Operator=="!=") { Branch = "BNE *"; BranchNot = "BEQ *"; cmp_not_needed = true; }
      else if(Operator=="<>") { Branch = "BNE *"; BranchNot = "BEQ *"; cmp_not_needed = true; }
      else if(Operator=="==") { Branch = "BEQ *"; BranchNot = "BNE *"; cmp_not_needed = true; }
      else if(Operator=="=")  { Branch = "BEQ *"; BranchNot = "BNE *"; cmp_not_needed = true; }
      else if(Operator==">=" && signedcond==false) { Branch = "BCS *";           BranchNot = "BCC *";           }
      else if(Operator=="<=" && signedcond==false) { Branch = "BCC *§\tBEQ *";   BranchNot = "BEQ .+4§\tBCS *"; }
      else if(Operator=="<"  && signedcond==false) { Branch = "BCC *";           BranchNot = "BCS *";           }
      else if(Operator==">"  && signedcond==false) { Branch = "BEQ .+4§\tBCS *"; BranchNot = "BCC *§\tBEQ *";   }
      else if(Operator==">=" && signedcond==true ) { Branch = "BPL *";           BranchNot = "BMI *";             cmp_not_needed = true; }
      else if(Operator=="<=" && signedcond==true ) { Branch = "BMI *§\tBEQ *";   BranchNot = "BEQ .+4§\tBPL *";   cmp_not_needed = true; }
      else if(Operator=="<"  && signedcond==true ) { Branch = "BMI *";           BranchNot = "BPL *";             cmp_not_needed = true; }
      else if(Operator==">"  && signedcond==true ) { Branch = "BEQ .+4§\tBPL *"; BranchNot = "BMI *§\tBEQ *";     cmp_not_needed = true; }
      else Operator = "#";

      if(Operand.startsWith("#") && cmp_not_needed && Eval1 !== "") 
      {
         const expr = notequal(parens(RemoveHash(Operand)),"0");
         Eval1 = `§#IF ${expr}§${Eval1}§#ENDIF§`;
      }
      Eval = Eval + Eval1;
   }
   else if(cpuz80) 
   {
           if(Operator=="!=") { Branch = "JR NZ,*"; BranchNot = "JR Z,*"; }
      else if(Operator=="<>") { Branch = "JR NZ,*"; BranchNot = "JR Z,*"; }
      else if(Operator=="==") { Branch = "JR Z,*";  BranchNot = "JR NZ,*"; }
      else if(Operator=="=")  { Branch = "JR Z,*";  BranchNot = "JR NZ,*"; }
      else if(Operator==">=" && signedcond==false) { Branch = "JR C, *";             BranchNot = "JR NC,*"; }
      else if(Operator=="<=" && signedcond==false) { Branch = "JR NC, *§\tJR Z, *";  BranchNot = "JR Z, .+4§\tJR C, *"; }
      else if(Operator=="<"  && signedcond==false) { Branch = "JR NC, *";            BranchNot = "JR C, *"; }
      else if(Operator==">"  && signedcond==false) { Branch = "JR Z, .+4§\tJR C, *"; BranchNot = "JR NC, *§\tJR Z, *"; }
      else if(Operator==">=" && signedcond==true ) { Branch = "JP NS, *";            BranchNot = "JP S, *"; }
      else if(Operator=="<=" && signedcond==true ) { Branch = "JP S, *§\tJR Z, *";   BranchNot = "JR Z, .+4§\tJP NS, *"; }
      else if(Operator=="<"  && signedcond==true ) { Branch = "JP S, *";             BranchNot = "JP NS, *"; }
      else if(Operator==">"  && signedcond==true ) { Branch = "JR Z, .+4§\tJP NS, *";BranchNot = "JP S, *§\tJR Z, *"; }
      else Operator = "#";
   }

   if(Operator=="#")
   {
      error(`not valid condition: ${OriginalW}`);        
   }

    return { Eval, BranchNot, Branch };
}

/*
function IsBitmap(Linea: string,  nl: number): string | undefined
{
   const R = new RegExp(/^\s*bitmap\s+(.+)\s*$/igm);
   const match = R.exec(Linea);
   if(match === null) return undefined;

   const [all, value] = match;

   let Argomento = Trim(value);

   if(Argomento.Length()!=4 && Argomento.Length()!=8)
   {
      error(`invalid BITMAP value: "${Argomento}" linea=${Linea}`);
      return undefined;
   }

   let byteval = String(bitmapToByte(Argomento));

   let ReplaceTo = `   ${BYTE("", byteval)}`;
   return ReplaceTo;
}
*/

/*
function bitmapToByte(bmp: string) 
{
   let byteval = 0;
   if(bmp.Length()==8)
   {
     // mono
     for(let t=1,pos=128;t<=8;t++,pos=pos>>1)
     {
        let c = bmp.CharAt(t);
        if(c!='.' && c!='-' && c!='0')
        {
           byteval = byteval | pos;
        }
     }
   }
   else
   {
     // multicolor 
     for(let t=1,pos=6;t<=4;t++,pos-=2)
     {
        let c = bmp.CharAt(t);
        let code = 0b00;
        
        if(c=='1' || c=='B') code = 0b01;
        if(c=='2' || c=='F') code = 0b10;
        if(c=='3' || c=='A') code = 0b11;

        byteval = byteval | (code<<pos);
     }
   }
   return String(byteval);
}
*/

/*
function IsSprite(Linea: string,  nl: number): string | undefined
{
   const R = new RegExp(/^\s*sprite\s+(.+)\s*$/igm);
   const match = R.exec(Linea);
   if(match === null) return undefined;

   const [all, value] = match;

   let Argomento = Trim(value);

   if(Argomento.Length()!=4*3 && Argomento.Length()!=8*3)
   {
      error(`invalid BITMAP value: "${Argomento}" linea=${Linea}`);
      return undefined;
   }

   if(Argomento.Length() === 8*3)
   {
      let b1 = bitmapToByte(Argomento.substr(0+0*8, 8));
      let b2 = bitmapToByte(Argomento.substr(0+1*8, 8));
      let b3 = bitmapToByte(Argomento.substr(0+2*8, 8));
      let ReplaceTo = `   ${BYTE("", b1, b2, b3)}`;
      return ReplaceTo;
   }

   if(Argomento.Length() === 4*3)
   {
      let b1 = bitmapToByte(Argomento.substr(0+0*4, 4));
      let b2 = bitmapToByte(Argomento.substr(0+1*4, 4));
      let b3 = bitmapToByte(Argomento.substr(0+2*4, 4));
      let ReplaceTo = `   ${BYTE("", b1, b2, b3)}`;
      return ReplaceTo;
   }   
}
*/

/*
import { CBMFloat } from "./cbm_float";

function _IsFloat(Linea: string,  nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let NomeLabel;
   let StringaFloat;
   let Def;

   let ReplaceTo = "";

   let G = GetToken(Linea," "); Linea = G.Rest;
   NomeLabel = Trim(G.Token);
   if(NomeLabel=="FLOAT")
   {
      StringaFloat = NomeLabel;
      NomeLabel = "";
      Def = Linea;
   }
   else
   {
      Linea = Trim(Linea);
      G = GetToken(Linea," "); Linea = G.Rest;
      StringaFloat = Trim(G.Token);
      if(StringaFloat!="FLOAT") return undefined;
      Def = Linea;
   }

   Def = Trim(Def) + ",";

   let list: string[] = [];

   for(;;)
   {
      Def = Trim(Def);
      G = GetToken(Def,","); Def = G.Rest;
      let Numero = Trim(G.Token);
      if(Numero=="") break;
      list.push(Numero);      
   }

   list = list.map(e => {
      const bytes = CBMFloat(Number(e));
      return bytes.join(",");
   });

   ReplaceTo = BYTE(NomeLabel, ...list) ;
   return ReplaceTo;
}
*/

/*
function IsFloat(Linea: string, nl: number): string | undefined
{     
   let result = parseResult(Linea);
   if(result === undefined) return undefined;
   
   if(result.type !== "line") return undefined;
   const node = result.line;

   if(node.type === "float") 
   {
      let ReplaceTo = nodeToString(node);   
      return ReplaceTo;   
   }

   return undefined;
}
*/

function IsMACRO(Linea: string, nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";
 
   let PM;
   let PList: string[] = [];

   let G = GetToken(Linea," "); Linea = G.Rest;
   
   let StringaMacro = G.Token;

   if(StringaMacro != "MACRO") return undefined;  

   G = GetToken(Linea, " "); Linea = G.Rest;

   let NomeMacro = G.Token;      

   // permette il carattere "." nel nome macro
   NomeMacro = NomeMacro.replace(/\./g, "_");
   
   NomeMacro = Trim(NomeMacro)
   if(NomeMacro == "") 
   {
      error("no macro name", nl);
   }

   PM = Linea + ",";

   let NM = NomeMacro;   

   // processa i parametri della macro
   for(;;)
   {
       G = GetToken(PM,","); PM = G.Rest;

       let Dummy = Trim(G.Token);

       if(Dummy=="") break;
       if(Dummy=="CONST")
       {
          PList.push("CONST");
          NM = NM + "_C";
       }
       else if(Dummy=="MEM")
       {
          PList.push("MEM");
          NM = NM + "_M";
       }
       else if(Dummy=="INDIRECT")
       {
          PList.push("INDIRECT");
          NM = NM + "_I";
       }
       else if(Dummy.startsWith('"') && Dummy.endsWith('"'))
       {
          PList.push(Dummy);
          NM = NM + "__" + RemoveQuote(Dummy);
       }
       else
       {
          error("invalid type in MACRO parameter");
       }
   }

   // trova se la macro esiste già
   let matchingMacros = AllMacros.filter(e => {
      if(e.Name !== NomeMacro) return false;
      if(e.Parameters.join(",") !== PList.join(",")) return false;
      return true;
   });

   if(matchingMacros.length != 0)
   {
      let msg = "macro "+NM+" already defined";
      error(msg);
   }

   let ReplaceTo = "   mac "+NM;

   let Code = "";

   // new self extracting MACRO
   if(true) {
      let end_macro_found = false;
      for(let t=nl+1; t<L.Count; t++) {
         const Linea = L.Strings[t];
         if(IsENDMACRO(Linea, t) !== undefined) {
            L.Strings[t] = "";
            ReplaceTo = "";
            end_macro_found = true;
            break;   
         }
         else
         {
            Code += Linea + "§";
            L.Strings[t] = "";
         }
      }
      if(!end_macro_found) error(`end macro not found for ${NM}`);
   }

   // inserisce macro   
   AllMacros.push({ 
      Name: NomeMacro, 
      Id: NM, 
      Parameters: PList, 
      Code 
   });

   return ReplaceTo;
}

function IsENDMACRO(Linea: string, nl: number): string | undefined
{
   const R = new RegExp(/^\s*end\s*macro\s*$/i);
   const match = R.exec(Linea);
   if(match === null) return undefined;
   return "   endm";
}

function IsMacroCall(Linea: string, nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let G = GetToken(Linea," "); Linea = G.Rest;

   let NomeMacro = G.Token;
   let Parametri = Trim(Linea);

   // empty macro
   if(NomeMacro=="") return undefined;

   // permette il carattere "." nel nome macro
   NomeMacro = NomeMacro.replace(/\./g, "_")

   // build plist
   let prm = Linea + ",";
   let orig = Linea;
   let list: string[] = [];
   let actualparms: string[] = [];
   for(;;)
   {              
      G = GetToken(prm, ","); let p = Trim(G.Token); prm = G.Rest;      
      if(p == "") break;
      actualparms.push(p);
      if(p.startsWith("#")) list.push("CONST");
      //else if(p.startsWith("(") && p.endsWith(")")) list.push("INDIRECT");
      else list.push(p);      
   }   

   // filter out macro with different name
   let matchingMacros = AllMacros.filter(e=>e.Name === NomeMacro);
   if(matchingMacros.length === 0) return undefined;

   // filter out macro with different number of parameters
   matchingMacros = matchingMacros.filter(m=>m.Parameters.length === list.length);
   if(matchingMacros.length === 0) return undefined;

   matchingMacros = matchingMacros.filter(m=>isMatchingMacroParameters(m.Parameters, list));
   if(matchingMacros.length === 0) return undefined;

   let foundMacro = matchingMacros[0];

   let ReplaceTo = `   ${foundMacro.Id} ${orig}`;   

   // new self extracting macro
   if(true)
   {      
      let code = foundMacro.Code;      
      for(let t=0; t<actualparms.length; t++) {
         // replace parameters
         const pattern = `\\{${t+1}\\}`;
         const R = new RegExp(pattern, "gmi");
         const param = RemoveHash(actualparms[t]);
         code = code.replace(R, param);

         // replace local labels in macro code                           
         code = code.replace(/\local_label/gmi, Label("LOCAL", nl, "LABEL"));
      }
      ReplaceTo = code;
   }

   // console.log(`ReplaceTo=${ReplaceTo}`);

   return ReplaceTo;
}

function isMatchingMacroParameters(mparms: string[], list: string[]) {
   for(let t=0; t<mparms.length; t++) {
      let macrop = mparms[t];
      let actualp = list[t];      
      if(!isGoodMacroParameter(macrop, actualp)) return false;
   }
   return true;
}

function isGoodMacroParameter(macrop: string, actualp: string) {
   if(`"${actualp}"` === macrop) 
   {
      return true;
   }
   else if(actualp == "CONST") 
   {
      if(macrop == "CONST") return true;
      else return false;
   }
   else if(actualp.startsWith("(") && actualp.endsWith(")")) 
   {
      if(macrop == "INDIRECT") return true;  
      else return false;       
   }
   else
   {
      if(macrop === "MEM") return true;
      else return false;
   }
}

/*
function IsMacroCall(Linea: string, nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let G = GetToken(Linea," "); Linea = G.Rest;

   let NomeMacro = G.Token;
   let Parametri = Trim(Linea);

   // empty macro
   if(NomeMacro=="") return undefined;

   // permette il carattere "." nel nome macro
   NomeMacro = NomeMacro.replace(/\./g, "_")

   let matchingMacros = AllMacros.filter(e=>e.Name === NomeMacro);
   if(matchingMacros.length === 0) return undefined;

   // console.log(`matched macro ${NomeMacro}: ${matchingMacros.length} macros`);

   // build plist
   let prm = Linea + ",";
   let orig = Linea;
   let list: string[] = [];
   let actualparms: string[] = [];

   for(;;)
   {              
      G = GetToken(prm, ","); let p = Trim(G.Token); prm = G.Rest;      
      if(p == "") break;
      actualparms.push(p);
      if(p.startsWith("#")) list.push("CONST");
      else if(p.startsWith("(") && p.endsWith(")")) list.push("INDIRECT");
      else       
           //if(p.startsWith('"') && p.endsWith('"')) list.push(p);
           if(p=="A"||p=="B"||p=="C"||p=="D"||p=="E"||p=="H"||p=="L"||p=="IX"||p=="IY"||p=="X"||p=="Y") list.push(`"${p}"`);      
      else list.push("MEM");       
   }

   const matching = matchingMacros.filter(e=>e.Parameters.join(",") === list.join(","));   

        if(matching.length === 0) return undefined;
   else if(matching.length !== 1) error(`more than on macro matching "${NomeMacro}"`);

   const foundMacro = matching[0];
   let ReplaceTo = `   ${foundMacro.Id} ${orig}`;   

   // new self extracting macro
   if(true)
   {      
      let code = foundMacro.Code;      
      for(let t=0; t<actualparms.length; t++) {
         // replace parameters
         const pattern = `\\{${t+1}\\}`;
         const R = new RegExp(pattern, "gmi");
         const param = RemoveHash(actualparms[t]);
         code = code.replace(R, param);

         // replace local labels in macro code                           
         code = code.replace(/\local_label/gmi, Label("LOCAL", nl, "LABEL"));
      }
      ReplaceTo = code;
   }

   return ReplaceTo;
}
*/

function IsSUB(Linea: string, nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let StringaSUB = GetParm(Linea, " ", 0);

   if(StringaSUB!="SUB") return undefined;

   let NomeSub = Trim(GetParm(Linea, " ", 1));

   // impone terminazione con ()
   if(!NomeSub.endsWith("()")) return undefined;

   NomeSub = NomeSub.SubString(1,NomeSub.Length()-2);

   let ReplaceTo = NomeSub+":";
   StackSub.Add(nl);   
   return ReplaceTo;
}

function IsEXITSUB(Linea: string, nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let StringaREPEAT;

   let G = GetToken(Linea," THEN EXIT SUB");
   Linea = G.Rest;
   StringaREPEAT = G.Token;
   if(StringaREPEAT!="")
   {
        if(StackSub.IsEmpty) error("not in SUB");
        nl = StackSub.Last();
        let ReplaceTo = StringaREPEAT + " THEN GOTO "+Label("SUB",nl,"END");
        return ReplaceTo;
   }

   G = GetToken(Linea," ");
   Linea = G.Rest;   
   StringaREPEAT = G.Token;
   let ReplaceTo = "   rts";
   if(StringaREPEAT=="EXITSUB") return ReplaceTo;
   if(StringaREPEAT=="EXIT")
   {
      G = GetToken(Linea," ");
      StringaREPEAT = G.Token;
      if(StringaREPEAT=="SUB") return ReplaceTo;
   }
   return undefined;
}

function IsENDSUB(Linea: string, nl: number): string | undefined
{
   Linea = UpperCase(Trim(Linea))+" ";

   let StringaEndMacro  = GetParm(Linea, " ", 0);
   let StringaEndMacro1 = GetParm(Linea, " ", 1);

   if(StringaEndMacro=="ENDSUB" || (StringaEndMacro=="END" && StringaEndMacro1=="SUB"))
   {
      if(StackSub.Count-1<0) {
         error("SUB without END SUB");
      }

      nl = StackSub.Pop();

      let Lab = Label("SUB",nl,"END")+":§";
      let ReplaceTo = Lab+"   rts";
      
      return ReplaceTo;
   }

   return undefined;
}

/*
// old code without parser
// const id = value
function _IsConst(Linea: string, nl: number): string | undefined
{      
   const R = new RegExp(/\s*const\s+([_a-zA-Z0-9]+[_a-zA-Z0-9]*)\s+=\s+(.*)/gmi);
   const match = R.exec(Linea);

   if(match === null) return undefined;

   const [ all, id, value ] = match;

   return `${id} = ${value}`;
}
*/

import nearley from "nearley";
import { Node, nodeToString } from "./node_all";

const const_grammar = require("./const");

function parseResult(Linea: string) 
{
   let ans;

   try 
   {
      let const_parser = new nearley.Parser(const_grammar.ParserRules, const_grammar.ParserStart)
      ans = const_parser.feed(Linea);          
   }
   catch(ex)
   {
      // parse error
      //console.log(ex);
      return undefined;
   }

   // check no result
   if(ans.results.length === 0) return undefined;

   return ans.results[0] as Node;       
}

/*
function IsConst(Linea: string, nl: number): string | undefined
{     
   let result = parseResult(Linea);
   if(result === undefined) return undefined;
   
   if(result.type !== "line") return undefined;
   const node = result.line;

   if(node.type === "const") 
   {
      let ReplaceTo = nodeToString(node);   
      return ReplaceTo;   
   }

   return undefined;
}
*/

// const
// float
// bitmap
// sprite

function IsCombined(Linea: string, nl: number): string | undefined
{     
   let result = parseResult(Linea);
   if(result === undefined) return undefined;
   
   if(result.type !== "line") return undefined;
   const node = result.line;

   if(node.type === "const" || node.type === "float" || node.type === "bitmap" || node.type === "sprite") 
   {
      let ReplaceTo = nodeToString(node);   
      return ReplaceTo;   
   }

   return undefined;
}

//---------------------------------------------------------------------------


main();


/*
Grammar:

- comment
- include
- #ifdef, #ifndef, #if #else #endif
- directives (org, processor)
- basic start/end
- sub/end sub
- macro/endmacro
- const id = expr
- id = expr
- do loop/for next/repeat until/exit do/for/repeat 
- continue?
- if then else
- [label:] mnmemoic [args [, ...]]
- [label:] byte [...]
- [label:] word [...]
- [label:] bitmap [...]
- [label:] float [...]

*/
