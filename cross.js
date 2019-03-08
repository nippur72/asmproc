"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.target = {
    dasm: true,
    ca65: false,
    z80asm: false,
    cpu6502: true,
    cpuz80: false
};
var JMP;
function BYTE(label) {
    var list = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        list[_i - 1] = arguments[_i];
    }
    var keyword;
    var byteString = list.join(",");
    if (exports.target.dasm)
        keyword = "byte";
    else if (exports.target.ca65)
        keyword = ".byte";
    else if (exports.target.z80asm)
        keyword = "defb";
    return label + " " + keyword + " " + byteString;
}
exports.BYTE = BYTE;
function Jump(dest) {
    if (exports.target.cpu6502)
        return "JMP " + dest;
    else
        return "JP " + dest;
}
exports.Jump = Jump;
function MOD(left, right) {
    if (exports.target.dasm)
        return left + " % " + right;
    if (exports.target.ca65)
        return left + " .MOD " + right;
    if (exports.target.z80asm)
        return left + " % " + right;
    throw "";
}
exports.MOD = MOD;
function mod(value, div) {
    if (exports.target.dasm)
        return value + "%" + div;
    else if (exports.target.ca65)
        return value + " .MOD " + div;
    else if (exports.target.z80asm)
        return value + "%" + div;
    throw "";
}
exports.mod = mod;
function parens(s) {
    if (exports.target.dasm)
        return "[" + s + "]";
    else if (exports.target.ca65)
        return "(" + s + ")";
    else if (exports.target.z80asm)
        return "[" + s + "]";
    throw "";
}
exports.parens = parens;
function notequal(a, b) {
    if (exports.target.dasm)
        return a + "!=" + b;
    else if (exports.target.ca65)
        return a + "<>" + b;
    else if (exports.target.z80asm)
        return a + "<>" + b;
    throw "";
}
exports.notequal = notequal;
function hibyte(byte) {
    if (exports.target.dasm)
        return byte + "/256";
    else if (exports.target.ca65)
        return ".HIBYTE(" + byte + ")";
    else if (exports.target.z80asm)
        return byte + "/256";
    throw "";
}
exports.hibyte = hibyte;
function lobyte(byte) {
    if (exports.target.dasm)
        return byte + "%256";
    else if (exports.target.ca65)
        return ".LOBYTE(" + byte + ")";
    else if (exports.target.z80asm)
        return byte + "%256";
    throw "";
}
exports.lobyte = lobyte;
function define(id, val) {
    if (exports.target.dasm)
        return id + " EQU " + val;
    else if (exports.target.ca65)
        return id + " EQU " + val;
    else if (exports.target.z80asm)
        return id + " EQU " + val;
    throw "";
}
exports.define = define;
