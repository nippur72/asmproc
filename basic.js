"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
var cross_1 = require("./cross");
var asmproc_1 = require("./asmproc");
var TokensKeywords = {};
var TokensText = {};
var Ascii = {};
var basic_row = 0;
var BasicCompact;
BasicCompact = false;
InitTokens();
function IsBasicStart(Linea) {
    return Linea.toUpperCase().AnsiPos("BASIC START") > 0;
}
exports.IsBasicStart = IsBasicStart;
function IsBasicEnd(Linea) {
    return Linea.toUpperCase().AnsiPos("BASIC END") > 0;
}
exports.IsBasicEnd = IsBasicEnd;
function IsBasic(L, Linea, nl) {
    Linea = utils_1.UpperCase(utils_1.Trim(Linea)) + " ";
    var StuffLine;
    var si = -1;
    // compact lines with no no line numbers into the previous numbered line
    if (IsBasicStart(Linea)) {
        for (var t = nl + 1; t < L.Count; t++) {
            var Linx = utils_1.UpperCase(utils_1.Trim(L.Strings[t]));
            if (IsBasicEnd(Linx))
                break;
            if (StartWithNumber(Linx)) {
                si = t;
            }
            else {
                if (si == -1) {
                    asmproc_1.error("BASIC line continuing from no line number in line " + t);
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
            Linea = utils_1.UpperCase(utils_1.Trim(L.Strings[t]));
            if (Linea.AnsiPos("BASIC END") > 0) {
                L.Strings[t] = cross_1.BYTE("basic_row_" + basic_row, "0", "0");
                return true;
            }
            L.Strings[t] = TranslateBasic(utils_1.Trim(L.Strings[t]) + " ");
        }
        asmproc_1.error("BASIC START without BASIC END");
    }
    return false;
}
exports.IsBasic = IsBasic;
function StartWithNumber(Linea) {
    var LineNumber = utils_1.GetParm(Linea, " ", 0).trim();
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
    function cifra(Symbol, c) {
        // (((n % 1000) - (n % 100)/100 + $30)
        var n = Math.pow(10, c + 1);
        var mille = String(n);
        var cento = String(n / 10);
        var n_mod_mille = cross_1.parens(cross_1.mod(Symbol, mille));
        var n_mod_cento = cross_1.parens(cross_1.mod(Symbol, cento));
        var n_mod_mille_meno_n_mod_cento = cross_1.parens(n_mod_mille + "-" + n_mod_cento);
        var div_cento = n_mod_mille_meno_n_mod_cento + "/" + cento;
        var all = cross_1.parens(div_cento + "+$30");
        return all;
    }
    // match reference to symbol {symbol}, rendered as a 4 character basic number
    if (Linea.SubString(1, 1) == "{") {
        var x = Linea.AnsiPos("}");
        if (x > 0) {
            var Symbol_1 = Linea.SubString(2, x - 2);
            Linea = Linea.SubString(x + 1);
            var prima_cifra = cifra(Symbol_1, 0);
            var seconda_cifra = cifra(Symbol_1, 1);
            var terza_cifra = cifra(Symbol_1, 2);
            var quarta_cifra = cifra(Symbol_1, 3);
            var quinta_cifra = cifra(Symbol_1, 4);
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
            if (l > 0 && Linea.SubString(1, l) == utils_1.UpperCase(code)) {
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
            if (l > 0 && Linea.SubString(1, l) == utils_1.UpperCase(code)) {
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
    if (utils_1.Trim(Linea) == "")
        return "";
    Linea = utils_1.UpperCase(Linea); // TODO remove uppercase
    var G = utils_1.GetToken(Linea, " ");
    Linea = G.Rest;
    var LineNumber = utils_1.Trim(G.Token);
    if (LineNumber == "")
        asmproc_1.error("syntax error");
    var numlin = LineNumber.ToInt();
    var Compr = "";
    var inquote = false;
    var inrem = false;
    Linea = utils_1.Trim(Linea);
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
                        asmproc_1.error("unrecognized keyword token: " + Linea);
                    }
                }
            }
        }
        else if (inquote) {
            // within quote, matches everything to next quote (")
            var match = MatchQuote(Linea, inquote, inrem);
            if (!advance(match)) {
                console.log("unrecognized quoted text token: " + Linea);
                asmproc_1.error("unrecognized quoted text token");
            }
        }
        else if (inrem) {
            // inrem (or data)
            var match = MatchRem(Linea, inquote, inrem);
            if (!advance(match)) {
                console.log("unrecognized rem/data text token: " + Linea);
                asmproc_1.error("unrecognized rem/data text token");
            }
        }
    }
    Compr = Compr + "0";
    var Label = "basic_row_" + basic_row + ":";
    var NextLabel = "basic_row_" + (basic_row + 1);
    var ReplaceTo = cross_1.BYTE(Label, cross_1.parens(cross_1.lobyte(NextLabel)), cross_1.parens(cross_1.hibyte(NextLabel)), cross_1.parens(cross_1.lobyte(numlin.toString())), cross_1.parens(cross_1.hibyte(numlin.toString())), Compr);
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
    TokensKeywords["?"] = 153;
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
