#!/usr/bin/env node
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    }
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
    return "0x" + (value <= 0xF ? "0" : "") + value.toString(16);
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
var Tokens = []; // 256
var Ascii = []; // 256
var Ferr;
var dasm = false;
var z80asm = false;
var cpu6502 = false;
var cpuz80 = false;
var JMP;
var BYTE;
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
    z80asm = options.target === "z80asm";
    cpu6502 = dasm;
    cpuz80 = z80asm;
    if (cpu6502) {
        JMP = "JMP";
        BYTE = "byte";
    }
    if (cpuz80) {
        JMP = "JP ";
        BYTE = "defb";
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
    // remove ; comments   
    for (var t = 0; t < L.Count; t++) {
        var R = new RegExp(/(.*);(?=(?:[^"]*"[^"]*")*[^"]*$)(.*)/gmi);
        var Linea = L.Strings[t];
        var match = R.exec(Linea);
        if (match !== null) {
            var all = match[0], purged = match[1], comment = match[2];
            L.Strings[t] = purged;
        }
    }
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
function RemoveSemicolon() {
    var Whole = L.Text();
    var ReplaceTo = " \x0d\x0a\t ";
    Whole = Whole.replace(/ : /g, ReplaceTo);
    L.SetText(Whole);
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
    RemoveSemicolon();
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
    // scan for basic
    for (t = 0; t < L.Count; t++) {
        var Dummy = L.Strings[t];
        var ReplaceTo = IsBasic(Dummy, t);
        // IsBasic does replace by itself
        // if(ReplaceTo !== undefined) L.Strings[t] = ReplaceTo;        
    }
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
    // substitute DASM keywords
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
    var StringaStep;
    var Register;
    var StartValue;
    var StartCondition;
    var StepCondition = "";
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
        StringaStep = Trim(Linea);
        if (StringaStep == "")
            return undefined;
    }
    else {
        StringaEnd = Linea;
        StringaStep = "#1";
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
        StartCondition = "LDX " + StartValue;
        if (StringaStep == "#1") {
            StepCondition = "\tinx";
            StringaEnd = Register + "<" + StringaEnd + "+1";
        }
        else if (StringaStep == "#2") {
            StepCondition = "\tinx§\tinx";
            StringaEnd = Register + "<" + StringaEnd + "+2";
        }
        else if (StringaStep == "#3") {
            StepCondition = "\tinx§\tinx§\tinx";
            StringaEnd = Register + "<" + StringaEnd + "+3";
        }
        else if (StringaStep == "#4") {
            StepCondition = "\tinx§\tinx§\tinx§\tinx";
            StringaEnd = Register + "<" + StringaEnd + "+4";
        }
        else if (StringaStep == "#-1") {
            StepCondition = "\tdex";
            StringaEnd = Register + ">=" + StringaEnd + "-1";
        }
        else if (StringaStep == "#-2") {
            StepCondition = "\tdex§\tdex";
            StringaEnd = Register + ">=" + StringaEnd + "-2";
        }
        else if (StringaStep == "#-3") {
            StepCondition = "\tdex§\tdex§\tdexx";
            StringaEnd = Register + ">=" + StringaEnd + "-3";
        }
        else if (StringaStep == "#-4") {
            StepCondition = "\tdex§\tdex§\tdex§\tdexx";
            StringaEnd = Register + ">=" + StringaEnd + "-4";
        }
        else {
            error("invalid STEP in FOR");
        }
    }
    else if (Register == "Y") {
        StartCondition = "LDY " + StartValue;
        if (StringaStep == "#1") {
            StepCondition = "\tiny";
            StringaEnd = Register + "<" + StringaEnd + "+1";
        }
        else if (StringaStep == "#2") {
            StepCondition = "\tiny§\tiny";
            StringaEnd = Register + "<" + StringaEnd + "+2";
        }
        else if (StringaStep == "#3") {
            StepCondition = "\tiny§\tiny§\tiny";
            StringaEnd = Register + "<" + StringaEnd + "+3";
        }
        else if (StringaStep == "#4") {
            StepCondition = "\tiny§\tiny§\tiny§\tiny";
            StringaEnd = Register + "<" + StringaEnd + "+4";
        }
        else if (StringaStep == "#-1") {
            StepCondition = "\tdey";
            StringaEnd = Register + ">=" + StringaEnd + "-1";
        }
        else if (StringaStep == "#-2") {
            StepCondition = "\tdey§\tdey";
            StringaEnd = Register + ">=" + StringaEnd + "-2";
        }
        else if (StringaStep == "#-3") {
            StepCondition = "\tdey§\tdey§\tdey";
            StringaEnd = Register + ">=" + StringaEnd + "-3";
        }
        else if (StringaStep == "#-4") {
            StepCondition = "\tdey§\tdey§\tdey§\tdey";
            StringaEnd = Register + ">=" + StringaEnd + "-4";
        }
        else {
            error("invalid STEP in FOR");
        }
    }
    else if (Register == "A") {
        StartCondition = "LDA " + StartValue;
        if (StringaStep == "#1") {
            StepCondition = "\tclc§\tadc #1";
            StringaEnd = Register + "<" + StringaEnd + "+1";
        }
        else if (StringaStep == "#2") {
            StepCondition = "\tclc§\tadc #2";
            StringaEnd = Register + "<" + StringaEnd + "+2";
        }
        else if (StringaStep == "#3") {
            StepCondition = "\tclc§\tadc #3";
            StringaEnd = Register + "<" + StringaEnd + "+3";
        }
        else if (StringaStep == "#4") {
            StepCondition = "\tclc§\tadc #4";
            StringaEnd = Register + "<" + StringaEnd + "+4";
        }
        else if (StringaStep == "#-1") {
            StepCondition = "\tclc§\tadc #255";
            StringaEnd = Register + ">=" + StringaEnd + "-1";
        }
        else if (StringaStep == "#-2") {
            StepCondition = "\tclc§\tadc #254";
            StringaEnd = Register + ">=" + StringaEnd + "-2";
        }
        else if (StringaStep == "#-3") {
            StepCondition = "\tclc§\tadc #253";
            StringaEnd = Register + ">=" + StringaEnd + "-3";
        }
        else if (StringaStep == "#-4") {
            StepCondition = "\tclc§\tadc #252";
            StringaEnd = Register + ">=" + StringaEnd + "-4";
        }
        else {
            error("invalid STEP in FOR");
        }
    }
    else {
        StartCondition = "LDA " + StartValue + "§\tSTA " + Register;
        if (StringaStep == "#1") {
            StepCondition = "\tinc " + Register;
            StringaEnd = Register + "<" + StringaEnd + "+1";
        }
        else if (StringaStep == "#2") {
            StepCondition = "\tinc " + Register + "§\tinc " + Register;
            StringaEnd = Register + "<" + StringaEnd + "+2";
        }
        else if (StringaStep == "#3") {
            StepCondition = "\tinc " + Register + "§\tinc " + Register + "§\tinc " + Register;
            StringaEnd = Register + "<" + StringaEnd + "+3";
        }
        else if (StringaStep == "#4") {
            StepCondition = "\tinc " + Register + "§\tinc " + Register + "§\tinc " + Register + "§\tinc " + Register;
            StringaEnd = Register + "<" + StringaEnd + "+4";
        }
        else if (StringaStep == "#-1") {
            StepCondition = "\tdec " + Register;
            StringaEnd = Register + ">=" + StringaEnd + "-1";
        }
        else if (StringaStep == "#-2") {
            StepCondition = "\tdec " + Register + "§\tdec " + Register;
            StringaEnd = Register + ">=" + StringaEnd + "-2";
        }
        else if (StringaStep == "#-3") {
            StepCondition = "\tdec " + Register + "§\tdec " + Register + "§\tdec " + Register;
            StringaEnd = Register + ">=" + StringaEnd + "-3";
        }
        else if (StringaStep == "#-4") {
            StepCondition = "\tdec " + Register + "§\tdec " + Register + "§\tdec " + Register + "§\tdec " + Register;
            StringaEnd = Register + ">=" + StringaEnd + "-4";
        }
        else {
            error("invalid STEP in FOR");
        }
    }
    var ReplaceTo = Label("FOR", nl, "START") + ":§" + "\t" + StartCondition + "§";
    ReplaceTo = ReplaceTo + Label("FOR", nl, "LOOP") + ":";
    var _a = ParseCond(StringaEnd), Eval = _a.Eval, BranchNot = _a.BranchNot, Branch = _a.Branch;
    var Lab = Label("FOR", nl, "LOOP");
    Branch = Branch.replace(/\*/g, Lab);
    StepCondition = "\t" + StepCondition + "§\t" + Eval + "§\t" + Branch + "§";
    StackFor.Add(nl);
    StackFor_U.Add(StepCondition);
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
    Register = UpperCase(Trim(Register));
    if (cpu6502) {
        if (Operator == "IS") {
            Operand = Trim(Operand);
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
                if (usinga)
                    Eval = "LDA " + Register + "§\tCMP " + Operand;
                if (usingx)
                    Eval = "LDX " + Register + "§\tCPX " + Operand;
                if (usingy)
                    Eval = "LDY " + Register + "§\tCPY " + Operand;
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
        if (Operator == "!=") {
            Branch = "BNE *";
            BranchNot = "BEQ *";
        }
        else if (Operator == "<>") {
            Branch = "BNE *";
            BranchNot = "BEQ *";
        }
        else if (Operator == "==") {
            Branch = "BEQ *";
            BranchNot = "BNE *";
        }
        else if (Operator == "=") {
            Branch = "BEQ *";
            BranchNot = "BNE *";
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
        }
        else if (Operator == "<=" && signedcond == true) {
            Branch = "BMI *§\tBEQ *";
            BranchNot = "BEQ .+4§\tBPL *";
        }
        else if (Operator == "<" && signedcond == true) {
            Branch = "BMI *";
            BranchNot = "BPL *";
        }
        else if (Operator == ">" && signedcond == true) {
            Branch = "BEQ .+4\tBPL *";
            BranchNot = "BMI *§\tBEQ *";
        }
        else
            Operator = "#";
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
            if (c == '1' || c == 'A')
                code = 1;
            if (c == '2' || c == 'B')
                code = 2;
            if (c == '3' || c == 'F')
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
    // inserisce macro   
    AllMacros.push({
        Name: NomeMacro,
        Id: NM,
        Parameters: PList,
        Code: ""
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
    for (;;) {
        G = GetToken(prm, ",");
        var p = Trim(G.Token);
        prm = G.Rest;
        if (p == "")
            break;
        if (p.startsWith("#"))
            list.push("CONST");
        else if (p.startsWith("(") && p.endsWith(")"))
            list.push("INDIRECT");
        else if (p.startsWith('"') && p.endsWith('"'))
            list.push(p);
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
function IsBasic(Linea, nl) {
    Linea = UpperCase(Trim(Linea)) + " ";
    var StuffLine;
    var si = -1;
    // compact lines with no no line numbers into the previous numbered line
    if (Linea.AnsiPos("BASIC START") > 0) {
        for (var t = nl + 1; t < L.Count; t++) {
            var Linx = UpperCase(Trim(L.Strings[t]));
            if (Linx.AnsiPos("BASIC END") > 0)
                break;
            if (StartWithNumber(Linx)) {
                si = t;
            }
            else {
                if (si == -1) {
                    error("BASIC line continuing from no line number");
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
                L.Strings[t] = "basic_row_" + basic_row + ":  BYTE 0,0";
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
        if (numlin == 0 || isNaN(numlin))
            return false;
    }
    catch (ex) {
        return false;
    }
    return true;
}
function TranslateBasic(Linea) {
    // skip empty lines
    if (Trim(Linea) == "")
        return "";
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
        var break_next_token = false;
        if (Linea == "")
            break;
        if (!inquote && !inrem) {
            // match a token
            for (var t = 128; t <= 255; t++) {
                var l = Tokens[t].Length();
                if (l > 0 && Linea.SubString(1, l) == Tokens[t]) {
                    // console.log(`matched token: ${Tokens[t]}`);
                    Linea = Linea.SubString(l + 1, Linea.Length());
                    Compr = Compr + (t + ",");
                    if (t == 143 || t == 131)
                        inrem = true;
                    break_next_token = true;
                    break;
                }
            }
            if (break_next_token)
                continue;
            // match text
            for (var t = 32; t <= 95; t++) {
                var l = Tokens[t].Length();
                if (l > 0 && Linea.SubString(1, l) == Tokens[t]) {
                    // console.log(`matched text: ${Tokens[t]}`);
                    Linea = Linea.SubString(l + 1, Linea.Length());
                    if (!(BasicCompact == true && t == 32)) {
                        Compr = Compr + (t + ",");
                    }
                    if (t == 34)
                        inquote = true;
                    break_next_token = true;
                    break;
                }
            }
            if (break_next_token)
                continue;
            // match reference to symbol {symbol}, rendered as a 4 character basic number
            if (Linea.SubString(1, 1) == "{") {
                var x = Linea.AnsiPos("}");
                if (x > 0) {
                    var Symbol_1 = Linea.SubString(2, x - 2);
                    Linea = Linea.SubString(x + 1, Linea.Length());
                    var prima_cifra = "[[" + Symbol_1 + "%10] + $30]";
                    var seconda_cifra = "[[[" + Symbol_1 + "%100-[" + Symbol_1 + "%10]]/10] + $30]";
                    var terza_cifra = "[[[" + Symbol_1 + "%1000-[" + Symbol_1 + "%100]]/100] + $30]";
                    var quarta_cifra = "[[[" + Symbol_1 + "%10000-[" + Symbol_1 + "%1000]]/1000] + $30]";
                    var quinta_cifra = "[[[" + Symbol_1 + "%100000-[" + Symbol_1 + "%10000]]/10000] + $30]";
                    Compr = Compr + quarta_cifra + "," + terza_cifra + "," + seconda_cifra + "," + prima_cifra + ",";
                    break_next_token = true;
                    // break nexttoken;
                }
            }
            else {
                console.log("unrecognized keyword token: " + Linea);
                error("unrecognized keyword token: " + Linea);
            }
        }
        if (break_next_token)
            continue;
        // within quote, matches everything to next quote (")
        if (inquote) {
            for (var t = 1; t <= 255; t++) {
                var l = Ascii[t].Length();
                if (l > 0 && Linea.SubString(1, l) == UpperCase(Ascii[t])) {
                    // console.log(`matched string text: ${Ascii[t]}`);
                    Linea = Linea.SubString(l + 1, Linea.Length());
                    Compr = Compr + (t + ",");
                    if (t == 34)
                        inquote = false;
                    //break nexttoken;
                    break_next_token = true;
                    break;
                }
            }
            if (break_next_token)
                continue;
            console.log("unrecognized quoted text token: " + Linea);
            error("unrecognized quoted text token");
        }
        // within rem, matches to the end of line
        if (inrem) {
            for (var t = 1; t <= 255; t++) {
                var l = Ascii[t].Length();
                if (l > 0 && Linea.SubString(1, l) == UpperCase(Ascii[t])) {
                    // console.log(`matched REM text: ${Ascii[t]}`);
                    Linea = Linea.SubString(l + 1, Linea.Length());
                    Compr = Compr + (t + ",");
                    break_next_token = true;
                    break;
                }
            }
            console.log("unrecognized rem text token: " + Linea);
            error("unrecognized rem text token");
        }
    }
    Compr = Compr + "0";
    var Label = "basic_row_" + basic_row + ":";
    var NextLabel = "basic_row_" + (basic_row + 1);
    var ReplaceTo = Label + "  BYTE [" + NextLabel + "%256],[" + NextLabel + "/256],[" + numlin + "%256],[" + numlin + "/256]," + Compr;
    basic_row++;
    return ReplaceTo;
}
function InitTokens() {
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
    Tokens[128] = "END";
    Tokens[129] = "FOR";
    Tokens[130] = "NEXT";
    Tokens[131] = "DATA";
    Tokens[132] = "INPUT#";
    Tokens[133] = "INPUT";
    Tokens[134] = "DIM";
    Tokens[135] = "READ";
    Tokens[136] = "LET";
    Tokens[137] = "GOTO";
    Tokens[138] = "RUN";
    Tokens[139] = "IF";
    Tokens[140] = "RESTORE";
    Tokens[141] = "GOSUB";
    Tokens[142] = "RETURN";
    Tokens[143] = "REM";
    Tokens[144] = "STOP";
    Tokens[145] = "ON";
    Tokens[146] = "WAIT";
    Tokens[147] = "LOAD";
    Tokens[148] = "SAVE";
    Tokens[149] = "VERIFY";
    Tokens[150] = "DEF";
    Tokens[151] = "POKE";
    Tokens[152] = "PRINT#";
    Tokens[153] = "PRINT";
    Tokens[154] = "CONT";
    Tokens[155] = "LIST";
    Tokens[156] = "CLR";
    Tokens[157] = "CMD";
    Tokens[158] = "SYS";
    Tokens[159] = "OPEN";
    Tokens[160] = "CLOSE";
    Tokens[161] = "GET";
    Tokens[162] = "NEW";
    Tokens[163] = "TAB(";
    Tokens[164] = "TO";
    Tokens[165] = "FN";
    Tokens[166] = "SPC(";
    Tokens[167] = "THEN";
    Tokens[168] = "NOT";
    Tokens[169] = "STEP";
    Tokens[170] = "+";
    Tokens[171] = "-";
    Tokens[172] = "*";
    Tokens[173] = "/";
    Tokens[174] = "^";
    Tokens[175] = "AND";
    Tokens[176] = "OR";
    Tokens[177] = ">";
    Tokens[178] = "=";
    Tokens[179] = "<";
    Tokens[180] = "SGN";
    Tokens[181] = "INT";
    Tokens[182] = "ABS";
    Tokens[183] = "USR";
    Tokens[184] = "FRE";
    Tokens[185] = "POS";
    Tokens[186] = "SQR";
    Tokens[187] = "RND";
    Tokens[188] = "LOG";
    Tokens[189] = "EXP";
    Tokens[190] = "COS";
    Tokens[191] = "SIN";
    Tokens[192] = "TAN";
    Tokens[193] = "ATN";
    Tokens[194] = "PEEK";
    Tokens[195] = "LEN";
    Tokens[196] = "STR$";
    Tokens[197] = "VAL";
    Tokens[198] = "ASC";
    Tokens[199] = "CHR$";
    Tokens[200] = "LEFT$";
    Tokens[201] = "RIGHT$";
    Tokens[202] = "MID$";
    for (var t = 203; t <= 254; t++)
        Tokens[t] = "";
    Tokens[255] = "{pi}";
    Ascii[1] = "{rev a}";
    Ascii[2] = "{rev b}";
    Ascii[3] = "{run stop}";
    Ascii[4] = "{rev d}";
    Ascii[5] = "{wht}";
    Ascii[6] = "{rev f}";
    Ascii[7] = "{rev g}";
    Ascii[8] = "{rev h}";
    Ascii[9] = "{rev i}";
    Ascii[10] = "{rev j}";
    Ascii[11] = "{rev k}";
    Ascii[12] = "{rev l}";
    Ascii[13] = "{return}";
    Ascii[14] = "{rev n}";
    Ascii[15] = "{rev o}";
    Ascii[16] = "{rev p}";
    Ascii[17] = "{down}";
    Ascii[18] = "{rvs on}";
    Ascii[19] = "{home}";
    Ascii[20] = "{del}";
    Ascii[21] = "{rev u}";
    Ascii[22] = "{rev v}";
    Ascii[23] = "{rev w}";
    Ascii[24] = "{rev x}";
    Ascii[25] = "{rev y}";
    Ascii[26] = "{rev z}";
    Ascii[27] = "{rev [}";
    Ascii[28] = "{red}";
    Ascii[29] = "{right}";
    Ascii[30] = "{grn}";
    Ascii[31] = "{blu}";
    Ascii[32] = " ";
    Ascii[33] = "!";
    Ascii[34] = "\x22";
    Ascii[35] = "#";
    Ascii[36] = "$";
    Ascii[37] = "%";
    Ascii[38] = "&";
    Ascii[39] = "'";
    Ascii[40] = "(";
    Ascii[41] = ")";
    Ascii[42] = "*";
    Ascii[43] = "+";
    Ascii[44] = ",";
    Ascii[45] = "-";
    Ascii[46] = ".";
    Ascii[47] = "/";
    Ascii[48] = "0";
    Ascii[49] = "1";
    Ascii[50] = "2";
    Ascii[51] = "3";
    Ascii[52] = "4";
    Ascii[53] = "5";
    Ascii[54] = "6";
    Ascii[55] = "7";
    Ascii[56] = "8";
    Ascii[57] = "9";
    Ascii[58] = ":";
    Ascii[59] = ";";
    Ascii[60] = "<";
    Ascii[61] = "=";
    Ascii[62] = ">";
    Ascii[63] = "?";
    Ascii[64] = "@";
    Ascii[65] = "A";
    Ascii[66] = "B";
    Ascii[67] = "C";
    Ascii[68] = "D";
    Ascii[69] = "E";
    Ascii[70] = "F";
    Ascii[71] = "G";
    Ascii[72] = "H";
    Ascii[73] = "I";
    Ascii[74] = "J";
    Ascii[75] = "K";
    Ascii[76] = "L";
    Ascii[77] = "M";
    Ascii[78] = "N";
    Ascii[79] = "O";
    Ascii[80] = "P";
    Ascii[81] = "Q";
    Ascii[82] = "R";
    Ascii[83] = "S";
    Ascii[84] = "T";
    Ascii[85] = "U";
    Ascii[86] = "V";
    Ascii[87] = "W";
    Ascii[88] = "X";
    Ascii[89] = "Y";
    Ascii[90] = "Z";
    Ascii[91] = "[";
    Ascii[92] = "£";
    Ascii[93] = "]";
    Ascii[94] = "^";
    Ascii[95] = "{left arrow}";
    Ascii[96] = "{shift *}";
    Ascii[97] = "{shift a}";
    Ascii[98] = "{shift b}";
    Ascii[99] = "{shift c}";
    Ascii[100] = "{shift d}";
    Ascii[101] = "{shift e}";
    Ascii[102] = "{shift f}";
    Ascii[103] = "{shift g}";
    Ascii[104] = "{shift h}";
    Ascii[105] = "{shift i}";
    Ascii[106] = "{shift j}";
    Ascii[107] = "{shift k}";
    Ascii[108] = "{shift l}";
    Ascii[109] = "{shift m}";
    Ascii[110] = "{shift n}";
    Ascii[111] = "{shift o}";
    Ascii[112] = "{shift p}";
    Ascii[113] = "{shift q}";
    Ascii[114] = "{shift r}";
    Ascii[115] = "{shift s}";
    Ascii[116] = "{shift t}";
    Ascii[117] = "{shift u}";
    Ascii[118] = "{shift v}";
    Ascii[119] = "{shift w}";
    Ascii[120] = "{shift x}";
    Ascii[121] = "{shift y}";
    Ascii[122] = "{shift z}";
    Ascii[123] = "{shift +}";
    Ascii[124] = "{cbm -}";
    Ascii[125] = "{shift -}";
    Ascii[126] = "{pi}";
    Ascii[127] = "{cbm *}";
    Ascii[128] = "{rev shift *}";
    Ascii[129] = "{rev shift a}";
    Ascii[130] = "{rev shift b}";
    Ascii[131] = "{rev shift c}";
    Ascii[132] = "{rev shift d}";
    Ascii[133] = "{f1}";
    Ascii[134] = "{f3}";
    Ascii[135] = "{f5}";
    Ascii[136] = "{f7}";
    Ascii[137] = "{f2}";
    Ascii[138] = "{f4}";
    Ascii[139] = "{f6}";
    Ascii[140] = "{f8}";
    Ascii[141] = "{rev shift m}";
    Ascii[142] = "{rev shift n}";
    Ascii[143] = "{rev shift o}";
    Ascii[144] = "{blk}";
    Ascii[145] = "{up}";
    Ascii[146] = "{rvs off}";
    Ascii[147] = "{clr}";
    Ascii[148] = "{inst}";
    Ascii[149] = "{rev shift u}";
    Ascii[150] = "{rev shift v}";
    Ascii[151] = "{rev shift w}";
    Ascii[152] = "{rev shift x}";
    Ascii[153] = "{rev shift y}";
    Ascii[154] = "{rev shift z}";
    Ascii[155] = "{rev shift +}";
    Ascii[156] = "{pur}";
    Ascii[157] = "{left}";
    Ascii[158] = "{yel}";
    Ascii[159] = "{cyn}";
    Ascii[160] = "{160}";
    Ascii[161] = "{cbm k}";
    Ascii[162] = "{cbm i}";
    Ascii[163] = "{cbm t}";
    Ascii[164] = "{cbm @}";
    Ascii[165] = "{cbm g}";
    Ascii[166] = "{cbm +}";
    Ascii[167] = "{cbm m}";
    Ascii[168] = "{cbm £}";
    Ascii[169] = "{shift £}";
    Ascii[170] = "{cbm n}";
    Ascii[171] = "{cbm q}";
    Ascii[172] = "{cbm d}";
    Ascii[173] = "{cbm z}";
    Ascii[174] = "{cbm s}";
    Ascii[175] = "{cbm p}";
    Ascii[176] = "{cbm a}";
    Ascii[177] = "{cbm e}";
    Ascii[178] = "{cbm r}";
    Ascii[179] = "{cbm w}";
    Ascii[180] = "{cbm h}";
    Ascii[181] = "{cbm j}";
    Ascii[182] = "{cbm l}";
    Ascii[183] = "{cbm y}";
    Ascii[184] = "{cbm u}";
    Ascii[185] = "{cbm o}";
    Ascii[186] = "{shift @}";
    Ascii[187] = "{cbm f}";
    Ascii[188] = "{cbm c}";
    Ascii[189] = "{cbm x}";
    Ascii[190] = "{cbm v}";
    Ascii[191] = "{cbm b}";
    Ascii[192] = "{shift *}";
    Ascii[193] = "{shift a}";
    Ascii[194] = "{shift b}";
    Ascii[195] = "{shift c}";
    Ascii[196] = "{shift d}";
    Ascii[197] = "{shift e}";
    Ascii[198] = "{shift f}";
    Ascii[199] = "{shift g}";
    Ascii[200] = "{shift h}";
    Ascii[201] = "{shift i}";
    Ascii[202] = "{shift j}";
    Ascii[203] = "{shift k}";
    Ascii[204] = "{shift l}";
    Ascii[205] = "{shift m}";
    Ascii[206] = "{shift n}";
    Ascii[207] = "{shift o}";
    Ascii[208] = "{shift p}";
    Ascii[209] = "{shift q}";
    Ascii[210] = "{shift r}";
    Ascii[211] = "{shift s}";
    Ascii[212] = "{shift t}";
    Ascii[213] = "{shift u}";
    Ascii[214] = "{shift v}";
    Ascii[215] = "{shift w}";
    Ascii[216] = "{shift x}";
    Ascii[217] = "{shift y}";
    Ascii[218] = "{shift z}";
    Ascii[219] = "{shift +}";
    Ascii[220] = "{cbm -}";
    Ascii[221] = "{shift -}";
    Ascii[222] = "{pi}";
    Ascii[223] = "{cbm *}";
    Ascii[224] = "{224}";
    Ascii[225] = "{cbm k}";
    Ascii[226] = "{cbm i}";
    Ascii[227] = "{cbm t}";
    Ascii[228] = "{cbm @}";
    Ascii[229] = "{cbm g}";
    Ascii[230] = "{cbm +}";
    Ascii[231] = "{cbm m}";
    Ascii[232] = "{cbm £}";
    Ascii[233] = "{shift £}";
    Ascii[234] = "{cbm n}";
    Ascii[235] = "{cbm q}";
    Ascii[236] = "{cbm d}";
    Ascii[237] = "{cbm z}";
    Ascii[238] = "{cbm s}";
    Ascii[239] = "{cbm p}";
    Ascii[240] = "{cbm a}";
    Ascii[241] = "{cbm e}";
    Ascii[242] = "{cbm r}";
    Ascii[243] = "{cbm w}";
    Ascii[244] = "{cbm h}";
    Ascii[245] = "{cbm j}";
    Ascii[246] = "{cbm l}";
    Ascii[247] = "{cbm y}";
    Ascii[248] = "{cbm u}";
    Ascii[249] = "{cbm o}";
    Ascii[250] = "{cbm @}";
    Ascii[251] = "{cbm f}";
    Ascii[252] = "{cbm c}";
    Ascii[253] = "{cbm x}";
    Ascii[254] = "{cbm v}";
    Ascii[255] = "{pi}";
}
/*
console.log("123".AnsiPos("23") == 2);
console.log("123".AnsiPos("4") == 0);
console.log("123".SubString(1,3) == "123");
console.log("123".SubString(2,1) == "2");
*/
main();
