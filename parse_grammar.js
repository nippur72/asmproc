"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var nearley_1 = __importDefault(require("nearley"));
var grammar = require("./grammar");
function test_expression(input) {
    try {
        // Make a parser and feed the input
        var parser = new nearley_1.default.Parser(grammar.ParserRules, grammar.ParserStart);
        var ans = parser.feed(input);
        // Check if there are any results
        if (ans.results.length !== 0) {
            var result = ans.results[0];
            return result;
        }
        else {
            // This means the input is incomplete.
            console.log("Error: incomplete input, parse failed.");
            return undefined;
        }
    }
    catch (e) {
        // Panic in style, by graphically pointing out the error location.
        console.log("error at " + e.offset);
        return undefined;
    }
}
var input = fs_1.default.readFileSync("file.txt").toString();
console.log(input);
var parsed = test_expression(input);
if (parsed === undefined) {
    throw "no parse";
}
console.log(JSON.stringify(parsed, undefined, 3));
