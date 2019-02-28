"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function hex(value) {
    return (value <= 0xF ? "0" : "") + value.toString(16);
}
exports.hex = hex;
function bitmapToByte(bmp) {
    var byteval = 0;
    if (bmp.Length() == 8) {
        // mono
        for (var t = 1, pos = 128; t <= 8; t++, pos = pos >> 1) {
            var c = bmp.CharAt(t);
            if (c != '.' && c != '-' && c != '0') {
                byteval = byteval | pos;
            }
        }
    }
    else {
        // multicolor 
        for (var t = 1, pos = 6; t <= 4; t++, pos -= 2) {
            var c = bmp.CharAt(t);
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
    return String(byteval);
}
exports.bitmapToByte = bitmapToByte;
function GetParm(Linea, token, num) {
    var split = SplitToken(Linea, token);
    if (split.length < num)
        return "";
    else
        return split[num];
}
exports.GetParm = GetParm;
function SplitToken(Linea, token) {
    return Linea.split(token);
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
exports.GetToken = GetToken;
function UpperCase(s) {
    return s.toUpperCase();
}
exports.UpperCase = UpperCase;
function Trim(s) {
    return s.trim();
}
exports.Trim = Trim;
