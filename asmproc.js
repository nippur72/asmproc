#!/usr/bin/env node
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var command_line_args_1 = __importDefault(require("command-line-args"));
function parseOptions(optionDefinitions) {
    try {
        return command_line_args_1.default(optionDefinitions);
    }
    catch (ex) {
        console.log(ex.message);
        process.exit(-1);
    }
}
var TStack = /** @class */ (function () {
    function TStack() {
        this.Strings = [];
    }
    Object.defineProperty(TStack.prototype, "Count", {
        get: function () {
            return this.Strings.length;
        },
        enumerable: true,
        configurable: true
    });
    TStack.prototype.Add = function (s) {
        this.Strings.push(s);
    };
    TStack.prototype.Pop = function () {
        if (this.Strings.length === 0)
            throw "stack empty";
        return this.Strings.pop();
    };
    TStack.prototype.Last = function () {
        return this.Strings[this.Strings.length - 1];
    };
    Object.defineProperty(TStack.prototype, "IsEmpty", {
        get: function () {
            return this.Strings.length === 0;
        },
        enumerable: true,
        configurable: true
    });
    return TStack;
}());
var TStringList = /** @class */ (function (_super) {
    __extends(TStringList, _super);
    function TStringList() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TStringList.prototype.SaveToFile = function (fname) {
        var content = this.Text();
        fs_1.default.writeFileSync(fname, content);
    };
    TStringList.prototype.LoadFromFile = function (fname) {
        var text = fs_1.default.readFileSync(fname).toString();
        this.SetText(text);
    };
    TStringList.prototype.Text = function () {
        return this.Strings.join("\n");
    };
    TStringList.prototype.SetText = function (text) {
        this.Strings = text.split("\n");
    };
    return TStringList;
}(TStack));
exports.TStringList = TStringList;
function ChangeFileExt(name, ext) {
    // taken from https://stackoverflow.com/questions/5953239/how-do-i-change-file-extension-with-javascript
    return name.replace(/\.[^\.]+$/, ext);
}
function FileExists(name) {
    return fs_1.default.existsSync(name);
}
function RemoveQuote(S) {
    return S.substr(1, S.length - 2);
}
function RemoveHash(S) {
    if (S.startsWith("#"))
        return S.substr(1);
    else
        return S;
}
String.prototype.AnsiPos = function (text) {
    var pos = this.indexOf(text);
    return pos + 1; // Borland strings are 1-based
};
String.prototype.SubString = function (start, count) {
    // Borland strings are 1-based
    return this.substr(start - 1, count);
};
String.prototype.Length = function () {
    return this.length;
};
String.prototype.ToInt = function () {
    return Number(this);
};
String.prototype.CharAt = function (index) {
    // Borland strings are 1-based
    return this.charAt(index - 1);
};
String.prototype.CharCodeAt = function (index) {
    // Borland strings are 1-based
    return this.charCodeAt(index - 1);
};
String.prototype.SetCharAt = function (index, chr) {
    // Borland strings are 1-based
    if (index - 1 > this.length - 1)
        return this;
    return this.substr(0, index - 1) + chr + this.substr(index - 1 + 1);
};
var L = new TStringList();
var StackIf;
var StackRepeat;
var StackDo;
var StackWhile;
var StackFor;
var StackSub;
var StackIf_U = new TStringList();
var StackFor_U = new TStringList();
var AllMacros = [];
var Ferr;
var Dims = [];
function emitConstDim(t) {
    L.SetText(L.Text().replace(/§/g, "\n"));
}
var cross_1 = require("./cross");
var utils_1 = require("./utils");
var basic_1 = require("./basic");
var defines;
function error(msg, cline) {
    if (cline !== undefined) {
        error(msg + " in line " + cline + " of " + Ferr);
        return;
    }
    msg = "? " + msg;
    console.log("" + msg);
    if (Ferr != "")
        L.SaveToFile(Ferr);
    process.exit(-1);
}
exports.error = error;
function main() {
    var options = parseOptions([
        { name: 'input', alias: 'i', type: String },
        { name: 'output', alias: 'o', type: String },
        { name: 'target', alias: 't', type: String, defaultValue: 'dasm' },
        { name: 'define', alias: 'd', type: String }
    ]);
    if (options === undefined || options.input === undefined || options.output === undefined) {
        console.log("Usage: asmproc -i <inputfile> -o <outputfile>");
        process.exit(-1);
        return;
    }
    // set target
    cross_1.target.dasm = options.target === "dasm";
    cross_1.target.ca65 = options.target === "ca65";
    cross_1.target.z80asm = options.target === "z80asm";
    cross_1.target.cpu6502 = cross_1.target.dasm || cross_1.target.ca65;
    cross_1.target.cpuz80 = cross_1.target.z80asm;
    defines = options.define === undefined ? [] : options.define.split(",");
    L = new TStringList();
    var FName = options.input;
    var FOut = options.output;
    Ferr = ChangeFileExt(FOut, ".err");
    if (FName == FOut) {
        error("file names must be different");
    }
    if (!FileExists(FName)) {
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
    console.log("asmproc OK, created: \"" + FOut + "\"");
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
function RemoveComments() {
    // remove C comments
    var Whole = L.Text();
    var x, y;
    for (;;) {
        x = Whole.AnsiPos("/*");
        if (x == 0)
            break;
        y = Whole.AnsiPos("*/");
        if (y < x) {
            error("unmatched /* */ comment");
        }
        for (var t = x; t <= y + 1; t++) {
            var c = Whole.CharCodeAt(t);
            if (c != 13 && c != 10)
                Whole = Whole.SetCharAt(t, ' ');
        }
    }
    L.SetText(Whole);
    // remove // comments   
    for (var t = 0; t < L.Count; t++) {
        var R = new RegExp(/(.*)\/\/(?=(?:[^"]*"[^"]*")*[^"]*$)(.*)/gmi);
        var Linea = L.Strings[t];
        var match = R.exec(Linea);
        if (match !== null) {
            var all = match[0], purged = match[1], comment = match[2];
            L.Strings[t] = purged;
        }
    }
    // remove ; comments   
    var inbasic = false;
    for (var t = 0; t < L.Count; t++) {
        var R = new RegExp(/(.*);(?=(?:[^"]*"[^"]*")*[^"]*$)(.*)/gmi);
        var Linea = L.Strings[t];
        var match = R.exec(Linea);
        if (match !== null) {
            var all = match[0], purged = match[1], comment = match[2];
            // special case of ; comment in BASIC START / BASIC END
            if (basic_1.IsBasicStart(purged)) {
                inbasic = true;
                L.Strings[t] = purged;
            }
            else if (basic_1.IsBasicEnd(purged)) {
                inbasic = false;
                L.Strings[t] = purged;
            }
            if (!inbasic)
                L.Strings[t] = purged;
        }
        else {
            if (basic_1.IsBasicStart(Linea))
                inbasic = true;
            if (basic_1.IsBasicEnd(Linea))
                inbasic = false;
        }
    }
}
function ModOperator() {
    // transform MOD   
    for (var t = 0; t < L.Count; t++) {
        while (true) {
            var R = new RegExp(/(.*)\sMOD\s(?=(?:[^"]*"[^"]*")*[^"]*$)(.*)/gmi);
            var Linea = L.Strings[t];
            var match = R.exec(Linea);
            if (match !== null) {
                var all = match[0], left = match[1], right = match[2];
                L.Strings[t] = cross_1.MOD(left, right);
            }
            else
                break;
        }
    }
}
function ResolveInclude() {
    for (var t = 0; t < L.Count; t++) {
        var Linea = L.Strings[t];
        var R = new RegExp(/\s*include(\s+binary)?\s+\"(.*)\"\s*/ig);
        var match = R.exec(Linea);
        if (match !== null) {
            var all = match[0], binary = match[1], nomefile = match[2];
            if (!FileExists(nomefile)) {
                error("include file \"" + nomefile + "\" not found", t);
            }
            var file = fs_1.default.readFileSync(nomefile);
            var content = void 0;
            if (binary !== undefined)
                content = " byte " + Array.from(file).map(function (e) { return String(e); }).join(",");
            else
                content = file.toString();
            L.Strings[t] = content;
            return true;
        }
    }
    return false;
}
/*
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
*/
function IsIdentifier(s) {
    var R = new RegExp(/^\s*[_a-zA-Z]+[_a-zA-Z0-9]*$/gmi);
    var match = R.exec(s);
    if (match === null)
        return false;
    return true;
}
function RemoveColon() {
    // remove : colon
    for (var t = 0; t < L.Count; t++) {
        while (true) {
            var Linea = L.Strings[t];
            var R = new RegExp(/(.*):(?=(?:[^"]*"[^"]*")*[^"]*$)(.*)/gmi);
            var match = R.exec(Linea);
            if (match !== null) {
                var all = match[0], leftpart = match[1], rightpart = match[2];
                if (IsIdentifier(leftpart))
                    break;
                L.Strings[t] = leftpart + "\u00A7   " + rightpart;
            }
            else
                break;
        }
    }
}
function MakeAllUpperCase() {
    var Whole = L.Text();
    L.SetText(utils_1.UpperCase(Whole));
}
// dim x as byte
// dim x as integer
// dim x as byte at $3000
// dim x as byte in zero page
// dim x as byte init 5
function IsDim(Linea, nl) {
    var R = new RegExp(/\s*dim\s+([_a-zA-Z]+[_a-zA-Z0-9]*)\s+as\s+(byte|word|integer|char)((\s+at\s+(.*))|(\s+in\s+zero\s+page)|(\s+init)\s+(.*))?\s*/i);
    var match = R.exec(Linea);
    if (match === null)
        return undefined;
    var all = match[0], id = match[1], tipo = match[2], part = match[3], atstring = match[4], atvalue = match[5], zeropage = match[6], initstring = match[7], initvalue = match[8];
    var Result = "";
    if (atstring !== undefined)
        Result = "const " + id + " = " + atvalue;
    else if (zeropage !== undefined)
        throw "not implemented";
    else if (initvalue !== undefined)
        Dims.push(id + " " + tipo + " " + initvalue);
    else
        Dims.push(id + " " + tipo + " 0");
    return Result;
}
function IsIFDEFIncludeSingle(Linea, nl) {
    // "_ #ifdef _ {cond} _ then _ include {file}";
    var R = new RegExp(/\s*#ifdef\s+([_a-zA-Z]+[_a-zA-Z0-9]*)\s+then\s+include\s+(.*)/i);
    var match = R.exec(Linea);
    if (match === null)
        return undefined;
    var all = match[0], id = match[1], includeFile = match[2];
    var upperDefines = defines.map(function (e) { return e.toUpperCase(); });
    var upperId = id.toUpperCase();
    var defined = upperDefines.indexOf(upperId) !== -1;
    var Result = defined ? "include " + includeFile : "";
    return Result;
}
// spezza su piu linee #IFDEF / #IFNDEF su singola linea 
function IsIFDEFSingle(Linea, nl) {
    // "_ #ifdef|#ifndef _ {cond} _ then {statement}";
    var R = new RegExp(/\s*(#ifdef|#ifndef)\s+(.*)\s+then\s+(.*)/i);
    var match = R.exec(Linea);
    if (match === null)
        return undefined;
    var all = match[0], ifdef = match[1], cond = match[2], statement = match[3];
    return ifdef + " " + cond + "\u00A7   " + statement + "\u00A7#ENDIF";
}
// change assembler reserved keywords
function IsReservedKeywords(Linea, nl) {
    Linea = utils_1.Trim(Linea);
    if (Linea.startsWith("#")) {
        if (cross_1.target.dasm || cross_1.target.z80asm) {
            Linea = Linea.replace("#IFDEF", "IFCONST");
            Linea = Linea.replace("#IFNDEF", "IFNCONST");
            Linea = Linea.replace("#IF", "IF");
            Linea = Linea.replace("#ELSE", "ELSE");
            Linea = Linea.replace("#ENDIF", "ENDIF");
            //Linea = Linea.replace("#INCLUDE","INCLUDE");
            var ReplaceTo = " " + Linea;
            return ReplaceTo;
        }
        else if (cross_1.target.ca65) {
            Linea = Linea.replace("#IFDEF", ".IFDEF");
            Linea = Linea.replace("#IFNDEF", ".IFNDEF");
            Linea = Linea.replace("#IF", ".IF");
            Linea = Linea.replace("#ELSE", ".ELSE");
            Linea = Linea.replace("#ENDIF", ".ENDIF");
            //Linea = Linea.replace("#INCLUDE","INCLUDE");
            var ReplaceTo = " " + Linea;
            return ReplaceTo;
        }
    }
    return undefined;
}
function RemoveCommentInclude() {
    for (;;) {
        RemoveComments();
        RemoveIfDefIncludeSingle();
        var hasinclude = ResolveInclude();
        if (!hasinclude)
            break;
    }
}
function RemoveIfDefIncludeSingle() {
    // substitute DASM IF THEN on single line
    for (var t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = IsIFDEFIncludeSingle(Dummy, t);
        if (ReplaceTo !== undefined) {
            L.Strings[t] = ReplaceTo;
        }
    }
}
function RemoveIfDefSingle() {
    // substitute DASM IF THEN on single line
    for (var t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = IsIFDEFSingle(Dummy, t);
        if (ReplaceTo !== undefined) {
            L.Strings[t] = ReplaceTo;
        }
    }
}
function ProcessFile() {
    var t;
    RemoveCommentInclude();
    // remove \r new lines and tabs
    L.SetText(L.Text().replace(/\r/g, ""));
    L.SetText(L.Text().replace(/\t/g, "   "));
    // scan for basic, needs to be done first before of semicolon replacement
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = basic_1.IsBasic(L, Dummy, t);
        // IsBasic does replace by itself
        // if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;        
    }
    ModOperator();
    RemoveColon();
    MakeAllUpperCase();
    RemoveIfDefSingle();
    // change § into newlines (needed for DASM IF-THENs)   
    L.SetText(L.Text().replace(/§/g, "\n"));
    // self modifying labels
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = void 0;
        ReplaceTo = IsSelfModLabel(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
    }
    // scan for sub...end sub, need before macro to avoid conflicts with "sub"
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = void 0;
        ReplaceTo = IsSUB(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsEXITSUB(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsENDSUB(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
    }
    if (!StackSub.IsEmpty)
        error("SUB without END SUB");
    // pre-process macros and build macro list   
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = void 0;
        ReplaceTo = IsMACRO(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsENDMACRO(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
    }
    substitute_macro(L);
    // scan for repeat ... until then
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = void 0;
        ReplaceTo = IsREPEAT(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsEXITREPEAT(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsUNTIL(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
    }
    if (!StackRepeat.IsEmpty)
        error("REPEAT without UNTIL");
    // scan for do ... loop then
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = void 0;
        ReplaceTo = IsDO(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsEXITDO(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsLOOP(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
    }
    if (!StackDo.IsEmpty)
        error("DO without LOOP");
    // scan for while ... wend then
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = void 0;
        ReplaceTo = IsWHILE(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsEXITWHILE(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsWEND(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
    }
    if (!StackWhile.IsEmpty)
        error("WHILE without WEND");
    // scan for for ... next then
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = void 0;
        ReplaceTo = IsFOR(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsEXITFOR(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsNEXT(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
    }
    if (!StackFor.IsEmpty)
        error("FOR without NEXT");
    // scan for on single line: "if then <statement>"
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = void 0;
        ReplaceTo = IsIFSINGLE(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
    }
    // change § into newlines (needed after IF-THEN <statement>)
    L.SetText(L.Text().replace(/§/g, "\n"));
    // do another macro substitition for macro in if-single
    substitute_macro(L);
    // scan for if then
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = void 0;
        ReplaceTo = IsIF(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsENDIF(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
        ReplaceTo = IsELSE(Dummy, t);
        if (ReplaceTo !== undefined) {
            L.Strings[t] = ReplaceTo;
            StackIf_U.Pop();
            StackIf_U.Add("true");
        }
    }
    if (!StackIf.IsEmpty)
        error("malformed IF");
    // substitute DIM (before const)
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = IsDim(Dummy, t);
        if (ReplaceTo !== undefined) {
            L.Strings[t] = ReplaceTo;
        }
    }
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
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = IsCombined(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
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
    var definecode = defines.map(function (e) {
        var R = new RegExp(/\s*([_a-zA-Z]+[_a-zA-Z0-9]*)(\s*=\s*(.*))?\s*/ig);
        var match = R.exec(e);
        if (match != null) {
            var all = match[0], id = match[1], eqpart = match[2], value = match[3];
            if (value !== undefined)
                return cross_1.define(id, value);
            else
                return cross_1.define(id, "1");
        }
        else
            return "";
    }).join("§");
    L.Strings[0] = definecode + L.Strings[0];
    // add global variables created with DIM
    L.Add(Dims.join("§"));
    Dims = [];
    // change § into newlines
    L.SetText(L.Text().replace(/§/g, "\n"));
    // substitute reserved keywords
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = IsReservedKeywords(Dummy, t);
        if (ReplaceTo !== undefined) {
            L.Strings[t] = ReplaceTo;
        }
    }
}
function Label(Header, nr, suffix) {
    return Header + "_" + nr + "_" + suffix;
}
function substitute_macro(L) {
    // substitute macros. substitution is repeated until all macro are expanded (recursively)
    var replaced;
    do {
        replaced = false;
        for (var t = 0; t < L.Count; t++) {
            var Dummy = L.Strings[t];
            var ReplaceTo = IsMacroCall(Dummy, t);
            if (ReplaceTo !== undefined) {
                L.Strings[t] = ReplaceTo;
                replaced = true;
            }
        }
        // change § into newlines (needed for macros)   
        L.SetText(L.Text().replace(/§/g, "\n"));
    } while (replaced);
}
function IsIFSINGLE(Linea, nl) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var StringaIF;
    var StringaCond;
    var StringaAfterThen;
    var G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    StringaIF = G.Token;
    if (StringaIF != "IF")
        return undefined;
    G = utils_1.GetToken(Linea, " THEN");
    Linea = G.Rest;
    StringaCond = G.Token;
    if (StringaCond == "")
        return undefined;
    Linea = utils_1.Trim(Linea);
    var LastPart = Linea;
    G = utils_1.GetToken(Linea + " ", " ");
    Linea = G.Rest;
    StringaAfterThen = utils_1.Trim(G.Token);
    if (StringaAfterThen == "")
        return undefined; // if composto
    if (StringaAfterThen == "GOTO")
        return undefined; // if then goto
    // if <cond> then <statement>
    var ReplaceTo = " IF " + StringaCond + " THEN \u00A7 " + LastPart + " \u00A7 END IF\u00A7 ";
    return ReplaceTo;
}
function IsIF(Linea, nl) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var StringaIF;
    var StringaCond;
    var StringaAfterThen;
    var G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    StringaIF = G.Token;
    if (StringaIF != "IF")
        return undefined;
    G = utils_1.GetToken(Linea, " THEN");
    Linea = G.Rest;
    StringaCond = G.Token;
    if (StringaCond == "")
        return undefined;
    Linea = utils_1.Trim(Linea);
    G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    StringaAfterThen = utils_1.Trim(G.Token);
    var ReplaceTo = "";
    if (StringaAfterThen == "GOTO") {
        // if then goto
        var _a = ParseCond(StringaCond), Eval_1 = _a.Eval, BranchNot_1 = _a.BranchNot, Branch_1 = _a.Branch;
        var Lab_1 = Linea;
        Branch_1 = Branch_1.replace(/\*/g, Lab_1);
        ReplaceTo = "";
        if (Eval_1 != "")
            ReplaceTo = ReplaceTo + "\t" + Eval_1 + "§";
        ReplaceTo = ReplaceTo + "\t" + Branch_1;
        return ReplaceTo;
    }
    // if composto
    StackIf.Add(nl);
    StackIf_U.Add("false");
    var _b = ParseCond(StringaCond), Eval = _b.Eval, BranchNot = _b.BranchNot, Branch = _b.Branch;
    var Lab = Label("IF", nl, "ELSE");
    BranchNot = BranchNot.replace(/\*/g, Lab);
    ReplaceTo = Label("IF", nl, "START") + ":§";
    if (Eval != "")
        ReplaceTo = ReplaceTo + "\t" + Eval + "§";
    ReplaceTo = ReplaceTo + "\t" + BranchNot;
    return ReplaceTo;
}
function IsENDIF(Linea, nl) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    var StringaENDIF = G.Token;
    if (StringaENDIF != "ENDIF" && !(StringaENDIF == "END" && Linea == "IF "))
        return undefined;
    if (StackIf.IsEmpty) {
        error("ENDIF without IF", nl);
        process.exit(-1);
    }
    var ReplaceTo = "";
    var n = StackIf.Pop();
    var cond = StackIf_U.Pop();
    if (cond == "false")
        ReplaceTo = Label("IF", n, "ELSE") + ":§";
    ReplaceTo = ReplaceTo + Label("IF", n, "END") + ":";
    return ReplaceTo;
}
function IsELSE(Linea, n) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    var StringaELSE = G.Token;
    if (StringaELSE != "ELSE")
        return undefined;
    if (StackIf.IsEmpty) {
        error("ELSE without IF", n);
    }
    var nl = StackIf.Last();
    var ReplaceTo = "\t" + cross_1.Jump(Label("IF", nl, "END")) + "§" + Label("IF", nl, "ELSE") + ":";
    return ReplaceTo;
}
function IsREPEAT(Linea, nl) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var StringaREPEAT = utils_1.GetParm(Linea, " ", 0);
    if (StringaREPEAT != "REPEAT")
        return undefined;
    StackRepeat.Add(nl);
    var ReplaceTo = Label("REPEAT", nl, "START") + ":";
    return ReplaceTo;
}
function IsSelfModLabel(Linea, nl) {
    var R = new RegExp(/^(.*)\*\*([_a-zA-Z]+[_a-zA-Z0-9]*)(?:\((.*)\))?(.*)$/gmi);
    var match = R.exec(Linea);
    if (match !== null) {
        var all = match[0], leftside = match[1], varname = match[2], varparm = match[3], rightside = match[4];
        var arg = (varparm === undefined || varparm === "") ? "$0000" : varparm;
        var ReplaceTo = varname + " = _" + varname + "+1 \u00A7_" + varname + ":" + leftside + " " + arg + rightside;
        return ReplaceTo;
    }
}
function IsEXITREPEAT(Linea, nl) {
    // CASE 1: turns "IF cond THEN EXIT REPEAT" into "IF cond THEN GOTO REPEAT_n_END"
    var R = new RegExp(/^(.*)\s+then\s+exit\s+repeat\s*$/i);
    var match = R.exec(Linea);
    if (match !== null) {
        if (StackRepeat.IsEmpty)
            error("not in REPEAT", nl);
        var n = StackRepeat.Last();
        var all = match[0], first = match[1], then = match[2];
        var label = Label("REPEAT", n, "END");
        var ReplaceTo = first + " THEN GOTO " + label;
        return ReplaceTo;
    }
    // CASE 2: turns "EXIT REPEAT" into "JMP"
    R = new RegExp(/^(\s*)exit\s+repeat\s*$/i);
    match = R.exec(Linea);
    if (match !== null) {
        if (StackRepeat.IsEmpty)
            error("not in REPEAT", nl);
        var n = StackRepeat.Last();
        var label = Label("REPEAT", n, "END");
        var all = match[0], spaces = match[1], exit_repeat = match[2];
        var ReplaceTo = "" + spaces + cross_1.Jump(label);
        return ReplaceTo;
    }
}
function IsUNTIL(Linea, n) {
    Linea = utils_1.Trim(Linea);
    var G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    var StringaUNTIL = G.Token;
    var StringaCond = utils_1.Trim(Linea);
    if (StringaCond == "")
        return undefined;
    if (utils_1.UpperCase(StringaUNTIL) != "UNTIL")
        return undefined;
    if (StackRepeat.Count - 1 < 0) {
        error("UNTIL without REPEAT", n);
    }
    var nl = StackRepeat.Pop();
    var _a = ParseCond(StringaCond), Eval = _a.Eval, BranchNot = _a.BranchNot, Branch = _a.Branch;
    var Lab = Label("REPEAT", nl, "START");
    BranchNot = BranchNot.replace(/\*/g, Lab);
    var ReplaceTo = "";
    if (Eval != "")
        ReplaceTo = ReplaceTo + "\t" + Eval + "§";
    ReplaceTo = ReplaceTo + "\t" + BranchNot;
    ReplaceTo = ReplaceTo + "§" + Label("REPEAT", nl, "END") + ":§";
    return ReplaceTo;
}
function IsDO(Linea, nl) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var StringaDO = utils_1.GetParm(Linea, " ", 0);
    if (StringaDO != "DO")
        return undefined;
    StackDo.Add(nl);
    var ReplaceTo = Label("DO", nl, "START") + ":";
    return ReplaceTo;
}
function IsEXITDO(Linea, nl) {
    // CASE 1: turns "IF cond THEN EXIT DO" into "IF cond THEN GOTO DO_n_END"
    var R = new RegExp(/^(.*)\s+then\s+exit\s+do\s*$/i);
    var match = R.exec(Linea);
    if (match !== null) {
        if (StackDo.IsEmpty)
            error("not in DO", nl);
        var n = StackDo.Last();
        var all = match[0], first = match[1], then = match[2];
        var label = Label("DO", n, "END");
        var ReplaceTo = first + " THEN GOTO " + label;
        return ReplaceTo;
    }
    // CASE 2: turns "EXIT DO" into "JMP"
    R = new RegExp(/^(\s*)exit\s+do\s*$/i);
    match = R.exec(Linea);
    if (match !== null) {
        if (StackDo.IsEmpty)
            error("not in DO", nl);
        var n = StackDo.Last();
        var label = Label("DO", n, "END");
        var all = match[0], spaces = match[1], exit_do = match[2];
        var ReplaceTo = "" + spaces + cross_1.Jump(label);
        return ReplaceTo;
    }
}
function IsLOOP(Linea, n) {
    var R = new RegExp(/^(\s*)loop\s+(if|while|until)\s+(.*)$/gmi);
    var match = R.exec(Linea);
    if (match === null)
        return undefined;
    if (StackDo.IsEmpty)
        error("DO without LOOP");
    var all = match[0], spaces = match[1], type = match[2], cond = match[3];
    var CondNot = true;
    if (utils_1.UpperCase(type) == "WHILE")
        CondNot = false;
    else if (utils_1.UpperCase(type) == "IF")
        CondNot = false;
    else if (utils_1.UpperCase(type) == "UNTIL")
        CondNot = true;
    var nl = StackDo.Pop();
    var _a = ParseCond(cond), Eval = _a.Eval, BranchNot = _a.BranchNot, Branch = _a.Branch;
    var Lab = Label("DO", nl, "START");
    Branch = Branch.replace(/\*/g, Lab);
    BranchNot = BranchNot.replace(/\*/g, Lab);
    var ReplaceTo = "";
    if (Eval != "")
        ReplaceTo = ReplaceTo + "\t" + Eval + "§";
    if (CondNot)
        ReplaceTo = ReplaceTo + "\t" + BranchNot;
    else
        ReplaceTo = ReplaceTo + "\t" + Branch;
    ReplaceTo = ReplaceTo + "§" + Label("DO", nl, "END") + ":§";
    return ReplaceTo;
}
function IsWHILE(Linea, nl) {
    Linea = utils_1.Trim(Linea);
    var StringaWHILE;
    var StringaCond;
    var G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    StringaWHILE = G.Token;
    StringaCond = utils_1.Trim(Linea);
    if (StringaCond == "")
        return undefined;
    if (utils_1.UpperCase(StringaWHILE) != "WHILE")
        return undefined;
    var _a = ParseCond(StringaCond), Eval = _a.Eval, BranchNot = _a.BranchNot, Branch = _a.Branch;
    var Lab = Label("WHILE", nl, "END");
    BranchNot = BranchNot.replace(/\*/g, Lab);
    var ReplaceTo = "";
    ReplaceTo = ReplaceTo + Label("WHILE", nl, "START") + ":§";
    if (Eval != "")
        ReplaceTo = ReplaceTo + "\t" + Eval + "§";
    ReplaceTo = ReplaceTo + "\t" + BranchNot;
    StackWhile.Add(nl);
    return ReplaceTo;
}
function IsEXITWHILE(Linea, nl) {
    // CASE 1: turns "IF cond THEN EXIT WHILE" into "IF cond THEN GOTO WHILE_n_END"
    var R = new RegExp(/^(.*)\s+then\s+exit\s+while\s*$/i);
    var match = R.exec(Linea);
    if (match !== null) {
        if (StackWhile.IsEmpty)
            error("not in WHILE", nl);
        var n = StackWhile.Last();
        var all = match[0], first = match[1], then = match[2];
        var label = Label("WHILE", n, "END");
        var ReplaceTo = first + " THEN GOTO " + label;
        return ReplaceTo;
    }
    // CASE 2: turns "EXIT WHILE" into "JMP"
    R = new RegExp(/^(\s*)exit\s+while\s*$/i);
    match = R.exec(Linea);
    if (match !== null) {
        if (StackWhile.IsEmpty)
            error("not in WHILE", nl);
        var n = StackWhile.Last();
        var label = Label("WHILE", n, "END");
        var all = match[0], spaces = match[1], exit_while = match[2];
        var ReplaceTo = "" + spaces + cross_1.Jump(label);
        return ReplaceTo;
    }
}
function IsWEND(Linea, n) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var StringaWEND = utils_1.GetParm(Linea, " ", 0);
    if (StringaWEND != "WEND")
        return undefined;
    if (StackWhile.IsEmpty)
        error("WEND without WHILE");
    var nl = StackWhile.Pop();
    ;
    var ReplaceTo = "\t" + cross_1.Jump(Label("WHILE", nl, "START")) + "§" + Label("WHILE", nl, "END") + ":";
    return ReplaceTo;
}
function IsFOR(Linea, nl) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea));
    var StringaFOR;
    var StringaStart;
    var StringaEnd;
    var Step;
    var Register;
    var StartValue;
    var StartIstruction;
    var StepInstruction = "";
    var G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    StringaFOR = G.Token;
    if (StringaFOR != "FOR")
        return undefined;
    G = utils_1.GetToken(Linea, "TO");
    Linea = G.Rest;
    StringaStart = G.Token;
    StringaStart = utils_1.Trim(StringaStart);
    if (StringaStart == "")
        return undefined;
    G = utils_1.GetToken(Linea, "STEP");
    Linea = G.Rest;
    StringaEnd = G.Token;
    if (StringaEnd != "") {
        Step = utils_1.Trim(Linea);
        if (Step == "")
            return undefined;
    }
    else {
        StringaEnd = Linea;
        Step = "#1";
    }
    StringaEnd = utils_1.Trim(StringaEnd);
    if (StringaEnd == "")
        return undefined;
    // find what register to use
    G = utils_1.GetToken(StringaStart, "=");
    StringaStart = G.Rest;
    Register = G.Token;
    StartValue = StringaStart;
    if (Register == "") {
        error("invalid FOR starting condition");
    }
    if (Register == "X") {
        StartIstruction = "LDX " + StartValue;
        if (Step == "#1") {
            StepInstruction = "\tinx";
            StringaEnd = Register + "!=" + StringaEnd + "+1";
        }
        else if (Step == "#2") {
            StepInstruction = "\tinx§\tinx";
            StringaEnd = Register + "<" + StringaEnd + "+2";
        }
        else if (Step == "#3") {
            StepInstruction = "\tinx§\tinx§\tinx";
            StringaEnd = Register + "<" + StringaEnd + "+3";
        }
        else if (Step == "#4") {
            StepInstruction = "\tinx§\tinx§\tinx§\tinx";
            StringaEnd = Register + "<" + StringaEnd + "+4";
        }
        else if (Step == "#-1") {
            StepInstruction = "\tdex";
            StringaEnd = Register + "!=" + StringaEnd + "-1";
        }
        else if (Step == "#-2") {
            StepInstruction = "\tdex§\tdex";
            StringaEnd = Register + ">=" + StringaEnd + "-2";
        }
        else if (Step == "#-3") {
            StepInstruction = "\tdex§\tdex§\tdexx";
            StringaEnd = Register + ">=" + StringaEnd + "-3";
        }
        else if (Step == "#-4") {
            StepInstruction = "\tdex§\tdex§\tdex§\tdexx";
            StringaEnd = Register + ">=" + StringaEnd + "-4";
        }
        else {
            error("invalid STEP in FOR");
        }
    }
    else if (Register == "Y") {
        StartIstruction = "LDY " + StartValue;
        if (Step == "#1") {
            StepInstruction = "\tiny";
            StringaEnd = Register + "!=" + StringaEnd + "+1";
        }
        else if (Step == "#2") {
            StepInstruction = "\tiny§\tiny";
            StringaEnd = Register + "<" + StringaEnd + "+2";
        }
        else if (Step == "#3") {
            StepInstruction = "\tiny§\tiny§\tiny";
            StringaEnd = Register + "<" + StringaEnd + "+3";
        }
        else if (Step == "#4") {
            StepInstruction = "\tiny§\tiny§\tiny§\tiny";
            StringaEnd = Register + "<" + StringaEnd + "+4";
        }
        else if (Step == "#-1") {
            StepInstruction = "\tdey";
            StringaEnd = Register + "!=" + StringaEnd + "-1";
        }
        else if (Step == "#-2") {
            StepInstruction = "\tdey§\tdey";
            StringaEnd = Register + ">=" + StringaEnd + "-2";
        }
        else if (Step == "#-3") {
            StepInstruction = "\tdey§\tdey§\tdey";
            StringaEnd = Register + ">=" + StringaEnd + "-3";
        }
        else if (Step == "#-4") {
            StepInstruction = "\tdey§\tdey§\tdey§\tdey";
            StringaEnd = Register + ">=" + StringaEnd + "-4";
        }
        else {
            error("invalid STEP in FOR");
        }
    }
    else if (Register == "A") {
        StartIstruction = "LDA " + StartValue;
        if (Step == "#1") {
            StepInstruction = "\tclc§\tadc #1";
            StringaEnd = Register + "!=" + StringaEnd + "+1";
        }
        else if (Step == "#2") {
            StepInstruction = "\tclc§\tadc #2";
            StringaEnd = Register + "<" + StringaEnd + "+2";
        }
        else if (Step == "#3") {
            StepInstruction = "\tclc§\tadc #3";
            StringaEnd = Register + "<" + StringaEnd + "+3";
        }
        else if (Step == "#4") {
            StepInstruction = "\tclc§\tadc #4";
            StringaEnd = Register + "<" + StringaEnd + "+4";
        }
        else if (Step == "#-1") {
            StepInstruction = "\tclc§\tadc #255";
            StringaEnd = Register + "!=" + StringaEnd + "-1";
        }
        else if (Step == "#-2") {
            StepInstruction = "\tclc§\tadc #254";
            StringaEnd = Register + ">=" + StringaEnd + "-2";
        }
        else if (Step == "#-3") {
            StepInstruction = "\tclc§\tadc #253";
            StringaEnd = Register + ">=" + StringaEnd + "-3";
        }
        else if (Step == "#-4") {
            StepInstruction = "\tclc§\tadc #252";
            StringaEnd = Register + ">=" + StringaEnd + "-4";
        }
        else {
            error("invalid STEP in FOR");
        }
    }
    else {
        StartIstruction = "LDA " + StartValue + "§\tSTA " + Register;
        if (Step == "#1") {
            StepInstruction = "\tinc " + Register;
            StringaEnd = Register + "!=" + StringaEnd + "+1";
        }
        else if (Step == "#2") {
            StepInstruction = "\tinc " + Register + "§\tinc " + Register;
            StringaEnd = Register + "<" + StringaEnd + "+2";
        }
        else if (Step == "#3") {
            StepInstruction = "\tinc " + Register + "§\tinc " + Register + "§\tinc " + Register;
            StringaEnd = Register + "<" + StringaEnd + "+3";
        }
        else if (Step == "#4") {
            StepInstruction = "\tinc " + Register + "§\tinc " + Register + "§\tinc " + Register + "§\tinc " + Register;
            StringaEnd = Register + "<" + StringaEnd + "+4";
        }
        else if (Step == "#-1") {
            StepInstruction = "\tdec " + Register;
            StringaEnd = Register + "!=" + StringaEnd + "-1";
        }
        else if (Step == "#-2") {
            StepInstruction = "\tdec " + Register + "§\tdec " + Register;
            StringaEnd = Register + ">=" + StringaEnd + "-2";
        }
        else if (Step == "#-3") {
            StepInstruction = "\tdec " + Register + "§\tdec " + Register + "§\tdec " + Register;
            StringaEnd = Register + ">=" + StringaEnd + "-3";
        }
        else if (Step == "#-4") {
            StepInstruction = "\tdec " + Register + "§\tdec " + Register + "§\tdec " + Register + "§\tdec " + Register;
            StringaEnd = Register + ">=" + StringaEnd + "-4";
        }
        else {
            error("invalid STEP in FOR");
        }
    }
    var ReplaceTo = Label("FOR", nl, "START") + ":§" + "\t" + StartIstruction + "§";
    ReplaceTo = ReplaceTo + Label("FOR", nl, "LOOP") + ":";
    var _a = ParseCond(StringaEnd), Eval = _a.Eval, BranchNot = _a.BranchNot, Branch = _a.Branch;
    var Lab = Label("FOR", nl, "LOOP");
    Branch = Branch.replace(/\*/g, Lab);
    StepInstruction = "\t" + StepInstruction + "§\t" + Eval + "§\t" + Branch + "§";
    StackFor.Add(nl);
    StackFor_U.Add(StepInstruction);
    return ReplaceTo;
}
function IsEXITFOR(Linea, nl) {
    // CASE 1: turns "IF cond THEN EXIT FOR" into "IF cond THEN GOTO FOR_n_END"
    var R = new RegExp(/^(.*)\s+then\s+exit\s+for\s*$/i);
    var match = R.exec(Linea);
    if (match !== null) {
        if (StackFor.IsEmpty)
            error("not in FOR", nl);
        var n = StackFor.Last();
        var all = match[0], first = match[1], then = match[2];
        var label = Label("FOR", n, "END");
        var ReplaceTo = first + " THEN GOTO " + label;
        return ReplaceTo;
    }
    // CASE 2: turns "EXIT FOR" into "JMP"
    R = new RegExp(/^(\s*)exit\s+for\s*$/i);
    match = R.exec(Linea);
    if (match !== null) {
        if (StackFor.IsEmpty)
            error("not in FOR", nl);
        var n = StackFor.Last();
        var label = Label("FOR", n, "END");
        var all = match[0], spaces = match[1], exit_for = match[2];
        var ReplaceTo = "" + spaces + cross_1.Jump(label);
        return ReplaceTo;
    }
}
function IsNEXT(Linea, n) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var StringaNEXT = utils_1.GetParm(Linea, " ", 0);
    if (StringaNEXT != "NEXT")
        return undefined;
    if (StackFor.IsEmpty)
        error("NEXT without FOR");
    var nl = StackFor.Pop();
    var StepCondition = StackFor_U.Pop();
    var ReplaceTo = StepCondition + "§" + Label("FOR", nl, "END") + ":";
    return ReplaceTo;
}
var cross_2 = require("./cross");
function ParseCond(W) {
    var signedcond = false;
    var usinga = true;
    var usingx = false;
    var usingy = false;
    var x;
    var Cast;
    var OriginalW = W;
    var cpu6502 = cross_1.target.cpu6502, cpuz80 = cross_1.target.cpuz80;
    W = utils_1.UpperCase(utils_1.Trim(W));
    Cast = "(SIGNED)";
    x = W.AnsiPos(Cast);
    if (x > 0) {
        signedcond = true;
        W = W.SubString(1, x - 1) + W.SubString(x + Cast.Length(), W.Length());
    }
    Cast = "(USING X)";
    x = W.AnsiPos(Cast);
    if (x > 0) {
        usingx = true;
        usinga = false;
        W = W.SubString(1, x - 1) + W.SubString(x + Cast.Length(), W.Length());
    }
    Cast = "(USING Y)";
    x = W.AnsiPos(Cast);
    if (x > 0) {
        usingy = true;
        usinga = false;
        usingx = false;
        W = W.SubString(1, x - 1) + W.SubString(x + Cast.Length(), W.Length());
    }
    var Branch = "";
    var Eval = "";
    var Eval1 = "";
    var BranchNot = "";
    if (W == "Z=1" || W == "ZERO" || W == "EQUAL") {
        Eval = "";
        Branch = cpu6502 ? "BEQ *" : "JR Z, *";
        BranchNot = cpu6502 ? "BNE *" : "JR NZ, *";
    }
    else if (W == "Z=0" || W == "NOT ZERO" || W == "NOT EQUAL") {
        Eval = "";
        Branch = cpu6502 ? "BNE *" : "JR NZ, *";
        BranchNot = cpu6502 ? "BEQ *" : "JR Z, *";
    }
    else if (W == "C=1" || W == "CARRY") {
        Eval = "";
        Branch = cpu6502 ? "BCS *" : "JR C, *";
        BranchNot = cpu6502 ? "BCC *" : "JR NC, *";
    }
    else if (W == "C=0" || W == "NOT CARRY") {
        Eval = "";
        Branch = cpu6502 ? "BCC *" : "JR NC, *";
        BranchNot = cpu6502 ? "BCS *" : "JR C, *";
    }
    else if (W == "NEGATIVE" || W == "SIGN" || (cpu6502 && W == "N=1") || (cpuz80 && W == "S=1")) {
        Eval = "";
        Branch = cpu6502 ? "BMI *" : "JP S, *";
        BranchNot = cpu6502 ? "BPL *" : "JP NS, *";
    }
    else if (W == "NOT NEGATIVE" || W == "NOT SIGN" || (cpu6502 && W == "N=0") || (cpuz80 && W == "S=0")) {
        Eval = "";
        Branch = cpu6502 ? "BPL *" : "JP NS, *";
        BranchNot = cpu6502 ? "BMI *" : "JP S, *";
    }
    else if (W == "V=1" || W == "OVERFLOW") {
        Eval = "";
        Branch = cpu6502 ? "BVS *" : "JP V, *";
        BranchNot = cpu6502 ? "BVC *" : "JP NV, *";
    }
    else if (W == "V=0" || W == "NOT OVERFLOW") {
        Eval = "";
        Branch = cpu6502 ? "BVC *" : "JP NV, *";
        BranchNot = cpu6502 ? "BVS *" : "JP V, *";
    }
    if (BranchNot !== "") {
        return { Eval: Eval, BranchNot: BranchNot, Branch: Branch };
    }
    var Register = "";
    var Operator = "";
    var Operand = "";
    W = utils_1.Trim(W);
    if (W.AnsiPos(">=") > 0) {
        Operator = ">=";
        var G = utils_1.GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("<=") > 0) {
        Operator = "<=";
        var G = utils_1.GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("<>") > 0) {
        Operator = "<>";
        var G = utils_1.GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("!=") > 0) {
        Operator = "!=";
        var G = utils_1.GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("==") > 0) {
        Operator = "==";
        var G = utils_1.GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("=") > 0) {
        Operator = "=";
        var G = utils_1.GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos(">") > 0) {
        Operator = ">";
        var G = utils_1.GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("<") > 0) {
        Operator = "<";
        var G = utils_1.GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("IS") > 0) {
        Operator = "IS";
        var G = utils_1.GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    Operand = utils_1.Trim(Operand);
    Register = utils_1.UpperCase(utils_1.Trim(Register));
    if (cpu6502) {
        if (Operator == "IS") {
            if (usinga)
                Eval = "LDA " + Register + "§";
            if (usingx)
                Eval = "LDX " + Register + "§";
            if (usingy)
                Eval = "LDY " + Register + "§";
            if (Operand == "ZERO") {
                Operator = "==";
            }
            if (Operand == "NOT ZERO") {
                Operator = "!=";
            }
            if (Operand == "NEGATIVE") {
                Operator = "<";
                signedcond = true;
            }
            if (Operand == "NOT NEGATIVE") {
                Operator = ">=";
                signedcond = true;
            }
            // TODO positive?
        }
        else {
            if (Register == "A")
                Eval = "CMP " + Operand;
            else if (Register == "X")
                Eval = "CPX " + Operand;
            else if (Register == "Y")
                Eval = "CPY " + Operand;
            else {
                if (usinga) {
                    Eval = "LDA " + Register + "§";
                    Eval1 = "\tCMP " + Operand;
                }
                if (usingx) {
                    Eval = "LDX " + Register + "§";
                    Eval1 = "\tCPX " + Operand;
                }
                if (usingy) {
                    Eval = "LDY " + Register + "§";
                    Eval1 = "\tCPY " + Operand;
                }
            }
        }
    }
    if (cpuz80) {
        if (Operator == "IS") {
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
        else {
            if (Register == "A")
                Eval = "CP A," + Operand;
            else if (Register == "B")
                Eval = "CP B," + Operand;
            else if (Register == "C")
                Eval = "CP C," + Operand;
            else if (Register == "D")
                Eval = "CP D," + Operand;
            else if (Register == "E")
                Eval = "CP E," + Operand;
            else if (Register == "H")
                Eval = "CP H," + Operand;
            else if (Register == "L")
                Eval = "CP L," + Operand;
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
    if (cpu6502) {
        var cmp_not_needed = false;
        if (Operator == "!=") {
            Branch = "BNE *";
            BranchNot = "BEQ *";
            cmp_not_needed = true;
        }
        else if (Operator == "<>") {
            Branch = "BNE *";
            BranchNot = "BEQ *";
            cmp_not_needed = true;
        }
        else if (Operator == "==") {
            Branch = "BEQ *";
            BranchNot = "BNE *";
            cmp_not_needed = true;
        }
        else if (Operator == "=") {
            Branch = "BEQ *";
            BranchNot = "BNE *";
            cmp_not_needed = true;
        }
        else if (Operator == ">=" && signedcond == false) {
            Branch = "BCS *";
            BranchNot = "BCC *";
        }
        else if (Operator == "<=" && signedcond == false) {
            Branch = "BCC *§\tBEQ *";
            BranchNot = "BEQ .+4§\tBCS *";
        }
        else if (Operator == "<" && signedcond == false) {
            Branch = "BCC *";
            BranchNot = "BCS *";
        }
        else if (Operator == ">" && signedcond == false) {
            Branch = "BEQ .+4§\tBCS *";
            BranchNot = "BCC *§\tBEQ *";
        }
        else if (Operator == ">=" && signedcond == true) {
            Branch = "BPL *";
            BranchNot = "BMI *";
            cmp_not_needed = true;
        }
        else if (Operator == "<=" && signedcond == true) {
            Branch = "BMI *§\tBEQ *";
            BranchNot = "BEQ .+4§\tBPL *";
            cmp_not_needed = true;
        }
        else if (Operator == "<" && signedcond == true) {
            Branch = "BMI *";
            BranchNot = "BPL *";
            cmp_not_needed = true;
        }
        else if (Operator == ">" && signedcond == true) {
            Branch = "BEQ .+4§\tBPL *";
            BranchNot = "BMI *§\tBEQ *";
            cmp_not_needed = true;
        }
        else
            Operator = "#";
        if (Operand.startsWith("#") && cmp_not_needed && Eval1 !== "") {
            var expr = cross_2.notequal(cross_2.parens(RemoveHash(Operand)), "0");
            Eval1 = "\u00A7#IF " + expr + "\u00A7" + Eval1 + "\u00A7#ENDIF\u00A7";
        }
        Eval = Eval + Eval1;
    }
    else if (cpuz80) {
        if (Operator == "!=") {
            Branch = "JR NZ,*";
            BranchNot = "JR Z,*";
        }
        else if (Operator == "<>") {
            Branch = "JR NZ,*";
            BranchNot = "JR Z,*";
        }
        else if (Operator == "==") {
            Branch = "JR Z,*";
            BranchNot = "JR NZ,*";
        }
        else if (Operator == "=") {
            Branch = "JR Z,*";
            BranchNot = "JR NZ,*";
        }
        else if (Operator == ">=" && signedcond == false) {
            Branch = "JR C, *";
            BranchNot = "JR NC,*";
        }
        else if (Operator == "<=" && signedcond == false) {
            Branch = "JR NC, *§\tJR Z, *";
            BranchNot = "JR Z, .+4§\tJR C, *";
        }
        else if (Operator == "<" && signedcond == false) {
            Branch = "JR NC, *";
            BranchNot = "JR C, *";
        }
        else if (Operator == ">" && signedcond == false) {
            Branch = "JR Z, .+4§\tJR C, *";
            BranchNot = "JR NC, *§\tJR Z, *";
        }
        else if (Operator == ">=" && signedcond == true) {
            Branch = "JP NS, *";
            BranchNot = "JP S, *";
        }
        else if (Operator == "<=" && signedcond == true) {
            Branch = "JP S, *§\tJR Z, *";
            BranchNot = "JR Z, .+4§\tJP NS, *";
        }
        else if (Operator == "<" && signedcond == true) {
            Branch = "JP S, *";
            BranchNot = "JP NS, *";
        }
        else if (Operator == ">" && signedcond == true) {
            Branch = "JR Z, .+4§\tJP NS, *";
            BranchNot = "JP S, *§\tJR Z, *";
        }
        else
            Operator = "#";
    }
    if (Operator == "#") {
        error("not valid condition: " + OriginalW);
    }
    return { Eval: Eval, BranchNot: BranchNot, Branch: Branch };
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
function IsMACRO(Linea, nl) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var PM;
    var PList = [];
    var G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    var StringaMacro = G.Token;
    if (StringaMacro != "MACRO")
        return undefined;
    G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    var NomeMacro = G.Token;
    // permette il carattere "." nel nome macro
    NomeMacro = NomeMacro.replace(/\./g, "_");
    NomeMacro = utils_1.Trim(NomeMacro);
    if (NomeMacro == "") {
        error("no macro name", nl);
    }
    PM = Linea + ",";
    var NM = NomeMacro;
    // processa i parametri della macro
    for (;;) {
        G = utils_1.GetToken(PM, ",");
        PM = G.Rest;
        var Dummy = utils_1.Trim(G.Token);
        if (Dummy == "")
            break;
        if (Dummy == "CONST") {
            PList.push("CONST");
            NM = NM + "_C";
        }
        else if (Dummy == "MEM") {
            PList.push("MEM");
            NM = NM + "_M";
        }
        else if (Dummy == "INDIRECT") {
            PList.push("INDIRECT");
            NM = NM + "_I";
        }
        else if (Dummy.startsWith('"') && Dummy.endsWith('"')) {
            PList.push(Dummy);
            NM = NM + "__" + RemoveQuote(Dummy);
        }
        else {
            error("invalid type in MACRO parameter");
        }
    }
    // trova se la macro esiste già
    var matchingMacros = AllMacros.filter(function (e) {
        if (e.Name !== NomeMacro)
            return false;
        if (e.Parameters.join(",") !== PList.join(","))
            return false;
        return true;
    });
    if (matchingMacros.length != 0) {
        var msg = "macro " + NM + " already defined";
        error(msg);
    }
    var ReplaceTo = "   mac " + NM;
    var Code = "";
    // new self extracting MACRO
    if (true) {
        var end_macro_found = false;
        for (var t = nl + 1; t < L.Count; t++) {
            var Linea_1 = L.Strings[t];
            if (IsENDMACRO(Linea_1, t) !== undefined) {
                L.Strings[t] = "";
                ReplaceTo = "";
                end_macro_found = true;
                break;
            }
            else {
                Code += Linea_1 + "§";
                L.Strings[t] = "";
            }
        }
        if (!end_macro_found)
            error("end macro not found for " + NM);
    }
    // inserisce macro   
    AllMacros.push({
        Name: NomeMacro,
        Id: NM,
        Parameters: PList,
        Code: Code
    });
    return ReplaceTo;
}
function IsENDMACRO(Linea, nl) {
    var R = new RegExp(/^\s*end\s*macro\s*$/i);
    var match = R.exec(Linea);
    if (match === null)
        return undefined;
    return "   endm";
}
function IsMacroCall(Linea, nl) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    var NomeMacro = G.Token;
    var Parametri = utils_1.Trim(Linea);
    // empty macro
    if (NomeMacro == "")
        return undefined;
    // permette il carattere "." nel nome macro
    NomeMacro = NomeMacro.replace(/\./g, "_");
    // build plist
    var prm = Linea + ",";
    var orig = Linea;
    var list = [];
    var actualparms = [];
    for (;;) {
        G = utils_1.GetToken(prm, ",");
        var p = utils_1.Trim(G.Token);
        prm = G.Rest;
        if (p == "")
            break;
        actualparms.push(p);
        if (p.startsWith("#"))
            list.push("CONST");
        //else if(p.startsWith("(") && p.endsWith(")")) list.push("INDIRECT");
        else
            list.push(p);
    }
    // filter out macro with different name
    var matchingMacros = AllMacros.filter(function (e) { return e.Name === NomeMacro; });
    if (matchingMacros.length === 0)
        return undefined;
    // filter out macro with different number of parameters
    matchingMacros = matchingMacros.filter(function (m) { return m.Parameters.length === list.length; });
    if (matchingMacros.length === 0)
        return undefined;
    matchingMacros = matchingMacros.filter(function (m) { return isMatchingMacroParameters(m.Parameters, list); });
    if (matchingMacros.length === 0)
        return undefined;
    var foundMacro = matchingMacros[0];
    var ReplaceTo = "   " + foundMacro.Id + " " + orig;
    // new self extracting macro
    if (true) {
        var code = foundMacro.Code;
        for (var t = 0; t < actualparms.length; t++) {
            // replace parameters
            var pattern = "\\{" + (t + 1) + "\\}";
            var R = new RegExp(pattern, "gmi");
            var param = RemoveHash(actualparms[t]);
            code = code.replace(R, param);
            // replace local labels in macro code                           
            code = code.replace(/\local_label/gmi, Label("LOCAL", nl, "LABEL"));
        }
        ReplaceTo = code;
    }
    // console.log(`ReplaceTo=${ReplaceTo}`);
    return ReplaceTo;
}
function isMatchingMacroParameters(mparms, list) {
    for (var t = 0; t < mparms.length; t++) {
        var macrop = mparms[t];
        var actualp = list[t];
        if (!isGoodMacroParameter(macrop, actualp))
            return false;
    }
    return true;
}
function isGoodMacroParameter(macrop, actualp) {
    if ("\"" + actualp + "\"" === macrop) {
        return true;
    }
    else if (actualp == "CONST") {
        if (macrop == "CONST")
            return true;
        else
            return false;
    }
    else if (actualp.startsWith("(") && actualp.endsWith(")")) {
        if (macrop == "INDIRECT")
            return true;
        else
            return false;
    }
    else {
        if (macrop === "MEM")
            return true;
        else
            return false;
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
function IsSUB(Linea, nl) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var StringaSUB = utils_1.GetParm(Linea, " ", 0);
    if (StringaSUB != "SUB")
        return undefined;
    var NomeSub = utils_1.Trim(utils_1.GetParm(Linea, " ", 1));
    // impone terminazione con ()
    if (!NomeSub.endsWith("()"))
        return undefined;
    NomeSub = NomeSub.SubString(1, NomeSub.Length() - 2);
    var ReplaceTo = NomeSub + ":";
    StackSub.Add(nl);
    return ReplaceTo;
}
function IsEXITSUB(Linea, nl) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var StringaREPEAT;
    var G = utils_1.GetToken(Linea, " THEN EXIT SUB");
    Linea = G.Rest;
    StringaREPEAT = G.Token;
    if (StringaREPEAT != "") {
        if (StackSub.IsEmpty)
            error("not in SUB");
        nl = StackSub.Last();
        var ReplaceTo_1 = StringaREPEAT + " THEN GOTO " + Label("SUB", nl, "END");
        return ReplaceTo_1;
    }
    G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    StringaREPEAT = G.Token;
    var ReplaceTo = "   rts";
    if (StringaREPEAT == "EXITSUB")
        return ReplaceTo;
    if (StringaREPEAT == "EXIT") {
        G = utils_1.GetToken(Linea, " ");
        StringaREPEAT = G.Token;
        if (StringaREPEAT == "SUB")
            return ReplaceTo;
    }
    return undefined;
}
function IsENDSUB(Linea, nl) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var StringaEndMacro = utils_1.GetParm(Linea, " ", 0);
    var StringaEndMacro1 = utils_1.GetParm(Linea, " ", 1);
    if (StringaEndMacro == "ENDSUB" || (StringaEndMacro == "END" && StringaEndMacro1 == "SUB")) {
        if (StackSub.Count - 1 < 0) {
            error("SUB without END SUB");
        }
        nl = StackSub.Pop();
        var Lab = Label("SUB", nl, "END") + ":§";
        var ReplaceTo = Lab + "   rts";
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
var nearley_1 = __importDefault(require("nearley"));
var node_all_1 = require("./node_all");
var const_grammar = require("./const");
function parseResult(Linea) {
    var ans;
    try {
        var const_parser = new nearley_1.default.Parser(const_grammar.ParserRules, const_grammar.ParserStart);
        ans = const_parser.feed(Linea);
    }
    catch (ex) {
        // parse error
        //console.log(ex);
        return undefined;
    }
    // check no result
    if (ans.results.length === 0)
        return undefined;
    return ans.results[0];
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
function IsCombined(Linea, nl) {
    var result = parseResult(Linea);
    if (result === undefined)
        return undefined;
    if (result.type !== "line")
        return undefined;
    var node = result.line;
    if (node.type === "const" || node.type === "float" || node.type === "bitmap" || node.type === "sprite") {
        var ReplaceTo = node_all_1.nodeToString(node);
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

on var goto a,b,c

version1:
   lda var
   asl
   tax
   jmp (table,x)
   table word a,b,c

version2:
   ldx var
   lda table.hi,x
   sta **salto
   lda table.lo,x
   sta **salto+1
   jmp **salto

version3:
   ldx var
   lda table.hi,x
   pha
   lda table.lo,x
   pha
   rts
   
*/
