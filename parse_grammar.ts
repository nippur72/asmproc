const source = 
`lda pippo.prova(33).puffa
`;


function trace_plain()
{
   const parser  = require("./grammar");

   const tracer = {
      trace: function(d: any) {
         //if(d.type == "rule.match") console.log(`${d.type} => ${d.rule}`);
         console.log(`${d.type} => ${d.rule}`);
      }
   };

   const options = { tracer };
   const result = parser.parse(source, options);

   console.log(JSON.stringify(result,undefined,2));
}


function tracer_backtrace() {
   const Parser = require('./grammar'); 
   const Tracer = require('pegjs-backtrace');
      
   const tracer = new Tracer(source); 
   const options = { tracer };

   try 
   {
       const result = Parser.parse(source, options );
       console.log(JSON.stringify(result,undefined,2));
   } 
   catch(e) 
   {
      console.log(tracer.getBacktraceString());
   }   
}

tracer_backtrace();

