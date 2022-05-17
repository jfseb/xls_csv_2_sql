// extract dimension information from Yulis excels
var fs = require('fs');
var _ = require('lodash');
import * as AugmentData from "./augmentData";
import * as TableSet from './tableSet';
import * as Helpers from './helpers';
import * as ExpandExcel from './expandExcel';
import { Console } from "console";

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

function getYuliWorksheet(wb, wbName, index : number) {
  var collect = [];
  console.log('Working on wb ' + wbName);
  var baseObj = { wb : wbName };
  var ws = findWorksheet(wb, wbName);
  fs.writeFileSync( "data/yuli/wbplain.json", JSON.stringify(ws,undefined, 2));
  var cols = getCols( ws, index - 1 );
  var data = extractRowsPropagatingFirst(ws, index, cols, baseObj, collect);
  var measFileName = "data/yuli/yuli.data.json.tmp";
  //console.log("write " + wbName + " to " + measFileName);
  fs.writeFileSync( measFileName, '' + JSON.stringify(data,undefined, 2));
  return data;
}

function getYuliWorksheetData(wb) {


  return getYuliWorksheet(wb, "List", 1 );
}

//var r = JSON.parse(''+ fs.readFileSync("excel.json"));

//writeMeasuresAndAnalysisOptions(r);

// now combine
// a) all Measures,
// b) all

var Yuli = {
  "List" : "yuli"
};
// labels in the worksheets are messed up
var YuliMappings = {
  "wb": "wb",
  "oData Entity": "entity",
  "Fields" : "field",
  "Table comment": "entity_label",
  "Used for CSF Dashboard": "inCSF",
  "Used in\nCFO Dashboard" : "inCFO",
  "Field Comment": "comment",
  "ODM Comments" : "odmcomment",
  "ODM and MDI field" : "odm_and_mdi_field"
}


var YuliOptionDefaultColumnOrder = ["entity", "entity_label", "field", "field_label" ];

function collectMapping(rec, base,  mapping, result : any[] ) {
  if ( rec["oData Entity"] != "") {
    base.entity = rec["oData Entity"];
  }
  var r = _.cloneDeep(base);
  Object.getOwnPropertyNames(rec).forEach( pn => {
    if ( pn != "oData Entity") {
      var pnm = mapping[pn] || pn;
      if (r[pnm] && (r[pnm] != rec[pn])) {
        console.log('Clobbering ' + pnm + " with value for " + pn);
      }
      r[pnm] = rec[pn];
    }
  });
  r.typeInfo = r["Type"] + ((r.MaxLength != "") ? "(" + r.MaxLength + ")" : "");
  if ( r.field && (r.field != "")) {
    r.ids = r.entity + "|" + r.field;
    result.push(r);
  }
}

function collectYuli(wbData) {
  var resultA = [];
  Object.getOwnPropertyNames(Yuli).forEach( wbName => {
      console.log("here wbname " + wbName + "=>" + Yuli[wbName]);
      var base = {
                   "wb" : wbName
                 };
      wbData.forEach( rec => collectMapping(rec, base, YuliMappings, resultA) )
  });
  resultA = AugmentData.resortPropsFromModelOrDefaults(resultA,"yuli/yuli/yuli.data.json.model", YuliOptionDefaultColumnOrder );
  fs.writeFileSync("data/yuli/yuli.data.json", JSON.stringify(resultA,undefined,2));
  var mdlV = AugmentData.augmentResultFromData(resultA);
  fs.writeFileSync("data/yuli/yuli.data.json.model.json.tmp", JSON.stringify(mdlV,undefined,2));
}


function extractWorkSheet(ws) {
  var res = {};
  var wsname = ws["$"].Name.trim();
  res["wsname"] = wsname;
  var index = 1;
  var maxcols = 0;
  var mincols = 9999999;
  var columns = getCols( ws, index - 1 );
  console.log("columns : " + JSON.stringify(columns,undefined,2));
  var table = getTable(ws);
  var rowdata = [];
  var rowtypes = [];
  for(var i = 0; i < table.Row.length; i++) {
    var row = table.Row[i];
    // make a vector of types and a ve
    var cdata = [];
    var ctype = [];
    maxcols = columns.length > maxcols ? columns.length : maxcols;
    mincols = columns.length < mincols ? columns.length : mincols;
    var ishift = 0;
    for(var c = 0; c < columns.length &&
      (row.Cell && (c < row.Cell.length)); ++c ) {
      var cell = row.Cell[c];
      if ( cell["$"].Index ) { // 1 based
        var idx =  parseInt(cell["$"].Index) -1;
        var cr = c + ishift;
        while(idx > c + ishift) {
          ++ishift;
          console.log('Shifting at Row @' + i + " " + c + " to " +  idx + "(" + ishift + ")");
          ctype.push(cell["$"].type);
          cdata.push(""); // empty cell
        }
      }
      var tp = cell["$"].type;
      ctype.push(cell["$"].type);
      cdata.push(cell["$"].content);
    }
    rowdata.push(cdata);
    if ( rowtypes.length == 0) {
      rowtypes.push( { from : i, ctype : ctype });
    } else {
      if (!_.isEqual(rowtypes[rowtypes.length-1].ctype,ctype)) {
        console.log("New types at " + i + " :\n"  + JSON.stringify(rowtypes[rowtypes.length-1].ctype)
        + "\n"
        + JSON.stringify(ctype));
        rowtypes[rowtypes.length-1].to = i;
        rowtypes.push( { from: i, ctype : ctype});
      }
    }
  }
  // last row.
  if(rowtypes.length > 0 ) {
    rowtypes[rowtypes.length - 1].to = i;
  }
  return { wsname : wsname,
           nrrows : table.Row.length,
           maxcols : maxcols,
           mincols : mincols,
           ttype: rowtypes,
           tdata: rowdata };
}


function extractWorkBooks(wb : any, fnout) {
  var collect = {};
  wb.Workbook.Worksheet.forEach( ws => {
    if ( (ws["$"].Name && ws["$"].Name.trim())) {
      var wsname = ws["$"].Name.trim();
      console.log(" wsname : " + wsname);
      var res = extractWorkSheet(ws);
      collect[wsname] = res;
    }
  });
  fs.writeFileSync( fnout, JSON.stringify(collect ,undefined, 2));
  console.log(' TableSet...' + TableSet.summary(collect));
	console.log(' Wrote canonic output to ' + fnout);
}

export function excelXmlToRows(baseName : string) {
  var inpFile = "srcData/" +  baseName + "/" + baseName + ".xml";
  return ExpandExcel.processExcel(inpFile, inpFile + '.tmp.spec')
  .then( x =>
   {
     //fs.writeFileSync( "data/" + inpFile + '.1.json', JSON.stringify(x ,undefined, 2));
     extractWorkBooks(x, TableSet.makeDataBaseName(baseName) + '.col.json');
  });
}

// excelXmlToRows('srcData/', 'Excel_xml_2003.xml');
