// extract dimension information from Yulis excels
const fs = require('fs');
const _ = require('lodash');
import * as TableSet from './tableSet';
import * as Helpers from './helpers';
import * as ExcelToRows from './excelToRows';

import * as CsvToRows from './csvsToRows';
import * as CanonicToSQLInsert from './canonicToSqlInsert';
import { tail } from 'lodash';
import { sqlGOToCanonic } from './mssqlToRows';
import { canonicToExcel } from './canonicToExcel';
import { Console } from 'console';
import { argv, exit } from 'process';


var purpose = `
==============================
-to SQL : Source files to SQL INSERT scripts

1) Folder containing CSV files
usage

node js/main.js -f myData/

2) single excel file, potentially multiple worksheets

node js/main.js -f myData

What needs to be present:
1) in the folder respective CSV files.
2) in data/myData/  a file myData.sqlDef.json with a matching table definition.

If the SQLDefinition starts with a column WSNAME the name of the tab (or file) will be added as an extra column.
If header names are present in CSV they will be mapped
`.replace("\n","\r\n").replace("\r","\r\n");
//=======================================

const { ArgumentParser } = require('argparse');
const { version } = require('./../package.json');

function checkIsFolder(ff : string) {
	if( !ff.endsWith("/") && !ff.endsWith("\\")) {
		throw "CSV folder " + ff + " should end with a / or \\ ";
	}
}

function checkEndsDotXml(ff : string) {
	if( !ff.endsWith(".xml")) {
		throw "Excel must be in 2003 xml format (.xml): " + ff + ".";
	}
}
function checkEndsDotSql(ff : string) {
	if( !ff.endsWith(".sql")) {
		throw "SQL Query input must end with .sql: " + ff + ".";
	}
}



function parseArgsAndRun() {
  const parser = new ArgumentParser({
    description: 'xls_csv_2_sql ' + purpose
  });

  parser.add_argument('-v', '--version', { action: 'version', version });
  parser.add_argument('fileFolder', { help: 'File (.xml=>Excel 2003 xml; .sql=>MSSQL SQL) or Folder (trailing \'/\')' });
  parser.add_argument('-to', '--to', { dest: 'op', default: "SQL", help:' operation, one of SQL, JSON, EXCEL'});
  parser.add_argument('-C', '--ConnStr', { dest: 'ConnStr' , help: 'Conn str start "Server=XXXXX;Database=yyyyy;"' });
  parser.add_argument('-d', '--Server', { dest: 'Server' , help: 'File (.xml=>Excel 2003 xml; .sql=>MSSQL SQL) or Folder (trailing \'/\')' });
  parser.add_argument('-e', '--enc', { dest: 'Encoding', default: "utf-8" , help: 'Encoding of sql file (utf-8), (UTF16-LE)' });

  parser.add_argument('--noheader', { dest : 'header', action :'store_false' });
  parser.add_argument('--huge', { dest : 'huge', action :'store_true' });

  // argparse does not format the description ,the pyhton formatting_class option is not available/found, workaround...
  if ( argv.length == 2) {
	  parser.print_help();
	  console.log(purpose);
  }

  var r = parser.parse_args();

  console.dir("args: " + JSON.stringify(r,undefined,2));

  var hasHeader = r.header != false;
  var baseName = '';

  var tail = "";

  if( r.fileFolder.endsWith("/") || r.fileFolder.endsWith("\\")) {
		baseName = r.fileFolder.substring(0, r.fileFolder.length -1);
		tail = "/";
  } else if(r.fileFolder.endsWith(".xml")) {
		tail = ".xml";
  	  	baseName = r.fileFolder.substring(0, r.fileFolder.length -4);
} else if(r.fileFolder.endsWith(".sql")) {
		tail = ".sql";
	  	baseName = r.fileFolder.substring(0, r.fileFolder.length -4);
		r.op = "EXCEL";
} else {
	  baseName = r.fileFolder;
}
if( baseName.startsWith("srcData/") || baseName.startsWith("srcData\\")) {
	  baseName = baseName.replace(/\\/,"/");
	  baseName = baseName.replace(/\\/,"/");
	  baseName = baseName.replace(/\\/,"/");
	  baseName = baseName.replace(/\\/,"/");
	  baseName = baseName.replace(/\\/,"/");
	  var sp = baseName.split("/");
	  console.log(" segments" + JSON.stringify(sp,undefined,2));
	  baseName = sp[sp.length -1 ]; // last segment
	  r.fileFolder = "srcData/" + baseName + "/" + baseName + tail;
  }
  if ( r.op == "EXCEL") {
		// currently only SQL to EXCEL
		if(!r.fileFolder.endsWith(".sql")) {
		  throw " -to EXCEL is only supported with .sql input ";
	  	}
		if (r.ConnStr == undefined) {
			throw " -to EXCEL is only supported with .sql input and requires --ConnStr \"Server=abc\def;Database=xyz;\"";
		}
		r.op = "SQLQ2EXCEL";
  }
  if ( r.op == "SQL") {
	if( r.fileFolder.endsWith(".xml")) {
		r.op = "EXCEL2SQL";
	} else {
		r.op = "CSV2SQL";
	}
  }
  if ( r.op == "JSON") {
	if( r.fileFolder.endsWith(".xml")) {
		r.op = "EXCEL2JSON";
	} else {
		r.op = "CSV2JSON";
	}
  }

  r.baseName = baseName;
  console.dir(JSON.stringify(r,undefined,2));

  switch( r.op ) {
	case 'SQLQ2EXCEL':
		checkEndsDotSql(r.fileFolder);
		sqlGOToCanonic( baseName, r.fileFolder, r.ConnStr, r.Encoding ).then(
			(ts) => {
				return canonicToExcel(ts,baseName)
			}
		).then( x => {
			console.log("Wrote XML file" + TableSet.makeDataBaseName(baseName) + ".xml");
		})
		break;
	case 'CSVJSON':
		checkIsFolder(r.fileFolder);
		CsvToRows.csvsToRows(baseName, r.huge);
	break;
	case 'EXCEL2JSON':
		checkEndsDotXml(r.fileFolder);
		ExcelToRows.excelXmlToRows(r.fileFolder);
		break;
	break;
	case 'CSV2SQL':
		checkIsFolder(r.fileFolder);
		CsvToRows.csvsToRows(baseName, r.huge)
		.then(
			x => {
				CanonicToSQLInsert.writeSqlDef(baseName, x as TableSet.TableSet, hasHeader);
			});
	break;
	case 'EXCEL2SQL':
		checkEndsDotXml(r.fileFolder);
		ExcelToRows.excelXmlToRows(baseName)
		.then(
			x => {
				CanonicToSQLInsert.writeSqlDef(baseName, undefined, hasHeader);
			});
	break;
	default: throw "Unknown op" + r.op;
  }

}


parseArgsAndRun();


//csvsToRows('csv1');

