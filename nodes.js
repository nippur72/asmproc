"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _Operator = /** @class */ (function () {
    function _Operator(type, left, right) {
        this.type = type;
        this.left = left;
        this.right = right;
    }
    return _Operator;
}());
function nodeToString(N) {
    console.log(N);
    if (N.type === "error")
        return errorToString(N);
    else if (N.type === "program")
        return programToString(N);
    else if (N.type === "basic")
        return basicToString(N);
    else if (N.type === "basicline")
        return basicLineToString(N);
    else if (N.type === "string")
        return stringToString(N);
    else if (N.type === "integer")
        return integerToString(N);
    else if (N.type === "()")
        return roundParensToString(N);
    else if (N.type === "[]")
        return squareParensToString(N);
    else if (N.type === "id")
        return idToString(N);
    else if (N.type === "||")
        return orToString(N);
    else if (N.type === "&&")
        return andToString(N);
    else if (N.type === "|")
        return bitwiseOrToString(N);
    else if (N.type === "&")
        return bitwiseAndToString(N);
    else if (N.type === "^")
        return xorToString(N);
    else if (N.type === "<<")
        return shiftleftToString(N);
    else if (N.type === ">>")
        return shiftrightToString(N);
    else if (N.type === "+")
        return plusToString(N);
    else if (N.type === "-")
        return minusToString(N);
    else if (N.type === "!")
        return logicalNotToString(N);
    else if (N.type === "~")
        return bitwiseNotToString(N);
    else if (N.type === "*")
        return multiplicationToString(N);
    else if (N.type === "/")
        return divisionToString(N);
    else if (N.type === "%" || N.type === "MOD")
        return modToString(N);
    else if (N.type === "unaryplus")
        return unaryplusToString(N);
    else if (N.type === "unaryminus")
        return unaryminusToString(N);
    else if (N.type === "instruction")
        return instructionToString(N);
    else if (N.type === "immediate")
        return immediateToString(N);
    else if (N.type === "byte")
        return byteToString(N);
    else if (N.type === "dim")
        return dimToString(N);
    else if (N.type === "const")
        return constToString(N);
    /*
    else if(N.type === "bitmap")    return bitmapToString(N);
    else if(N.type === "sprite")    return spriteToString(N);
    else if(N.type === "expr" )     return exprToString(N);
    else if(N.type === "number")    return numberToString(N);
    */
    else
        throw "node type not recognized: " + N.type;
}
exports.nodeToString = nodeToString;
function errorToString(N) {
    return N.error.message;
}
function programToString(N) {
    return N.items.map(function (e) { return nodeToString(e); }).join("\n");
}
function basicToString(N) {
    var lines = N.lines.map(function (e) { return nodeToString(e); });
    return lines.join("\n");
}
function basicLineToString(N) {
    throw "not implemented";
}
// ========== expressions 
function stringToString(N) {
    return "\"" + N.str + "\"";
}
function integerToString(N) {
    return String(N.num);
}
function roundParensToString(N) {
    return "(" + nodeToString(N.expr) + ")"; // TODO use cross
}
function squareParensToString(N) {
    return "[" + nodeToString(N.expr) + "]"; // TODO use cross
}
function idToString(N) {
    console.log(N);
    // simple identifier
    if (N.args === undefined)
        return N.id;
    // function call
    var args = N.args.map(function (e) { return nodeToString(e); }).join(",");
    return N.id + "(" + args + ")";
}
function orToString(N) { return nodeToString(N.left) + " || " + nodeToString(N.right) + " "; }
function andToString(N) { return nodeToString(N.left) + " && " + nodeToString(N.right) + " "; }
function bitwiseOrToString(N) { return nodeToString(N.left) + " |  " + nodeToString(N.right) + " "; }
function bitwiseAndToString(N) { return nodeToString(N.left) + " &  " + nodeToString(N.right) + " "; }
function xorToString(N) { return nodeToString(N.left) + " ^  " + nodeToString(N.right) + " "; }
function shiftleftToString(N) { return nodeToString(N.left) + " << " + nodeToString(N.right) + " "; }
function shiftrightToString(N) { return nodeToString(N.left) + " >> " + nodeToString(N.right) + " "; }
function plusToString(N) { return nodeToString(N.left) + " +  " + nodeToString(N.right) + " "; }
function minusToString(N) { return nodeToString(N.left) + " -  " + nodeToString(N.right) + " "; }
function multiplicationToString(N) { return nodeToString(N.left) + " *  " + nodeToString(N.right) + " "; }
function divisionToString(N) { return nodeToString(N.left) + " /  " + nodeToString(N.right) + " "; }
function modToString(N) { return nodeToString(N.left) + " %  " + nodeToString(N.right) + " "; }
function unaryplusToString(N) { return "+" + nodeToString(N.expr); }
function unaryminusToString(N) { return "-" + nodeToString(N.expr); }
function logicalNotToString(N) { return "!" + nodeToString(N.expr); }
function bitwiseNotToString(N) { return "~" + nodeToString(N.expr); }
// ======================
function instructionToString(N) {
    var args = N.args.map(function (e) { return nodeToString(e); }).join(",");
    return N.opcode.opcode + " " + args;
}
function immediateToString(N) {
    return "#" + nodeToString(N.expr);
}
function byteToString(N) {
    var list = N.list.map(function (e) { return nodeToString(e); });
    return N.bytetype + " " + list;
}
function dimToString(N) {
    if (N.spec.absolute !== undefined) {
        return N.id + " = " + nodeToString(N.spec.absolute);
    }
    if (N.spec.zeropage) {
        throw "not implemented";
    }
    var zero = { type: "integer", num: 0 };
    var init = N.spec.init === undefined ? zero : N.spec.init;
    return N.id + " " + N.size + " " + nodeToString(init);
}
function constToString(N) {
    return N.id + " = " + nodeToString(N.value);
}
// Cond
