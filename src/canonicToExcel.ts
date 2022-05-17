// this takes an canonic input ( with hasHeader = true)
// and Generates and Excel 2003 spreadsheet.xml
import * as fs from 'fs';
import * as xml2js from 'xml2js';
import * as _ from 'lodash';
import * as TableSet from './Tableset';
import * as Helpers from './Helpers';
import { flow } from 'lodash';

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

function cleanupV(v :any ) {
	if ( typeof(v) == "string") {
		for(var i = 0; i < v.length; ++i) {
			if ( v.charCodeAt(i) > 255) {
				v = v.substring(0,i) + "_" + v.substring(i+1);
			}
		}
		var vr = v.replace(/[\u{0080}-\u{FFFF}]/gu,"_");
		if (vr != v) {
			console.log("Stripping non ascii \n" + v + " ->" + v);
			return vr;
		}
	}
	return v;
}

function transfromTableSetForXMLBuilder(ts:TableSet.TableSet, baseName : string) : any {
	var dt = ts; // Helpers.readJSONorNull(TableSet.makeDataBaseName(baseName) + ".col.json") as TableSet.TableSet;
	var tmp = Object.getOwnPropertyNames(dt).map( pn => { return { "ws" : dt[pn] }; });
	var res = {
		author : process.env.USERNAME || "",
		time : (new Date()).toISOString(),
		sheets: []
		} as any;
	tmp.forEach( x => {
		var r = { ws : x.ws as any};
		r.ws.tdata = x.ws.tdata.map( r => {return { "row" :
		 	r.map( (v) => (v == null) ? "NULL" : cleanupV(v) )};});
		r.ws.dtypes = x.ws.ttype[1].tdata;
		delete r.ws["ttype"];
		res.sheets.push(r);
	});
	Helpers.assureDirExists("data/" + baseName);
	fs.writeFileSync(TableSet.makeDataBaseName(baseName) + ".xs.json", JSON.stringify(res,undefined,2))
	return res;
}


function writeValue(buffer : fs.WriteStream, v : any, typestring: string, rowIndex :number) {
	if( rowIndex == 0) {
		buffer.write(`
		<Cell ss:StyleID="s62">
		<Data ss:Type="String">` + v + `
		</Data>
		<NamedCell ss:Name="_FilterDatabase"/>
	</Cell>
	`);
	} else {
		if ( (typestring =="int" || typestring == "bigint")) {
			if( v == null ||  v == undefined) {
				buffer.write(`<Cell ss:StyleID="s64"><Data ss:Type="String">NULL</Data></Cell>`);
			} else {
				buffer.write(`<Cell><Data ss:Type="Number">` + v + `</Data></Cell>`);
			}
		} else if ( (typestring =="varchar" || typestring == "nvarchar") )  {
			buffer.write(`<Cell ss:StyleID="s63"><Data ss:Type="String">`+v+`</Data></Cell>`);
		} else {
			buffer.write(`<Cell ss:StyleID="s63"><Data ss:Type="String">UNKNOWN TYPE ! `+ typestring + ":" + v+ `</Data></Cell>`);
			throw "Unknown type " + typestring + " in row " + rowIndex + " value " + v;
		}
	}
}

function writeFromTo( fd : fs.WriteStream, src : string, from : number, to : number) {
	fd.write(src.substring(from,to));
}

function generateData(fd: fs.WriteStream, wsname: string, ws : TableSet.Table) {
	ws.tdata.forEach( (row,rowIndex) => {
			fd.write('<Row ss:AutoFitHeight="0">');
			//console.log(JSON.stringify(row,undefined,2));
			row.forEach( (v,colidx) => {
				writeValue(fd, v, ws.ttype[1].tdata[colidx], rowIndex);
			});
		fd.write('</Row>');
		if ( (rowIndex+1) % 1000 == 0) {
			console.log("Write " + rowIndex + " lines of " + wsname );
		}
	});
}

function generateLargeData(excelXml : string, src : TableSet.TableSet, fnout: string) {
	var idx = 0;
	var HEAD = "<DataPlaceHolder for=\"";
	var TAIL = "\" />";
	var fd = fs.createWriteStream(fnout);
	var idx = excelXml.indexOf(HEAD,idx);
	console.log(" whynotfound " + excelXml.indexOf(HEAD,idx) + " +" + excelXml.indexOf(HEAD)+
	' '+ excelXml.indexOf("DataPlaceHolder")
	);
	var endLast = 0;
	while(idx > 0 )  {
		// write the buffer up to here.
		writeFromTo(fd, excelXml,endLast,idx);
		var tail = excelXml.indexOf(TAIL,idx);
		var wsname = excelXml.substring(idx+HEAD.length,tail);
		console.log("Generating large data for " + wsname + " " + Object.getOwnPropertyNames(src).join(","));
		endLast = tail + TAIL.length;
		generateData(fd, wsname, src[wsname]);
		idx = excelXml.indexOf("<DataPlaceHolder for=\"",endLast);
	}
	// write tail;
	writeFromTo(fd,excelXml,endLast,excelXml.length);
	fd.close();
}

export function canonicToExcelIntern(src:  any, ts: TableSet.TableSet, baseName : string) {
	var outt = TableSet.makeDataBaseName(baseName) + ".1.xml";
	var out = TableSet.makeDataBaseName(baseName) + ".xml";
	var builder = new xml2js.Builder({ rootName : "wb", "indent" : " "});
	var xml = builder.buildObject(src);
	var interim = TableSet.makeDataBaseName(baseName) + ".tmp.xml";
	fs.writeFileSync(interim, xml);
	return new Promise( function(resolve, reject ) {
		child_process.execFile('bin/msxsl.exe', [interim, "xslt/tableSetXml_to_Excel2003.xsl", "-o", outt],
			function callback(error, stdout, stderr){
				if ( error ) {
					reject(error);
					return;
				}
				console.log(" embedding large data if required ");
				generateLargeData(''+ fs.readFileSync(outt, 'UTF-16LE') ,ts,out);
				console.log(' interim file is ' + interim);
				console.log(' out file is ' + out);
				var data = '' + fs.readFileSync(interim);
			}
		);
	});
}

export function canonicToExcel(ts: TableSet.TableSet, baseName : string) {
	var src = transfromTableSetForXMLBuilder(_.cloneDeep(ts), baseName);
	return canonicToExcelIntern(src, ts, baseName);
}

/* testonly

var baseName = "testSQL2XLS";
var dt = Helpers.readJSONorNull(TableSet.makeDataBaseName(baseName) + ".col.json") as TableSet.TableSet;

var tmp = Object.getOwnPropertyNames(dt).map( pn => { return { "ws" : dt[pn] }; });
var res = {
	author : process.env.USERNAME || "",
	time : (new Date()).toISOString(),
	sheets: []
	} as any;
tmp.forEach( x => {
	var r = { ws : x.ws as any};
	 r.ws.tdata = x.ws.tdata.map( r => {return { "row" : r};});
	 r.ws.dtypes = x.ws.ttype[1].tdata;
	 delete r.ws["ttype"];
	 res.sheets.push(r);
});
fs.writeFileSync(TableSet.makeDataBaseName(baseName) + ".xs.json", JSON.stringify(res,undefined,2))

canonicToExcel(res,baseName);

*/


