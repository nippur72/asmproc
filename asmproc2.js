#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var command_line_args_1 = __importDefault(require("command-line-args"));
var cross_1 = require("./cross");
var nodes_1 = require("./nodes");
function parseOptions(optionDefinitions) {
    try {
        return command_line_args_1.default(optionDefinitions);
    }
    catch (ex) {
        console.log(ex.message);
        process.exit(-1);
    }
}
var defines;
main();
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
    var FName = options.input;
    var FOut = options.output;
    if (FName == FOut) {
        console.log("file names must be different");
        process.exit(0);
    }
    if (!fs_1.default.existsSync(FName)) {
        console.log("can't find file");
        process.exit(0);
    }
    var input = fs_1.default.readFileSync(FName).toString().replace(/\r/g, " ");
    var output = ProcessFile(input);
    console.log(output);
    //L.SaveToFile(FOut);
    console.log("asmproc OK, created: \"" + FOut + "\"");
    process.exit(0);
}
function ProcessFile(input) {
    var ast = MakeAST(input);
    ast = simplifyAST(ast);
    // if(ast.type === "error") return `Error in line ${ast.error.location.start.line} column ${ast.error.location.start.column}:\n${ast.error.message}`;
    console.log(JSON.stringify(ast, undefined, 2));
    var compiled = AstToDasm(ast);
    return compiled;
}
function MakeAST(input) {
    var parser = require("./grammar");
    var tracer = {
        trace: function (d) {
            //console.log(`${d.type} => ${d.rule}`);
        }
    };
    var options = { tracer: tracer };
    try {
        var result = parser.parse(input, options);
        return result;
    }
    catch (ex) {
        return { type: "error", error: ex };
    }
}
function simplifyAST(ast) {
    return ast;
}
// import { BasicSolver } from "./basic";
function AstToDasm(node) {
    return nodes_1.nodeToString(node);
    /*
    if(node.type === "program") {
       return node.items.map(e=>AstToDasm(e)).join("");
    }
    if(node.type === "basic") {
       const solved = BasicSolver(node);
       return AstToDasm(solved);
    }
    throw `node ${node.type} not implemented`;
    */
}
