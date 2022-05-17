// extract dimension information from Yulis excels
const fs = require('fs');
const _ = require('lodash');
import * as TableSet from './tableSet';
import * as Helpers from './helpers';


const fetch = (args) => import('strip-bom').then(({default: fetch}) => fetch(args));

import { Console } from "console";
import { stringify } from 'querystring';
//import { arrayBuffer } from "stream/consumers";
const readline = require('readline');

function findWorksheet(wb, wsname : string) {
  var res = undefined;
  //console.log("here >" +  JSON.stringify(wb.ls,undefined,2).substring(0,200));
  wb.Workbook.Worksheet.forEach( ws => {
    if ( (ws["$"].Name && ws["$"].Name.trim()) == wsname ) {
      res = ws;
    }
    if ( (ws["$"]["ss:Name"] && ws["$"]["ss:Name"].trim()) == wsname ) {
      res = ws;
    }
  });
  if ( res == undefined) {
    console.log(' worksheet not found ' + wsname);
  }
  return res;
}

function getRow(ws, index:number) {
  var wsT = getTable(ws);
  if ( wsT.Row && (wsT.Row.length > index)) {
    return wsT.Row[index];
  }
  console.log("no row " + index);
  return { Cell: [] };
}

function getCols(ws, index : number ) : string[] {
  var r = getRow(ws,index);
  var mp = r.Cell.map( x => x["$"].content );
  console.log("HERE MP" + JSON.stringify(mp));
  if ( _.isEqual(mp,["Table Name","Comments","Column Name","Comments","","","","","","","","",""])) {
    console.log("BINGO");
    return ["entity", "entity_label", "field", "field_comment"];
  }
  var known = {};
  for( var i =0; i < mp.length; ++i ) {
    var key = mp[i];
    var cnt = 1;
    var keyx = key;
    while( known[keyx]) {
      keyx = key + "_" + cnt;
      ++cnt;
    }
    mp[i] = keyx;
    known[i] = keyx;
  }
  return mp;
}

function getTable(ws) {
  return ws.Table[0];
}

function extractRowsPropagatingFirst(ws, index : number, columns: string[], baseObj : any, collect : any[] ) {
  var table = getTable(ws);
  for(var i = index; i < table.Row.length; i++) {
    var row = table.Row[i];
    var cl = _.cloneDeep(baseObj);
    for(var c = 0; c < columns.length &&
      (row.Cell && (c < row.Cell.length)); ++c ) {
      var cell = row.Cell[c];
      cl[columns[c]] = cell["$"].content;
    }
    // do not push if identical with previous
    if ( collect.length > 0 &&
      _.isEqual(cl, collect[collect.length - 1])) {
      //console.log("skip equal " + i);
    } else {
      collect.push(cl);
    };
  }
  return collect;
}

type SepEtc = { name: string, sep: string, sepre : RegExp, escape : string};


function trimT(t :string, sepEtc : SepEtc) : string {
  t = t.trim();
  if( t.startsWith(sepEtc.escape) && t.endsWith(sepEtc.escape)) {
    return t.substring(1,t.length-1);
  }
  return t;
}


function parseCSVLine(sepEtc : SepEtc, line: string, row : number) : string[] {
  var idx = line.indexOf(sepEtc.escape);
  if( idx < 0) {
    return line.split(sepEtc.sepre);
  }
  var lastEnd = 0;
  var res = [];
  var plain = true;
  var nrquot = 0;
  for(var i = 0; i < line.length; ++i) {
    var c = line.charAt(i);
    if( (plain == true) && ( c == sepEtc.sep ) ) {
      var t = line.substring(lastEnd,i);
      //console.log("Push " + t);
      res.push(trimT(t,sepEtc));
      lastEnd = i+1;
      nrquot = 0;
    } else if (c == sepEtc.sep) {
      // gobble as part of escaped token
    }else if ( c == sepEtc.escape) {
      ++nrquot;
      plain = !plain;
      //if ( nrquot == 1) {
      //  console.log("Start escape at " + plain +  " " + line.substring(i));
      //}
      //if( nrquot >= 2) {
      //  console.log("end escape at " + nrquot + " " + sepEtc.sep + " " +  plain +  " " + line.substring(i));
      //}
      if ( nrquot > 2 ) {
        throw " ERR006 more than two quotes ??? Escaping quote quoate in " + line + " @" + row + ";" + i;
      }
    } else if( c == "\t" || c == " ") { // we never get here if \t is separator
      // add
    } else {
      if (nrquot > 2) {
        throw "ERR007 Unexpected character >" + c + "< after quoted string" + line + " @" + row + ";" + i;
      }
    }
  }
  // push last token
  t = line.substring(lastEnd,line.length)
  res.push(trimT(t,sepEtc));
  return res;
}
const tabetc = {  name: "Tab,double Quote", sep: '\t', sepre : /\t/, escape : '"'} as SepEtc;
const semetc = { name: "Semikolon, double Quote", sep: ';', sepre : /;/, escape : '"'};
const cometc = { name: "Comma, double Quote", sep: ',', sepre : /,/, escape : '"'};

