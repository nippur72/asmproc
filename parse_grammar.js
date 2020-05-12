"use strict";
var source = "lda pippo.prova(33).puffa\n";
function trace_plain() {
    var parser = require("./grammar");
    var tracer = {
        trace: function (d) {
            //if(d.type == "rule.match") console.log(`${d.type} => ${d.rule}`);
            console.log(d.type + " => " + d.rule);
        }
    };
    var options = { tracer: tracer };
    var result = parser.parse(source, options);
    console.log(JSON.stringify(result, undefined, 2));
}
function tracer_backtrace() {
    var Parser = require('./grammar');
    var Tracer = require('pegjs-backtrace');
    var tracer = new Tracer(source);
    var options = { tracer: tracer };
    try {
        var result = Parser.parse(source, options);
        console.log(JSON.stringify(result, undefined, 2));
    }
    catch (e) {
        console.log(tracer.getBacktraceString());
    }
}
tracer_backtrace();
