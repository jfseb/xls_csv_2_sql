"use strict";
import * as fs from 'fs';
const { exit, argv } = require('process');
import { ArgumentParser } from 'argparse';
const { version } = require('../package.json');

console.log(argv);
console.log(argv.length);
if ( argv.length < 3 ) {
	console.log("usage formatJSON.ts <input> [output]");
	process.exit(-1);
}

var input = argv[2];
var output = argv[3] || input;
console.log("reading from " + input);
var data = fs.readFileSync(input);
if ( data ) {
	var dx = JSON.parse(''+ data);
	fs.writeFileSync(output, JSON.stringify(dx,undefined,2) );
}
