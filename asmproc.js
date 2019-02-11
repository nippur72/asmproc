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
function hex(value) {
    return (value <= 0xF ? "0" : "") + value.toString(16);
}
function ChangeFileExt(name, ext) {
    // taken from https://stackoverflow.com/questions/5953239/how-do-i-change-file-extension-with-javascript
    return name.replace(/\.[^\.]+$/, ext);
}
function FileExists(name) {
    return fs_1.default.existsSync(name);
}
function UpperCase(s) {
    return s.toUpperCase();
}
function Trim(s) {
    return s.trim();
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
var basic_row;
var BasicCompact;
var TokensKeywords = {};
var TokensText = {};
var Ascii = {};
var Ferr;
var dasm = false;
var ca65 = false;
var z80asm = false;
var cpu6502 = false;
var cpuz80 = false;
var JMP;
var BYTE;
var PARENS;
function hibyte(byte) {
    if (dasm)
        return byte + "/256";
    else if (ca65)
        return ".HIBYTE(" + byte + ")";
    else if (z80asm)
        return byte + "/256";
    throw "";
}
function lobyte(byte) {
    if (dasm)
        return byte + "%256";
    else if (ca65)
        return ".LOBYTE(" + byte + ")";
    else if (z80asm)
        return byte + "%256";
    throw "";
}
function mod(value, div) {
    if (dasm)
        return value + "%" + div;
    else if (ca65)
        return value + " .MOD " + div;
    else if (z80asm)
        return value + "%" + div;
    throw "";
}
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
function main() {
    var options = parseOptions([
        { name: 'input', alias: 'i', type: String },
        { name: 'output', alias: 'o', type: String },
        { name: 'target', alias: 't', type: String, defaultValue: 'dasm' }
    ]);
    if (options === undefined || options.input === undefined || options.output === undefined) {
        console.log("Usage: asmproc -i <inputfile> -o <outputfile>");
        process.exit(-1);
        return;
    }
    // set target
    dasm = options.target === "dasm";
    ca65 = options.target === "ca65";
    z80asm = options.target === "z80asm";
    cpu6502 = dasm || ca65;
    cpuz80 = z80asm;
    if (cpu6502) {
        JMP = "JMP";
    }
    if (cpuz80) {
        JMP = "JP ";
    }
    if (dasm) {
        BYTE = "byte";
        PARENS = "[]";
    }
    if (ca65) {
        BYTE = ".byte";
        PARENS = "()";
    }
    if (z80asm) {
        BYTE = "defb";
        PARENS = "()";
    }
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
    basic_row = 0;
    BasicCompact = false;
    InitTokens();
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
            if (IsBasicStart(purged)) {
                inbasic = true;
                L.Strings[t] = purged;
            }
            else if (IsBasicEnd(purged)) {
                inbasic = false;
                L.Strings[t] = purged;
            }
            if (!inbasic)
                L.Strings[t] = purged;
        }
        else {
            if (IsBasicStart(Linea))
                inbasic = true;
            if (IsBasicEnd(Linea))
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
                if (dasm)
                    L.Strings[t] = left + " % " + right;
                if (ca65)
                    L.Strings[t] = left + " .MOD " + right;
                if (z80asm)
                    L.Strings[t] = left + " % " + right;
            }
            else
                break;
        }
    }
}
function ResolveInclude() {
    for (var t = 0; t < L.Count; t++) {
        var Linea = UpperCase(Trim(L.Strings[t])) + " ";
        var Include = GetParm(Linea, " ", 0);
        if (Include == "INCLUDE") {
            var NomeFile = GetParm(Linea, " ", 1);
            if (NomeFile.length < 2) {
                error("invalid file name \"" + NomeFile + "\" in include", t);
            }
            NomeFile = RemoveQuote(NomeFile);
            if (!FileExists(NomeFile)) {
                error("include file \"" + NomeFile + "\" not found", t);
            }
            var IF = new TStringList();
            IF.LoadFromFile(NomeFile);
            L.Strings[t] = IF.Text();
            return true;
        }
    }
    return false;
}
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
    L.SetText(UpperCase(Whole));
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
    Linea = Trim(Linea);
    if (Linea.startsWith("#")) {
        if (dasm || z80asm) {
            Linea = Linea.replace("#IFDEF", "IFCONST");
            Linea = Linea.replace("#IFNDEF", "IFNCONST");
            Linea = Linea.replace("#IF", "IF");
            Linea = Linea.replace("#ELSE", "ELSE");
            Linea = Linea.replace("#ENDIF", "ENDIF");
            //Linea = Linea.replace("#INCLUDE","INCLUDE");
            var ReplaceTo = " " + Linea;
            return ReplaceTo;
        }
        else if (ca65) {
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
function ProcessFile() {
    var t;
    for (;;) {
        RemoveComments();
        var hasinclude = ResolveInclude();
        if (!hasinclude)
            break;
    }
    // scan for basic, needs to be done first before of semicolon replacement
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = IsBasic(Dummy, t);
        // IsBasic does replace by itself
        // if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;        
    }
    ModOperator();
    RemoveColon();
    MakeAllUpperCase();
    // substitute DASM IF THEN on single line
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = IsIFDEFSingle(Dummy, t);
        if (ReplaceTo !== undefined) {
            L.Strings[t] = ReplaceTo;
        }
    }
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
    // substitute macros
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = IsMacroCall(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
    }
    // change § into newlines (needed for macros)   
    L.SetText(L.Text().replace(/§/g, "\n"));
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
    // scan for sub...end sub
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
    // bitmap values
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = IsBitmap(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
    }
    // floating point values
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = IsFloat(Dummy, t);
        if (ReplaceTo !== undefined)
            L.Strings[t] = ReplaceTo;
    }
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
function SplitToken(Linea, token) {
    return Linea.split(token);
}
function GetParm(Linea, token, num) {
    var split = SplitToken(Linea, token);
    if (split.length < num)
        return "";
    else
        return split[num];
}
function GetToken(Linea, Separator) {
    var Token;
    var Rest;
    var x = Linea.AnsiPos(Separator);
    if (x == 0) {
        Token = "";
        Rest = Linea;
    }
    else {
        Token = Linea.SubString(1, x - 1);
        Rest = Linea.SubString(x + Separator.Length(), Linea.Length());
    }
    return { Token: Token, Rest: Rest };
}
function Label(Header, nr, suffix) {
    return Header + "_" + nr + "_" + suffix;
}
function IsIFSINGLE(Linea, nl) {
    Linea = UpperCase(Trim(Linea)) + " ";
    var StringaIF;
    var StringaCond;
    var StringaAfterThen;
    var G = GetToken(Linea, " ");
    Linea = G.Rest;
    StringaIF = G.Token;
    if (StringaIF != "IF")
        return undefined;
    G = GetToken(Linea, " THEN");
    Linea = G.Rest;
    StringaCond = G.Token;
    if (StringaCond == "")
        return undefined;
    Linea = Trim(Linea);
    var LastPart = Linea;
    G = GetToken(Linea + " ", " ");
    Linea = G.Rest;
    StringaAfterThen = Trim(G.Token);
    if (StringaAfterThen == "")
        return undefined; // if composto
    if (StringaAfterThen == "GOTO")
        return undefined; // if then goto
    // if <cond> then <statement>
    var ReplaceTo = " IF " + StringaCond + " THEN \u00A7 " + LastPart + " \u00A7 END IF\u00A7 ";
    return ReplaceTo;
}
function IsIF(Linea, nl) {
    Linea = UpperCase(Trim(Linea)) + " ";
    var StringaIF;
    var StringaCond;
    var StringaAfterThen;
    var G = GetToken(Linea, " ");
    Linea = G.Rest;
    StringaIF = G.Token;
    if (StringaIF != "IF")
        return undefined;
    G = GetToken(Linea, " THEN");
    Linea = G.Rest;
    StringaCond = G.Token;
    if (StringaCond == "")
        return undefined;
    Linea = Trim(Linea);
    G = GetToken(Linea, " ");
    Linea = G.Rest;
    StringaAfterThen = Trim(G.Token);
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
    Linea = UpperCase(Trim(Linea)) + " ";
    var G = GetToken(Linea, " ");
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
    Linea = UpperCase(Trim(Linea)) + " ";
    var G = GetToken(Linea, " ");
    Linea = G.Rest;
    var StringaELSE = G.Token;
    if (StringaELSE != "ELSE")
        return undefined;
    if (StackIf.IsEmpty) {
        error("ELSE without IF", n);
    }
    var nl = StackIf.Last();
    var ReplaceTo = "\t" + JMP + " " + Label("IF", nl, "END") + "§" + Label("IF", nl, "ELSE") + ":";
    return ReplaceTo;
}
function IsREPEAT(Linea, nl) {
    Linea = UpperCase(Trim(Linea)) + " ";
    var StringaREPEAT = GetParm(Linea, " ", 0);
    if (StringaREPEAT != "REPEAT")
        return undefined;
    StackRepeat.Add(nl);
    var ReplaceTo = Label("REPEAT", nl, "START") + ":";
    return ReplaceTo;
}
function IsSelfModLabel(Linea, nl) {
    var R = new RegExp(/^(.*)\*([_a-zA-Z]+[_a-zA-Z0-9]*)(?:\((.*)\))?(.*)$/gmi);
    var match = R.exec(Linea);
    if (match !== null) {
        var all = match[0], leftside = match[1], varname = match[2], varparm = match[3], rightside = match[4];
        var arg = (varparm === "" || varparm === null) ? "$0000" : varparm;
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
        var ReplaceTo = "" + spaces + JMP + " " + label;
        return ReplaceTo;
    }
}
function IsUNTIL(Linea, n) {
    Linea = Trim(Linea);
    var G = GetToken(Linea, " ");
    Linea = G.Rest;
    var StringaUNTIL = G.Token;
    var StringaCond = Trim(Linea);
    if (StringaCond == "")
        return undefined;
    if (UpperCase(StringaUNTIL) != "UNTIL")
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
    Linea = UpperCase(Trim(Linea)) + " ";
    var StringaDO = GetParm(Linea, " ", 0);
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
        var ReplaceTo = "" + spaces + JMP + " " + label;
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
    if (UpperCase(type) == "WHILE")
        CondNot = false;
    else if (UpperCase(type) == "IF")
        CondNot = false;
    else if (UpperCase(type) == "UNTIL")
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
    Linea = Trim(Linea);
    var StringaWHILE;
    var StringaCond;
    var G = GetToken(Linea, " ");
    Linea = G.Rest;
    StringaWHILE = G.Token;
    StringaCond = Trim(Linea);
    if (StringaCond == "")
        return undefined;
    if (UpperCase(StringaWHILE) != "WHILE")
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
        var ReplaceTo = "" + spaces + JMP + " " + label;
        return ReplaceTo;
    }
}
function IsWEND(Linea, n) {
    Linea = UpperCase(Trim(Linea)) + " ";
    var StringaWEND = GetParm(Linea, " ", 0);
    if (StringaWEND != "WEND")
        return undefined;
    if (StackWhile.IsEmpty)
        error("WEND without WHILE");
    var nl = StackWhile.Pop();
    ;
    var ReplaceTo = "\t" + JMP + " " + Label("WHILE", nl, "START") + "§" + Label("WHILE", nl, "END") + ":";
    return ReplaceTo;
}
function IsFOR(Linea, nl) {
    Linea = UpperCase(Trim(Linea));
    var StringaFOR;
    var StringaStart;
    var StringaEnd;
    var Step;
    var Register;
    var StartValue;
    var StartIstruction;
    var StepInstruction = "";
    var G = GetToken(Linea, " ");
    Linea = G.Rest;
    StringaFOR = G.Token;
    if (StringaFOR != "FOR")
        return undefined;
    G = GetToken(Linea, "TO");
    Linea = G.Rest;
    StringaStart = G.Token;
    StringaStart = Trim(StringaStart);
    if (StringaStart == "")
        return undefined;
    G = GetToken(Linea, "STEP");
    Linea = G.Rest;
    StringaEnd = G.Token;
    if (StringaEnd != "") {
        Step = Trim(Linea);
        if (Step == "")
            return undefined;
    }
    else {
        StringaEnd = Linea;
        Step = "#1";
    }
    StringaEnd = Trim(StringaEnd);
    if (StringaEnd == "")
        return undefined;
    // find what register to use
    G = GetToken(StringaStart, "=");
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
        var ReplaceTo = "" + spaces + JMP + " " + label;
        return ReplaceTo;
    }
}
function IsNEXT(Linea, n) {
    Linea = UpperCase(Trim(Linea)) + " ";
    var StringaNEXT = GetParm(Linea, " ", 0);
    if (StringaNEXT != "NEXT")
        return undefined;
    if (StackFor.IsEmpty)
        error("NEXT without FOR");
    var nl = StackFor.Pop();
    var StepCondition = StackFor_U.Pop();
    var ReplaceTo = StepCondition + "§" + Label("FOR", nl, "END") + ":";
    return ReplaceTo;
}
function ParseCond(W) {
    var signedcond = false;
    var usinga = true;
    var usingx = false;
    var usingy = false;
    var x;
    var Cast;
    var OriginalW = W;
    W = UpperCase(Trim(W));
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
    W = Trim(W);
    if (W.AnsiPos(">=") > 0) {
        Operator = ">=";
        var G = GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("<=") > 0) {
        Operator = "<=";
        var G = GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("<>") > 0) {
        Operator = "<>";
        var G = GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("!=") > 0) {
        Operator = "!=";
        var G = GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("==") > 0) {
        Operator = "==";
        var G = GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("=") > 0) {
        Operator = "=";
        var G = GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos(">") > 0) {
        Operator = ">";
        var G = GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("<") > 0) {
        Operator = "<";
        var G = GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    else if (W.AnsiPos("IS") > 0) {
        Operator = "IS";
        var G = GetToken(W, Operator);
        Register = G.Token;
        Operand = G.Rest;
    }
    Operand = Trim(Operand);
    Register = UpperCase(Trim(Register));
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
            Branch = "BEQ .+4\tBCS *";
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
            Branch = "BEQ .+4\tBPL *";
            BranchNot = "BMI *§\tBEQ *";
            cmp_not_needed = true;
        }
        else
            Operator = "#";
        if (Operand.startsWith("#") && cmp_not_needed && Eval1 !== "") {
            Eval1 = "\u00A7#IF " + RemoveHash(Operand) + " <> 0\u00A7" + Eval1 + "\u00A7#ENDIF\u00A7";
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
            Branch = "JR Z, .+4\tJR C, *";
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
            Branch = "JR Z, .+4\tJP NS, *";
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
function IsBitmap(Linea, nl) {
    var R = new RegExp(/^\s*bitmap\s+(.+)\s*$/igm);
    var match = R.exec(Linea);
    if (match === null)
        return undefined;
    var all = match[0], value = match[1];
    var Argomento = Trim(value);
    if (Argomento.Length() != 4 && Argomento.Length() != 8) {
        error("invalid BITMAP value: \"" + Argomento + "\" linea=" + Linea);
        return undefined;
    }
    var byteval = 0;
    if (Argomento.Length() == 8) {
        for (var t = 1, pos = 128; t <= 8; t++, pos = pos >> 1) {
            var c = Argomento.CharAt(t);
            if (c != '.' && c != '-' && c != '0') {
                byteval = byteval | pos;
            }
        }
    }
    else {
        for (var t = 1, pos = 6; t <= 4; t++, pos -= 2) {
            var c = Argomento.CharAt(t);
            var code = 0;
            if (c == '1' || c == 'B')
                code = 1;
            if (c == '2' || c == 'F')
                code = 2;
            if (c == '3' || c == 'A')
                code = 3;
            byteval = byteval | (code << pos);
        }
    }
    var ReplaceTo = "   " + BYTE + " " + byteval;
    return ReplaceTo;
}
// taken from http://locutus.io/c/math/frexp/
function frexp(arg) {
    //  discuss at: http://locutus.io/c/frexp/
    // original by: Oskar Larsson Högfeldt (http://oskar-lh.name/)
    //      note 1: Instead of
    //      note 1: double frexp( double arg, int* exp );
    //      note 1: this is built as
    //      note 1: [double, int] frexp( double arg );
    //      note 1: due to the lack of pointers in JavaScript.
    //      note 1: See code comments for further information.
    //   example 1: frexp(1)
    //   returns 1: [0.5, 1]
    //   example 2: frexp(1.5)
    //   returns 2: [0.75, 1]
    //   example 3: frexp(3 * Math.pow(2, 500))
    //   returns 3: [0.75, 502]
    //   example 4: frexp(-4)
    //   returns 4: [-0.5, 3]
    //   example 5: frexp(Number.MAX_VALUE)
    //   returns 5: [0.9999999999999999, 1024]
    //   example 6: frexp(Number.MIN_VALUE)
    //   returns 6: [0.5, -1073]
    //   example 7: frexp(-Infinity)
    //   returns 7: [-Infinity, 0]
    //   example 8: frexp(-0)
    //   returns 8: [-0, 0]
    //   example 9: frexp(NaN)
    //   returns 9: [NaN, 0]
    // Potential issue with this implementation:
    // the precisions of Math.pow and the ** operator are undefined in the ECMAScript standard,
    // however, sane implementations should give the same results for Math.pow(2, <integer>) operations
    // Like frexp of C and std::frexp of C++,
    // but returns an array instead of using a pointer argument for passing the exponent result.
    // Object.is(n, frexp(n)[0] * 2 ** frexp(n)[1]) for all number values of n except when Math.isFinite(n) && Math.abs(n) > 2**1023
    // Object.is(n, (2 * frexp(n)[0]) * 2 ** (frexp(n)[1] - 1)) for all number values of n
    // Object.is(n, frexp(n)[0]) for these values of n: 0, -0, NaN, Infinity, -Infinity
    // Math.abs(frexp(n)[0]) is >= 0.5 and < 1.0 for any other number-type value of n
    // See http://en.cppreference.com/w/c/numeric/math/frexp for a more detailed description
    arg = Number(arg);
    var result = [arg, 0];
    if (arg !== 0 && Number.isFinite(arg)) {
        var absArg = Math.abs(arg);
        // Math.log2 was introduced in ES2015, use it when available
        var log2 = Math.log2 || function log2(n) { return Math.log(n) * Math.LOG2E; };
        var exp = Math.max(-1023, Math.floor(log2(absArg)) + 1);
        var x = absArg * Math.pow(2, -exp);
        // These while loops compensate for rounding errors that sometimes occur because of ECMAScript's Math.log2's undefined precision
        // and also works around the issue of Math.pow(2, -exp) === Infinity when exp <= -1024
        while (x < 0.5) {
            x *= 2;
            exp--;
        }
        while (x >= 1) {
            x *= 0.5;
            exp++;
        }
        if (arg < 0) {
            x = -x;
        }
        result[0] = x;
        result[1] = exp;
    }
    return result;
}
/*
 *  IEEE double precision to CBM 5 byte float conversion
 *
 *  written 2008-06-19 by Michael Kircher
 */
function CBMFloat(S) {
    var number = Number(S); // atof
    var cbm_mantissa;
    var cbm_exponent;
    var _a = frexp(number), mantissa = _a[0], exponent = _a[1];
    cbm_mantissa = (4294967296.0 * Math.abs(mantissa)) & 0x7FFFFFFF + 2147483648 * (mantissa < 0 ? 1 : 0);
    cbm_exponent = 128 + exponent;
    if (number == 0.0) {
        cbm_exponent = 0;
        cbm_mantissa = 0;
    }
    var R = "$" + hex((cbm_exponent) & 0xFF) + "," +
        "$" + hex((cbm_mantissa >> 24) & 0xFF) + "," +
        "$" + hex((cbm_mantissa >> 16) & 0xFF) + "," +
        "$" + hex((cbm_mantissa >> 8) & 0xFF) + "," +
        "$" + hex((cbm_mantissa >> 0) & 0xFF);
    return R;
}
function IsFloat(Linea, nl) {
    Linea = UpperCase(Trim(Linea)) + " ";
    var NomeLabel;
    var StringaFloat;
    var Def;
    var ReplaceTo = "";
    var G = GetToken(Linea, " ");
    Linea = G.Rest;
    NomeLabel = Trim(G.Token);
    if (NomeLabel == "FLOAT") {
        StringaFloat = NomeLabel;
        NomeLabel = "";
        Def = Linea;
    }
    else {
        Linea = Trim(Linea);
        G = GetToken(Linea, " ");
        Linea = G.Rest;
        StringaFloat = Trim(G.Token);
        if (StringaFloat != "FLOAT")
            return undefined;
        Def = Linea;
    }
    ReplaceTo = NomeLabel + (" " + BYTE + " ");
    Def = Trim(Def) + ",";
    for (;;) {
        Def = Trim(Def);
        G = GetToken(Def, ",");
        Def = G.Rest;
        var Numero = Trim(G.Token);
        if (Numero == "")
            break;
        ReplaceTo = ReplaceTo + CBMFloat(Numero) + ",";
    }
    ReplaceTo = ReplaceTo.SubString(1, ReplaceTo.Length() - 1);
    return ReplaceTo;
}
function IsMACRO(Linea, nl) {
    Linea = UpperCase(Trim(Linea)) + " ";
    var PM;
    var PList = [];
    var G = GetToken(Linea, " ");
    Linea = G.Rest;
    var StringaMacro = G.Token;
    if (StringaMacro != "MACRO")
        return undefined;
    G = GetToken(Linea, " ");
    Linea = G.Rest;
    var NomeMacro = G.Token;
    // permette il carattere "." nel nome macro
    NomeMacro = NomeMacro.replace(/\./g, "_");
    NomeMacro = Trim(NomeMacro);
    if (NomeMacro == "") {
        error("no macro name", nl);
    }
    PM = Linea + ",";
    var NM = NomeMacro;
    // processa i parametri della macro
    for (;;) {
        G = GetToken(PM, ",");
        PM = G.Rest;
        var Dummy = Trim(G.Token);
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
    Linea = UpperCase(Trim(Linea)) + " ";
    var G = GetToken(Linea, " ");
    Linea = G.Rest;
    var NomeMacro = G.Token;
    var Parametri = Trim(Linea);
    // empty macro
    if (NomeMacro == "")
        return undefined;
    // permette il carattere "." nel nome macro
    NomeMacro = NomeMacro.replace(/\./g, "_");
    var matchingMacros = AllMacros.filter(function (e) { return e.Name === NomeMacro; });
    if (matchingMacros.length === 0)
        return undefined;
    // console.log(`matched macro ${NomeMacro}: ${matchingMacros.length} macros`);
    // build plist
    var prm = Linea + ",";
    var orig = Linea;
    var list = [];
    var actualparms = [];
    for (;;) {
        G = GetToken(prm, ",");
        var p = Trim(G.Token);
        prm = G.Rest;
        if (p == "")
            break;
        actualparms.push(p);
        if (p.startsWith("#"))
            list.push("CONST");
        else if (p.startsWith("(") && p.endsWith(")"))
            list.push("INDIRECT");
        else 
        //if(p.startsWith('"') && p.endsWith('"')) list.push(p);
        if (p == "A" || p == "B" || p == "C" || p == "D" || p == "E" || p == "H" || p == "L" || p == "IX" || p == "IY" || p == "X" || p == "Y")
            list.push("\"" + p + "\"");
        else
            list.push("MEM");
    }
    var matching = matchingMacros.filter(function (e) { return e.Parameters.join(",") === list.join(","); });
    if (matching.length === 0)
        return undefined;
    else if (matching.length !== 1)
        error("more than on macro matching \"" + NomeMacro + "\"");
    var foundMacro = matching[0];
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
    return ReplaceTo;
}
function IsSUB(Linea, nl) {
    Linea = UpperCase(Trim(Linea)) + " ";
    var StringaSUB = GetParm(Linea, " ", 0);
    if (StringaSUB != "SUB")
        return undefined;
    var NomeSub = Trim(GetParm(Linea, " ", 1));
    // toglie eventuale "()"
    if (NomeSub.Length() > 2 && NomeSub.SubString(NomeSub.Length() - 1, 2) == "()") {
        NomeSub = NomeSub.SubString(1, NomeSub.Length() - 2);
    }
    // non è una sub ma la macro "sub"
    if (NomeSub.AnsiPos(",") > 0)
        return undefined;
    var ReplaceTo = NomeSub + ":";
    StackSub.Add(nl);
    return ReplaceTo;
}
function IsEXITSUB(Linea, nl) {
    Linea = UpperCase(Trim(Linea)) + " ";
    var StringaREPEAT;
    var G = GetToken(Linea, " THEN EXIT SUB");
    Linea = G.Rest;
    StringaREPEAT = G.Token;
    if (StringaREPEAT != "") {
        if (StackSub.IsEmpty)
            error("not in SUB");
        nl = StackSub.Last();
        var ReplaceTo_1 = StringaREPEAT + " THEN GOTO " + Label("SUB", nl, "END");
        return ReplaceTo_1;
    }
    G = GetToken(Linea, " ");
    Linea = G.Rest;
    StringaREPEAT = G.Token;
    var ReplaceTo = "   rts";
    if (StringaREPEAT == "EXITSUB")
        return ReplaceTo;
    if (StringaREPEAT == "EXIT") {
        G = GetToken(Linea, " ");
        StringaREPEAT = G.Token;
        if (StringaREPEAT == "SUB")
            return ReplaceTo;
    }
    return undefined;
}
function IsENDSUB(Linea, nl) {
    Linea = UpperCase(Trim(Linea)) + " ";
    var StringaEndMacro = GetParm(Linea, " ", 0);
    var StringaEndMacro1 = GetParm(Linea, " ", 1);
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
//---------------------------------------------------------------------------
function IsBasicStart(Linea) {
    return Linea.toUpperCase().AnsiPos("BASIC START") > 0;
}
function IsBasicEnd(Linea) {
    return Linea.toUpperCase().AnsiPos("BASIC END") > 0;
}
function IsBasic(Linea, nl) {
    Linea = UpperCase(Trim(Linea)) + " ";
    var StuffLine;
    var si = -1;
    // compact lines with no no line numbers into the previous numbered line
    if (IsBasicStart(Linea)) {
        for (var t = nl + 1; t < L.Count; t++) {
            var Linx = UpperCase(Trim(L.Strings[t]));
            if (IsBasicEnd(Linx))
                break;
            if (StartWithNumber(Linx)) {
                si = t;
            }
            else {
                if (si == -1) {
                    error("BASIC line continuing from no line number in line " + t);
                    break;
                }
                L.Strings[si] = L.Strings[si].trim() + ":" + Linx; // \r is here
                L.Strings[t] = "";
            }
        }
    }
    if (Linea.AnsiPos("BASIC START") > 0) {
        if (Linea.AnsiPos("COMPACT") > 0)
            BasicCompact = true;
        L.Strings[nl] = "";
        for (var t = nl + 1; t < L.Count; t++) {
            Linea = UpperCase(Trim(L.Strings[t]));
            if (Linea.AnsiPos("BASIC END") > 0) {
                L.Strings[t] = "basic_row_" + basic_row + ":  " + BYTE + " 0,0";
                return true;
            }
            L.Strings[t] = TranslateBasic(Trim(L.Strings[t]) + " ");
        }
        error("BASIC START without BASIC END");
    }
    return false;
}
function StartWithNumber(Linea) {
    var LineNumber = Trim(GetParm(Linea, " ", 0));
    if (LineNumber == "")
        return false;
    var numlin;
    try {
        numlin = LineNumber.ToInt();
        if (numlin < 0 || isNaN(numlin))
            return false;
    }
    catch (ex) {
        return false;
    }
    return true;
}
function MatchToken(Linea, inquote, inrem) {
    var keywords = Object.keys(TokensKeywords);
    for (var t = 0; t < keywords.length; t++) {
        var keyword = keywords[t];
        var index = TokensKeywords[keyword];
        var l = keyword.Length();
        if (l > 0 && Linea.SubString(1, l) === keyword) {
            // console.log(`matched token: ${Tokens[t]}`);
            Linea = Linea.SubString(l + 1);
            var Matched = index + ",";
            // REM or DATA
            if (index == 143 || index == 131)
                inrem = true;
            return { Matched: Matched, Linea: Linea, inquote: inquote, inrem: inrem };
        }
    }
    return undefined;
}
function MatchTextToken(Linea, inquote, inrem) {
    // match text
    var keys = Object.keys(TokensText);
    for (var t = 0; t < keys.length; t++) {
        var text = keys[t];
        var index = TokensText[text];
        var l = text.Length();
        if (l > 0 && Linea.SubString(1, l) === text) {
            // console.log(`matched text: ${Tokens[t]}`);
            Linea = Linea.SubString(l + 1);
            var Matched = "";
            if (!(BasicCompact == true && index == 32)) {
                Matched = index + ",";
            }
            if (index == 34)
                inquote = true;
            return { Matched: Matched, Linea: Linea, inquote: inquote, inrem: inrem };
        }
    }
    return undefined;
}
function MatchSymbol(Linea, inquote, inrem) {
    // match reference to symbol {symbol}, rendered as a 4 character basic number
    if (Linea.SubString(1, 1) == "{") {
        var x = Linea.AnsiPos("}");
        if (x > 0) {
            var Symbol_1 = Linea.SubString(2, x - 2);
            Linea = Linea.SubString(x + 1);
            var prima_cifra = "[[" + mod(Symbol_1, "10") + "] + $30]";
            var seconda_cifra = "[[[" + mod(Symbol_1, "100") + "-[" + mod(Symbol_1, "10") + "]]/10] + $30]";
            var terza_cifra = "[[[" + mod(Symbol_1, "1000") + "-[" + mod(Symbol_1, "100") + "]]/100] + $30]";
            var quarta_cifra = "[[[" + mod(Symbol_1, "10000") + "-[" + mod(Symbol_1, "1000") + "]]/1000] + $30]";
            var quinta_cifra = "[[[" + mod(Symbol_1, "100000") + "-[" + mod(Symbol_1, "10000") + "]]/10000] + $30]";
            var Matched = quarta_cifra + "," + terza_cifra + "," + seconda_cifra + "," + prima_cifra + ",";
            return { Matched: Matched, Linea: Linea, inquote: inquote, inrem: inrem };
        }
    }
    return undefined;
}
function MatchQuote(Linea, inquote, inrem) {
    if (inquote) {
        var codes = Object.keys(Ascii);
        for (var j = 0; j < codes.length; j++) {
            var code = codes[j];
            var t = Ascii[code];
            var l = code.Length();
            if (l > 0 && Linea.SubString(1, l) == UpperCase(code)) {
                // console.log(`matched string text: ${Ascii[t]}`);
                Linea = Linea.SubString(l + 1);
                var Matched = t + ",";
                if (t == 34)
                    inquote = false;
                return { Matched: Matched, Linea: Linea, inquote: inquote, inrem: inrem };
            }
        }
    }
    return undefined;
}
function MatchRem(Linea, inquote, inrem) {
    // within rem, matches to the end of line
    if (inrem) {
        // console.log("we are in rem");
        var codes = Object.keys(Ascii);
        for (var j = 0; j <= codes.length; j++) {
            var code = codes[j];
            var t = Ascii[code];
            var l = code.Length();
            if (l > 0 && Linea.SubString(1, l) == UpperCase(code)) {
                // console.log(`matched REM text: ${Ascii[t]}`);
                Linea = Linea.SubString(l + 1);
                var Matched = t + ",";
                return { Matched: Matched, Linea: Linea, inquote: inquote, inrem: inrem };
            }
        }
    }
    return undefined;
}
function TranslateBasic(Linea) {
    function advance(match) {
        if (match !== undefined) {
            Compr += match.Matched;
            Linea = match.Linea;
            inquote = match.inquote;
            inrem = match.inrem;
            return true;
        }
        return false;
    }
    // skip empty lines
    if (Trim(Linea) == "")
        return "";
    Linea = UpperCase(Linea); // TODO remove uppercase
    var G = GetToken(Linea, " ");
    Linea = G.Rest;
    var LineNumber = Trim(G.Token);
    if (LineNumber == "")
        error("syntax error");
    var numlin = LineNumber.ToInt();
    var Compr = "";
    var inquote = false;
    var inrem = false;
    Linea = Trim(Linea);
    for (;;) {
        if (Linea == "")
            break;
        if (!inquote && !inrem) {
            var match = MatchToken(Linea, inquote, inrem);
            if (!advance(match)) {
                var match_1 = MatchTextToken(Linea, inquote, inrem);
                if (!advance(match_1)) {
                    var match_2 = MatchSymbol(Linea, inquote, inrem);
                    if (!advance(match_2)) {
                        console.log("unrecognized keyword token: " + Linea);
                        error("unrecognized keyword token: " + Linea);
                    }
                }
            }
        }
        else if (inquote) {
            // within quote, matches everything to next quote (")
            var match = MatchQuote(Linea, inquote, inrem);
            if (!advance(match)) {
                console.log("unrecognized quoted text token: " + Linea);
                error("unrecognized quoted text token");
            }
        }
        else if (inrem) {
            // inrem (or data)
            var match = MatchRem(Linea, inquote, inrem);
            if (!advance(match)) {
                console.log("unrecognized rem/data text token: " + Linea);
                error("unrecognized rem/data text token");
            }
        }
    }
    Compr = Compr + "0";
    var Label = "basic_row_" + basic_row + ":";
    var NextLabel = "basic_row_" + (basic_row + 1);
    var ReplaceTo = Label + ("  " + BYTE + " [" + lobyte(NextLabel) + "],[" + hibyte(NextLabel) + "],[" + lobyte(numlin.toString()) + "],[" + hibyte(numlin.toString()) + "]," + Compr);
    if (PARENS !== "[]") {
        ReplaceTo = ReplaceTo.replace(/\[/g, "(").replace(/\]/g, ")");
    }
    basic_row++;
    return ReplaceTo;
}
function InitTokens() {
    TokensText[" "] = 32;
    TokensText["!"] = 33;
    TokensText["\x22"] = 34;
    TokensText["#"] = 35;
    TokensText["$"] = 36;
    TokensText["%"] = 37;
    TokensText["&"] = 38;
    TokensText["'"] = 39;
    TokensText["("] = 40;
    TokensText[")"] = 41;
    TokensText["*"] = 42;
    TokensText["+"] = 43;
    TokensText[","] = 44;
    TokensText["-"] = 45;
    TokensText["."] = 46;
    TokensText["/"] = 47;
    TokensText["0"] = 48;
    TokensText["1"] = 49;
    TokensText["2"] = 50;
    TokensText["3"] = 51;
    TokensText["4"] = 52;
    TokensText["5"] = 53;
    TokensText["6"] = 54;
    TokensText["7"] = 55;
    TokensText["8"] = 56;
    TokensText["9"] = 57;
    TokensText[":"] = 58;
    TokensText[";"] = 59;
    TokensText["<"] = 60;
    TokensText["="] = 61;
    TokensText[">"] = 62;
    TokensText["?"] = 63;
    TokensText["@"] = 64;
    TokensText["A"] = 65;
    TokensText["B"] = 66;
    TokensText["C"] = 67;
    TokensText["D"] = 68;
    TokensText["E"] = 69;
    TokensText["F"] = 70;
    TokensText["G"] = 71;
    TokensText["H"] = 72;
    TokensText["I"] = 73;
    TokensText["J"] = 74;
    TokensText["K"] = 75;
    TokensText["L"] = 76;
    TokensText["M"] = 77;
    TokensText["N"] = 78;
    TokensText["O"] = 79;
    TokensText["P"] = 80;
    TokensText["Q"] = 81;
    TokensText["R"] = 82;
    TokensText["S"] = 83;
    TokensText["T"] = 84;
    TokensText["U"] = 85;
    TokensText["V"] = 86;
    TokensText["W"] = 87;
    TokensText["X"] = 88;
    TokensText["Y"] = 89;
    TokensText["Z"] = 90;
    TokensText["["] = 91;
    TokensText["£"] = 92;
    TokensText["]"] = 93;
    TokensText["^"] = 94;
    TokensText["{left arrow}"] = 95;
    TokensKeywords["END"] = 128;
    TokensKeywords["FOR"] = 129;
    TokensKeywords["NEXT"] = 130;
    TokensKeywords["DATA"] = 131;
    TokensKeywords["INPUT#"] = 132;
    TokensKeywords["INPUT"] = 133;
    TokensKeywords["DIM"] = 134;
    TokensKeywords["READ"] = 135;
    TokensKeywords["LET"] = 136;
    TokensKeywords["GOTO"] = 137;
    TokensKeywords["RUN"] = 138;
    TokensKeywords["IF"] = 139;
    TokensKeywords["RESTORE"] = 140;
    TokensKeywords["GOSUB"] = 141;
    TokensKeywords["RETURN"] = 142;
    TokensKeywords["REM"] = 143;
    TokensKeywords["STOP"] = 144;
    TokensKeywords["ON"] = 145;
    TokensKeywords["WAIT"] = 146;
    TokensKeywords["LOAD"] = 147;
    TokensKeywords["SAVE"] = 148;
    TokensKeywords["VERIFY"] = 149;
    TokensKeywords["DEF"] = 150;
    TokensKeywords["POKE"] = 151;
    TokensKeywords["PRINT#"] = 152;
    TokensKeywords["PRINT"] = 153;
    TokensKeywords["CONT"] = 154;
    TokensKeywords["LIST"] = 155;
    TokensKeywords["CLR"] = 156;
    TokensKeywords["CMD"] = 157;
    TokensKeywords["SYS"] = 158;
    TokensKeywords["OPEN"] = 159;
    TokensKeywords["CLOSE"] = 160;
    TokensKeywords["GET"] = 161;
    TokensKeywords["NEW"] = 162;
    TokensKeywords["TAB("] = 163;
    TokensKeywords["TO"] = 164;
    TokensKeywords["FN"] = 165;
    TokensKeywords["SPC("] = 166;
    TokensKeywords["THEN"] = 167;
    TokensKeywords["NOT"] = 168;
    TokensKeywords["STEP"] = 169;
    TokensKeywords["+"] = 170;
    TokensKeywords["-"] = 171;
    TokensKeywords["*"] = 172;
    TokensKeywords["/"] = 173;
    TokensKeywords["^"] = 174;
    TokensKeywords["AND"] = 175;
    TokensKeywords["OR"] = 176;
    TokensKeywords[">"] = 177;
    TokensKeywords["="] = 178;
    TokensKeywords["<"] = 179;
    TokensKeywords["SGN"] = 180;
    TokensKeywords["INT"] = 181;
    TokensKeywords["ABS"] = 182;
    TokensKeywords["USR"] = 183;
    TokensKeywords["FRE"] = 184;
    TokensKeywords["POS"] = 185;
    TokensKeywords["SQR"] = 186;
    TokensKeywords["RND"] = 187;
    TokensKeywords["LOG"] = 188;
    TokensKeywords["EXP"] = 189;
    TokensKeywords["COS"] = 190;
    TokensKeywords["SIN"] = 191;
    TokensKeywords["TAN"] = 192;
    TokensKeywords["ATN"] = 193;
    TokensKeywords["PEEK"] = 194;
    TokensKeywords["LEN"] = 195;
    TokensKeywords["STR$"] = 196;
    TokensKeywords["VAL"] = 197;
    TokensKeywords["ASC"] = 198;
    TokensKeywords["CHR$"] = 199;
    TokensKeywords["LEFT$"] = 200;
    TokensKeywords["RIGHT$"] = 201;
    TokensKeywords["MID$"] = 202;
    TokensKeywords["{pi}"] = 255;
    /*
       Tokens[32] = " ";
       Tokens[33] = "!";
       Tokens[34] = "\x22";
       Tokens[35] = "#";
       Tokens[36] = "$";
       Tokens[37] = "%";
       Tokens[38] = "&";
       Tokens[39] = "'";
       Tokens[40] = "(";
       Tokens[41] = ")";
       Tokens[42] = "*";
       Tokens[43] = "+";
       Tokens[44] = ",";
       Tokens[45] = "-";
       Tokens[46] = ".";
       Tokens[47] = "/";
       Tokens[48] = "0";
       Tokens[49] = "1";
       Tokens[50] = "2";
       Tokens[51] = "3";
       Tokens[52] = "4";
       Tokens[53] = "5";
       Tokens[54] = "6";
       Tokens[55] = "7";
       Tokens[56] = "8";
       Tokens[57] = "9";
       Tokens[58] = ":";
       Tokens[59] = ";";
       Tokens[60] = "<";
       Tokens[61] = "=";
       Tokens[62] = ">";
       Tokens[63] = "?";
       Tokens[64] = "@";
       Tokens[65] = "A";
       Tokens[66] = "B";
       Tokens[67] = "C";
       Tokens[68] = "D";
       Tokens[69] = "E";
       Tokens[70] = "F";
       Tokens[71] = "G";
       Tokens[72] = "H";
       Tokens[73] = "I";
       Tokens[74] = "J";
       Tokens[75] = "K";
       Tokens[76] = "L";
       Tokens[77] = "M";
       Tokens[78] = "N";
       Tokens[79] = "O";
       Tokens[80] = "P";
       Tokens[81] = "Q";
       Tokens[82] = "R";
       Tokens[83] = "S";
       Tokens[84] = "T";
       Tokens[85] = "U";
       Tokens[86] = "V";
       Tokens[87] = "W";
       Tokens[88] = "X";
       Tokens[89] = "Y";
       Tokens[90] = "Z";
       Tokens[91] = "[";
       Tokens[92] = "£";
       Tokens[93] = "]";
       Tokens[94] = "^";
       Tokens[95] = "{left arrow}";
       Tokens[128]= "END";
       Tokens[129]= "FOR";
       Tokens[130]= "NEXT";
       Tokens[131]= "DATA";
       Tokens[132]= "INPUT#";
       Tokens[133]= "INPUT";
       Tokens[134]= "DIM";
       Tokens[135]= "READ";
       Tokens[136]= "LET";
       Tokens[137]= "GOTO";
       Tokens[138]= "RUN";
       Tokens[139]= "IF";
       Tokens[140]= "RESTORE";
       Tokens[141]= "GOSUB";
       Tokens[142]= "RETURN";
       Tokens[143]= "REM";
       Tokens[144]= "STOP";
       Tokens[145]= "ON";
       Tokens[146]= "WAIT";
       Tokens[147]= "LOAD";
       Tokens[148]= "SAVE";
       Tokens[149]= "VERIFY";
       Tokens[150]= "DEF";
       Tokens[151]= "POKE";
       Tokens[152]= "PRINT#";
       Tokens[153]= "PRINT";
       Tokens[154]= "CONT";
       Tokens[155]= "LIST";
       Tokens[156]= "CLR";
       Tokens[157]= "CMD";
       Tokens[158]= "SYS";
       Tokens[159]= "OPEN";
       Tokens[160]= "CLOSE";
       Tokens[161]= "GET";
       Tokens[162]= "NEW";
       Tokens[163]= "TAB(";
       Tokens[164]= "TO";
       Tokens[165]= "FN";
       Tokens[166]= "SPC(";
       Tokens[167]= "THEN";
       Tokens[168]= "NOT";
       Tokens[169]= "STEP";
       Tokens[170]= "+";
       Tokens[171]= "-";
       Tokens[172]= "*";
       Tokens[173]= "/";
       Tokens[174]= "^";
       Tokens[175]= "AND";
       Tokens[176]= "OR";
       Tokens[177]= ">";
       Tokens[178]= "=";
       Tokens[179]= "<";
       Tokens[180]= "SGN";
       Tokens[181]= "INT";
       Tokens[182]= "ABS";
       Tokens[183]= "USR";
       Tokens[184]= "FRE";
       Tokens[185]= "POS";
       Tokens[186]= "SQR";
       Tokens[187]= "RND";
       Tokens[188]= "LOG";
       Tokens[189]= "EXP";
       Tokens[190]= "COS";
       Tokens[191]= "SIN";
       Tokens[192]= "TAN";
       Tokens[193]= "ATN";
       Tokens[194]= "PEEK";
       Tokens[195]= "LEN";
       Tokens[196]= "STR$";
       Tokens[197]= "VAL";
       Tokens[198]= "ASC";
       Tokens[199]= "CHR$";
       Tokens[200]= "LEFT$";
       Tokens[201]= "RIGHT$";
       Tokens[202]= "MID$";
       for(let t=203;t<=254;t++) Tokens[t] = "";
       Tokens[255]= "{pi}";
    */
    Ascii["{rev a}"] = 1;
    Ascii["{rev b}"] = 2;
    Ascii["{run stop}"] = 3;
    Ascii["{rev d}"] = 4;
    Ascii["{wht}"] = 5;
    Ascii["{white}"] = 5;
    Ascii["{rev f}"] = 6;
    Ascii["{rev g}"] = 7;
    Ascii["{rev h}"] = 8;
    Ascii["{rev i}"] = 9;
    Ascii["{rev j}"] = 10;
    Ascii["{rev k}"] = 11;
    Ascii["{rev l}"] = 12;
    Ascii["{return}"] = 13;
    Ascii["{rev n}"] = 14;
    Ascii["{rev o}"] = 15;
    Ascii["{rev p}"] = 16;
    Ascii["{down}"] = 17;
    Ascii["{rvs on}"] = 18;
    Ascii["{home}"] = 19;
    Ascii["{del}"] = 20;
    Ascii["{rev u}"] = 21;
    Ascii["{rev v}"] = 22;
    Ascii["{rev w}"] = 23;
    Ascii["{rev x}"] = 24;
    Ascii["{rev y}"] = 25;
    Ascii["{rev z}"] = 26;
    Ascii["{rev [}"] = 27;
    Ascii["{red}"] = 28;
    Ascii["{right}"] = 29;
    Ascii["{grn}"] = 30;
    Ascii["{green}"] = 30;
    Ascii["{blu}"] = 31;
    Ascii["{blue}"] = 31;
    Ascii[" "] = 32;
    Ascii["!"] = 33;
    Ascii["\x22"] = 34;
    Ascii["#"] = 35;
    Ascii["$"] = 36;
    Ascii["%"] = 37;
    Ascii["&"] = 38;
    Ascii["'"] = 39;
    Ascii["("] = 40;
    Ascii[")"] = 41;
    Ascii["*"] = 42;
    Ascii["+"] = 43;
    Ascii[","] = 44;
    Ascii["-"] = 45;
    Ascii["."] = 46;
    Ascii["/"] = 47;
    Ascii["0"] = 48;
    Ascii["1"] = 49;
    Ascii["2"] = 50;
    Ascii["3"] = 51;
    Ascii["4"] = 52;
    Ascii["5"] = 53;
    Ascii["6"] = 54;
    Ascii["7"] = 55;
    Ascii["8"] = 56;
    Ascii["9"] = 57;
    Ascii[":"] = 58;
    Ascii[";"] = 59;
    Ascii["<"] = 60;
    Ascii["="] = 61;
    Ascii[">"] = 62;
    Ascii["?"] = 63;
    Ascii["@"] = 64;
    Ascii["A"] = 65;
    Ascii["B"] = 66;
    Ascii["C"] = 67;
    Ascii["D"] = 68;
    Ascii["E"] = 69;
    Ascii["F"] = 70;
    Ascii["G"] = 71;
    Ascii["H"] = 72;
    Ascii["I"] = 73;
    Ascii["J"] = 74;
    Ascii["K"] = 75;
    Ascii["L"] = 76;
    Ascii["M"] = 77;
    Ascii["N"] = 78;
    Ascii["O"] = 79;
    Ascii["P"] = 80;
    Ascii["Q"] = 81;
    Ascii["R"] = 82;
    Ascii["S"] = 83;
    Ascii["T"] = 84;
    Ascii["U"] = 85;
    Ascii["V"] = 86;
    Ascii["W"] = 87;
    Ascii["X"] = 88;
    Ascii["Y"] = 89;
    Ascii["Z"] = 90;
    Ascii["["] = 91;
    Ascii["£"] = 92;
    Ascii["]"] = 93;
    Ascii["^"] = 94;
    Ascii["{left arrow}"] = 95;
    Ascii["{shift *}"] = 96;
    Ascii["{shift a}"] = 97;
    Ascii["{shift b}"] = 98;
    Ascii["{shift c}"] = 99;
    Ascii["{shift d}"] = 100;
    Ascii["{shift e}"] = 101;
    Ascii["{shift f}"] = 102;
    Ascii["{shift g}"] = 103;
    Ascii["{shift h}"] = 104;
    Ascii["{shift i}"] = 105;
    Ascii["{shift j}"] = 106;
    Ascii["{shift k}"] = 107;
    Ascii["{shift l}"] = 108;
    Ascii["{shift m}"] = 109;
    Ascii["{shift n}"] = 110;
    Ascii["{shift o}"] = 111;
    Ascii["{shift p}"] = 112;
    Ascii["{shift q}"] = 113;
    Ascii["{shift r}"] = 114;
    Ascii["{shift s}"] = 115;
    Ascii["{shift t}"] = 116;
    Ascii["{shift u}"] = 117;
    Ascii["{shift v}"] = 118;
    Ascii["{shift w}"] = 119;
    Ascii["{119}"] = 119;
    Ascii["{shift x}"] = 120;
    Ascii["{shift y}"] = 121;
    Ascii["{shift z}"] = 122;
    Ascii["{shift +}"] = 123;
    Ascii["{cbm -}"] = 124;
    Ascii["{shift -}"] = 125;
    Ascii["{pi}"] = 126;
    Ascii["{cbm *}"] = 127;
    Ascii["{rev shift *}"] = 128;
    Ascii["{rev shift a}"] = 129;
    Ascii["{cbm 1}"] = 129;
    Ascii["{orange}"] = 129;
    Ascii["{rev shift b}"] = 130;
    Ascii["{rev shift c}"] = 131;
    Ascii["{rev shift d}"] = 132;
    Ascii["{f1}"] = 133;
    Ascii["{f3}"] = 134;
    Ascii["{f5}"] = 135;
    Ascii["{f7}"] = 136;
    Ascii["{f2}"] = 137;
    Ascii["{f4}"] = 138;
    Ascii["{f6}"] = 139;
    Ascii["{f8}"] = 140;
    Ascii["{rev shift m}"] = 141;
    Ascii["{rev shift n}"] = 142;
    Ascii["{rev shift o}"] = 143;
    Ascii["{blk}"] = 144;
    Ascii["{black}"] = 144;
    Ascii["{up}"] = 145;
    Ascii["{rvs off}"] = 146;
    Ascii["{clr}"] = 147;
    Ascii["{clear}"] = 147;
    Ascii["{inst}"] = 148;
    Ascii["{rev shift u}"] = 149;
    Ascii["{cbm 2}"] = 149;
    Ascii["{brown}"] = 149;
    Ascii["{rev shift v}"] = 150;
    Ascii["{cbm 3}"] = 150;
    Ascii["{light red}"] = 150;
    Ascii["{rev shift w}"] = 151;
    Ascii["{cbm 4}"] = 151;
    Ascii["{dark gray}"] = 151;
    Ascii["{rev shift x}"] = 152;
    Ascii["{cbm 5}"] = 152;
    Ascii["{gray}"] = 152;
    Ascii["{rev shift y}"] = 153;
    Ascii["{cbm 6}"] = 153;
    Ascii["{light green}"] = 153;
    Ascii["{rev shift z}"] = 154;
    Ascii["{cbm 7}"] = 154;
    Ascii["{light blue}"] = 154;
    Ascii["{rev shift +}"] = 155;
    Ascii["{cbm 8}"] = 155;
    Ascii["{light gray}"] = 155;
    Ascii["{pur}"] = 156;
    Ascii["{purple}"] = 156;
    Ascii["{left}"] = 157;
    Ascii["{yel}"] = 158;
    Ascii["{yellow}"] = 158;
    Ascii["{cyn}"] = 159;
    Ascii["{cyan}"] = 159;
    Ascii["{160}"] = 160;
    Ascii["{cbm k}"] = 161;
    Ascii["{cbm i}"] = 162;
    Ascii["{cbm t}"] = 163;
    Ascii["{cbm @}"] = 164;
    Ascii["{cbm g}"] = 165;
    Ascii["{cbm +}"] = 166;
    Ascii["{cbm m}"] = 167;
    Ascii["{cbm £}"] = 168;
    Ascii["{shift £}"] = 169;
    Ascii["{cbm n}"] = 170;
    Ascii["{cbm q}"] = 171;
    Ascii["{cbm d}"] = 172;
    Ascii["{cbm z}"] = 173;
    Ascii["{cbm s}"] = 174;
    Ascii["{cbm p}"] = 175;
    Ascii["{cbm a}"] = 176;
    Ascii["{cbm e}"] = 177;
    Ascii["{cbm r}"] = 178;
    Ascii["{cbm w}"] = 179;
    Ascii["{cbm h}"] = 180;
    Ascii["{cbm j}"] = 181;
    Ascii["{cbm l}"] = 182;
    Ascii["{cbm y}"] = 183;
    Ascii["{cbm u}"] = 184;
    Ascii["{cbm o}"] = 185;
    Ascii["{shift @}"] = 186;
    Ascii["{cbm f}"] = 187;
    Ascii["{cbm c}"] = 188;
    Ascii["{cbm x}"] = 189;
    Ascii["{cbm v}"] = 190;
    Ascii["{cbm b}"] = 191;
    Ascii["{shift *}"] = 192;
    Ascii["{shift a}"] = 193;
    Ascii["{shift b}"] = 194;
    Ascii["{shift c}"] = 195;
    Ascii["{shift d}"] = 196;
    Ascii["{shift e}"] = 197;
    Ascii["{shift f}"] = 198;
    Ascii["{shift g}"] = 199;
    Ascii["{shift h}"] = 200;
    Ascii["{shift i}"] = 201;
    Ascii["{shift j}"] = 202;
    Ascii["{shift k}"] = 203;
    Ascii["{shift l}"] = 204;
    Ascii["{shift m}"] = 205;
    Ascii["{shift n}"] = 206;
    Ascii["{shift o}"] = 207;
    Ascii["{shift p}"] = 208;
    Ascii["{shift q}"] = 209;
    Ascii["{shift r}"] = 210;
    Ascii["{shift s}"] = 211;
    Ascii["{shift t}"] = 212;
    Ascii["{shift u}"] = 213;
    Ascii["{shift v}"] = 214;
    Ascii["{shift w}"] = 215;
    Ascii["{shift x}"] = 216;
    Ascii["{shift y}"] = 217;
    Ascii["{shift z}"] = 218;
    Ascii["{shift +}"] = 219;
    Ascii["{cbm -}"] = 220;
    Ascii["{shift -}"] = 221;
    Ascii["{pi}"] = 222;
    Ascii["{cbm *}"] = 223;
    Ascii["{224}"] = 224;
    Ascii["{cbm k}"] = 225;
    Ascii["{cbm i}"] = 226;
    Ascii["{cbm t}"] = 227;
    Ascii["{cbm @}"] = 228;
    Ascii["{cbm g}"] = 229;
    Ascii["{cbm +}"] = 230;
    Ascii["{cbm m}"] = 231;
    Ascii["{cbm £}"] = 232;
    Ascii["{shift £}"] = 233;
    Ascii["{cbm n}"] = 234;
    Ascii["{cbm q}"] = 235;
    Ascii["{cbm d}"] = 236;
    Ascii["{cbm z}"] = 237;
    Ascii["{cbm s}"] = 238;
    Ascii["{cbm p}"] = 239;
    Ascii["{cbm a}"] = 240;
    Ascii["{cbm e}"] = 241;
    Ascii["{cbm r}"] = 242;
    Ascii["{cbm w}"] = 243;
    Ascii["{cbm h}"] = 244;
    Ascii["{cbm j}"] = 245;
    Ascii["{cbm l}"] = 246;
    Ascii["{cbm y}"] = 247;
    Ascii["{cbm u}"] = 248;
    Ascii["{cbm o}"] = 249;
    Ascii["{cbm @}"] = 250;
    Ascii["{cbm f}"] = 251;
    Ascii["{cbm c}"] = 252;
    Ascii["{cbm x}"] = 253;
    Ascii["{cbm v}"] = 254;
    Ascii["{pi}"] = 255;
}
main();
