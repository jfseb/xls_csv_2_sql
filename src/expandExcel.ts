// this takes an Excel 2003 spreadsheet.xml, and converts it into
// simplified json structure
//
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import * as _ from 'lodash';

const child_process = require('child_process');

function expandMergeAccross( rowCells : any[]) {
	if (!rowCells) {
		return;
	}
	//console.log("here rc" +  JSON.stringify(rowCells,undefined,2).substring(0,200));
	for(var i = 0 as number; i < rowCells.length; ++i) {
		var u =  JSON.stringify(rowCells[i],undefined,2);
		//console.log("here rc>" + (u && u.substr(0,200)));
		if ( rowCells[i]["$"] && rowCells[i]["$"].MergeAccross ) {
			var rowI = rowCells[i];
			var merge = parseInt(rowCells[i]["$"].MergeAccross);
			for(var k = 0; k < merge - 1; ++k) {
				var nxt = _.cloneDeep(rowI);
				nxt["$"].MergeExpand = "MA" + k + "/" + merge;
				delete nxt["$"].MergeAccross;
				rowCells.splice(i,0,nxt);
			}
			i += merge -1;
		}
	}
}

function expandTableRows(table) {
	table.Row.forEach( row =>
		expandMergeAccross(row.Cell)
	);
	// now MergeDown, which is trickier
	for( var r = 0; r < table.Row.length; ++r ) {
		var row = table.Row[r];
		if ( row.Cell) {
			for(var c = 0; c < row.Cell.length; ++c) {
				if ( row.Cell[c]["$"].MergeDown ) {
					var cellRC = row.Cell[c];
					var merge = parseInt(cellRC["$"].MergeDown);
					for(var k = 1; (k < merge+ 1) && ( (r+k) < table.Row.length); ++k) {
						var nxt = _.cloneDeep(cellRC);
						nxt["$"].mergeDown = "MD" + k + "/" + merge;
						delete nxt["$"].MergeDown;
						if (!table.Row[r+k].Cell) {
							table.Row[r+k] = {};
							table.Row[r+k].Cell = [];
						}
						table.Row[r+k].Cell.splice(c,0,nxt);
					}
				}
			}
		}
	}
}

function expandTables( result : any) {
	console.log("here result " +  JSON.stringify(result,undefined,2).substring(0,200));
	result.Workbook.Worksheet.forEach( worksheet => {
		worksheet.Table.forEach( table => expandTableRows(table))
	});
}

export function processExcel(src :string, out: string) {
	var interim = src + ".tmp.xml";
	return new Promise( function(resolve, reject ) {
		child_process.execFile('bin/msxsl.exe', [src, "xslt/simplifyExcel2003.xsl", "-o", interim],
			function callback(error, stdout, stderr){
				if ( error ) {
					reject(error);
					return;
				}
				console.log(' interim file is ' + interim);
				var data = '' + fs.readFileSync(interim);
				// With parser
				var parser = new xml2js.Parser(/* options */);
				parser.parseStringPromise(data).then(function (result) {
					console.dir(result);
					expandTables(result);
					resolve(result);
					console.log('expandedExcel');
				}).catch( err => reject(err));
			}
		);
	});
}

