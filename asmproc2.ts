#!/usr/bin/env node

// this is an attempt to convert all the grammar in nearley

import fs from "fs";
import commandLineArgs, { OptionDefinition } from 'command-line-args';

import { target, Jump, MOD } from "./cross";
import { nodeToString } from "./nodes";

function parseOptions(optionDefinitions: OptionDefinition[]) {
   try {       
      return commandLineArgs(optionDefinitions);
   } catch(ex) {
      console.log(ex.message);
      process.exit(-1);
   }
}

let defines: string[];

main();

function main()
{
   const options = parseOptions([
      { name: 'input',      alias: 'i', type: String },
      { name: 'output',     alias: 'o', type: String }, 
      { name: 'target',     alias: 't', type: String,  defaultValue: 'dasm' },
      { name: 'define',     alias: 'd', type: String }
   ]);   

   if(options === undefined || options.input === undefined || options.output === undefined) 
   {
      console.log("Usage: asmproc -i <inputfile> -o <outputfile>");
      process.exit(-1);
      return;
   }   

   // set target
   target.dasm = options.target === "dasm";
   target.ca65 = options.target === "ca65";
   target.z80asm = options.target === "z80asm";
   target.cpu6502 = target.dasm || target.ca65;
   target.cpuz80 = target.z80asm;   

   defines = options.define === undefined ? [] : options.define.split(",");

   let FName = options.input;
   let FOut = options.output;

   if(FName == FOut)
   {
      console.log("file names must be different");
      process.exit(0);
   }

   if(!fs.existsSync(FName))
   {
      console.log("can't find file");
      process.exit(0);
   }

   const input = fs.readFileSync(FName).toString().replace(/\r/g," ");

   const output = ProcessFile(input);   

   console.log(output);

   //L.SaveToFile(FOut);

   console.log(`asmproc OK, created: "${FOut}"`);
   process.exit(0);
}

function ProcessFile(input: string): string
{
   let ast = MakeAST(input);

   ast = simplifyAST(ast);

   // if(ast.type === "error") return `Error in line ${ast.error.location.start.line} column ${ast.error.location.start.column}:\n${ast.error.message}`;

   console.log(JSON.stringify(ast,undefined,2));

   const compiled = AstToDasm(ast);

   return compiled;
}

import { ASTNode } from "./nodes";

function MakeAST(input: string): ASTNode {
   const parser  = require("./grammar");

   const tracer = {
      trace: function(d: any) {         
         //console.log(`${d.type} => ${d.rule}`);
      }
   };

   const options = { tracer };
   try
   {        
      const result = parser.parse(input, options) as ASTNode;
      return result;
   }
   catch(ex) {      
      return { type: "error", error: ex };
   }
}

function simplifyAST(ast: ASTNode): ASTNode
{
   return ast;
}

// import { BasicSolver } from "./basic";



function AstToDasm(node: ASTNode): string {  
   return nodeToString(node);

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
