import fs from "fs";

import nearley from "nearley";
const grammar = require("./grammar");

function test_expression(input: string)
{
   try 
   {
      // Make a parser and feed the input
      let parser = new nearley.Parser(grammar.ParserRules, grammar.ParserStart)
      
      let ans = parser.feed(input);
      
      // Check if there are any results
      if(ans.results.length !== 0) 
      {         
         let result = ans.results[0];         
         return result;
      } 
      else 
      {
         // This means the input is incomplete.
         console.log("Error: incomplete input, parse failed.");
         return undefined;         
      }
   } 
   catch(e) 
   {
      // Panic in style, by graphically pointing out the error location.
      console.log(`error at ${e.offset}`);
      return undefined;
   }     
}

let input = fs.readFileSync("file.txt").toString();

console.log(input);

let parsed = test_expression(input);

if(parsed === undefined)
{   
   throw "no parse";
}

console.log(JSON.stringify(parsed,undefined,3));

