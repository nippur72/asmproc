"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
;
;
;
;
;
;
;
function nodeToString(N) {
    if (N.type === "line")
        return lineToString(N);
    else if (N.type === "const")
        return constToString(N);
    else if (N.type === "float")
        return floatToString(N);
    else if (N.type === "bitmap")
        return bitmapToString(N);
    else if (N.type === "sprite")
        return spriteToString(N);
    else if (N.type === "expr")
        return exprToString(N);
    else if (N.type === "number")
        return numberToString(N);
    else
        throw "node type not recognized: " + N.type;
}
exports.nodeToString = nodeToString;
function lineToString(N) {
    return nodeToString(N.line);
}
function constToString(N) {
    var id = N.id, expr = N.expr;
    return id + " = " + nodeToString(expr);
}
function exprToString(N) {
    return "" + N.arg;
}
function numberToString(N) {
    return "" + N.num;
}
var cbm_float_1 = require("./cbm_float");
var cross_1 = require("./cross");
function floatToString(N) {
    var bytes = N.numbers.map(function (n) { return nodeToString(n); })
        .map(function (n) { return Number(n); })
        .map(function (n) { return cbm_float_1.CBMFloat(n).join(","); });
    if (N.label === null)
        return cross_1.BYTE.apply(void 0, [""].concat(bytes));
    else
        return cross_1.BYTE.apply(void 0, [N.label].concat(bytes));
}
var utils_1 = require("./utils");
function bitmapToString(N) {
    var Argomento = nodeToString(N.expr).trim();
    if (Argomento.Length() != 4 && Argomento.Length() != 8) {
        throw "invalid BITMAP value: \"" + Argomento + "\"";
    }
    var byte = String(utils_1.bitmapToByte(Argomento));
    if (N.label === null)
        return cross_1.BYTE("", byte);
    else
        return cross_1.BYTE(N.label, byte);
}
function spriteToString(N) {
    var Argomento = nodeToString(N.expr).trim();
    if (Argomento.Length() != 4 * 3 && Argomento.Length() != 8 * 3) {
        throw "invalid SPRITE value: \"" + Argomento + "\"";
    }
    var b1, b2, b3;
    if (Argomento.Length() === 8 * 3) {
        b1 = String(utils_1.bitmapToByte(Argomento.substr(0 + 0 * 8, 8)));
        b2 = String(utils_1.bitmapToByte(Argomento.substr(0 + 1 * 8, 8)));
        b3 = String(utils_1.bitmapToByte(Argomento.substr(0 + 2 * 8, 8)));
    }
    else {
        b1 = String(utils_1.bitmapToByte(Argomento.substr(0 + 0 * 4, 4)));
        b2 = String(utils_1.bitmapToByte(Argomento.substr(0 + 1 * 4, 4)));
        b3 = String(utils_1.bitmapToByte(Argomento.substr(0 + 2 * 4, 4)));
    }
    if (N.label === null)
        return cross_1.BYTE("", b1, b2, b3);
    else
        return cross_1.BYTE(N.label, b1, b2, b3);
}