function guessSeparator(line:string): SepEtc {
  var tab = 0;
  var com = 0;
  var sem = 0;
  for(var i = 0; i < line.length; ++i) {
    var c = line.charAt(i);
    if ( c ==  '\t') {
      tab++;
    }
    if ( c ==  ',') {
      com++;
    }
    if ( c ==  ';') {
      sem++;
    }
  }
  console.log(' tab ' + tab + ' com ' + com + ' sem ' + sem + ' ' + line)
  if ( tab > com) {
    if( tab > sem) {
      return tabetc;
    }
    return semetc;
  }
  if( sem > com) {
    return semetc;
  }
  return cometc;
}

function stripBom(line : string) : string {
  if( line.length && line.charCodeAt(0) > 255) {
  }
  if( line.length &&  line.charCodeAt(0) == 0xFEFF)
  {
    console.log("strip BOM " + line.charCodeAt(0).toString(16));
    return line.substring(1);
  }
  return line;
}

/// note: this parsing is header agnostic, it constructs simle string arrays, typing and header identification happens elsewhere
function extractCSV(file, wsname, collect) {
	return new Promise( (resolve,reject)  => {
		var lineRead = readline.createInterface({
			input : fs.createReadStream(file)
		});
		var i = 0;
		var maxcols = 0;
		var mincols = 9999999;
		var rowdata = [];
    var sepetc =  { x: null} ;
		lineRead.on('line', function(line) {
      line = stripBom(line);
      if( i == 0) {
        sepetc.x = guessSeparator(line);
        console.log(" Separator is " + sepetc.x.name );
      }
			var columns = parseCSVLine(sepetc.x, line, i);
			//var columns = getCols( ws, index - 1 );
			//console.log("columns : " + JSON.stringify(columns,undefined,2));
			//var table = getTable(ws);
			// make a vector of types and a ve
			var cdata = columns;
			maxcols = columns.length > maxcols ? columns.length : maxcols;
			mincols = columns.length < mincols ? columns.length : mincols;
			rowdata.push(cdata);
			++i;
		});
		lineRead.on('close', () => {
			collect[wsname] = { wsname : wsname,
				nrrows : i,
				maxcols : maxcols,
				mincols : mincols,
				tdata: rowdata
			};
			resolve(file);
		});
	});
}


function extractCSVS(files : any, inpFolder, fnout, huge : boolean) {
  var collect = {};
  var ps = [];
  files.forEach( file => {
	console.log("file is " + file);

	var wsname ='' +  file;
  if ( file.toLowerCase().endsWith(".csv")) {
    wsname = file.substring(0, file.length - 4);
  }
	{
      console.log(" wsname : " + wsname);
      ps.push(extractCSV(inpFolder + file, wsname, collect));
    }
  });
  return Promise.all(ps).then( x => {
    if(!huge) {
	    fs.writeFileSync( fnout, JSON.stringify(collect ,undefined, 2));
      console.log(' Wrote canonic output to ' + fnout);
    }
    console.log(' TableSet...' + TableSet.summary(collect));
    return collect;
  })
}

export function csvsToRows(baseName : string, huge : boolean) {
  var inpFolder = 'srcData/' + baseName + '/';
  var fnout = TableSet.makeDataBaseName(baseName) + ".col.json";
  return new Promise((resolve,reject) =>{
    fs.readdir(inpFolder, function(err, files) {
      console.log(JSON.stringify(files,null, 2));
      Helpers.assureDirExists('data/' + baseName);
      extractCSVS(files,inpFolder, fnout,huge).then(
        x => {
          console.log(" wrote data to " + fnout);
          resolve(x);
        }
      );
    })
  })
}

// csvsToRows('csv1');



