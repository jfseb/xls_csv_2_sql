// TableSet Type Definitions
//const fs = require('fs');
import * as fs from 'fs';
import * as Helpers from './helpers';
const _ = require('lodash');
import internal = require("assert");
import { fstat, FSWatcher } from 'fs';

type SQLColDef = {
	cname : string,
	dname? : string,
	basetype : string,
	length?: number,
	key ? : string, // true, ASC, DESC or not set
	scale? : number,
	nullable : boolean,
	ctype : string,
}

type SQLTableDef = {
	tname : string,
	cols : SQLColDef[]
}


export type TData = {
	from : Number,
	to : Number,
	tdata : Array<string>,
}

export type XslContext = {
	WSFIX : number[],
	WSCOLCOMMENTS : { [id:string] : string },
	WSDESC? : string,
	WSORDER?: number
}

export type Table = {
	wsname : string,
	nrrows : number,
	maxcols : number,
	mincols : number,
	hasHeader : boolean,
	xlscontext : XslContext,
	colcomments? : Array<string>,
	tdata : Array<Array<string>>
	ttype? : Array<TData>
}
export type TableSet = { [id: string] : Table };


export function readSqlDefSync( fname : string) : SQLTableDef {
	return Helpers.readJSON(fname);
}

export function readTableSetSync( fname : string) : TableSet {
	return Helpers.readJSON(fname);
}


function getSqlType(col : SQLColDef ) {
	var c = '';
	switch(col.basetype) {
		case "INT":
			c += col.ctype;
		break;
		case "DECIMAL":
			c += col.ctype + "(" + col.length  + "," + col.scale + ")";
		break;
		case "NVARCHAR":
			c += col.ctype + "(" + col.length + ") COLLATE database_default ";
			break;
			default:
		throw "Unknown type " + col.basetype + " for " + col.cname;
	}
	c += col.nullable ?  " NULL" : " NOT NULL"
	return c;
}

export function makeDataBaseName(baseName: string) {
	return 'data/' + baseName + '/' + baseName ;
}


function makeTextLiteral(col: SQLColDef, val: string) {
	if(col.length < val.length) {
		throw "ERR011 Value exceeds length: " + col.length + " < " + val.length + " value \"" + val + "\"\n";
	}
	for(var i = 0; i < val.length; ++i) {
		if ( val.charCodeAt(i) == 0 || val.charCodeAt(i) > 255) {
			console.log("WARNING: non ASCII value or 0 value at " + i + " code is : U+" + val.charCodeAt(i).toString(16) + " " + val.charCodeAt(i) + " val " + val.charAt(i));
		}
	}
	return "N" + "'" + val.replace('\n', '\\n' ).replace('\'','\'\'') + "'"
}


function toSqlLiteral(col : SQLColDef, val: string ) {
	var c = '';
	if ( isNullValue(val)) {
		return "NULL";
	}
	switch(col.basetype) {
		case "INT":
			return parseInt(val);
		break;
		case "DECIMAL":
			parseFloat(val);
			return val;
		break;
		case "DATETIME":
			throw "DateTIMe not implemented yet"
			return val;
		break;
		case "NVARCHAR":
			return makeTextLiteral(col, val);
	}
	throw " unknown type " + col.basetype + " no value \"" +val + "\"";
}

function simplifyDnameCName(sqlTableDef : SQLTableDef) {
	sqlTableDef.cols.forEach( col =>  { col.dname = col.dname || col.cname; });
}


export function genCreateTable(sqlTableDef : SQLTableDef) {
	simplifyDnameCName(sqlTableDef);
	var res = "DROP TABLE IF EXISTS [dbo].[" + sqlTableDef.tname + "];\nGO\n";
	res += "CREATE TABLE [dbo].[" + sqlTableDef.tname + "] (\n";
	var cols = sqlTableDef.cols.map( col => {
		var c = "[" + (col.dname) + "] ";
		c += getSqlType(col);
		return c;
	});
	res += cols.join("\n,");
	// add a constraint
	var keys = sqlTableDef.cols.filter( (col) => col.key );
	if ( keys.length) {
		keys.forEach( key => { if(key.key != "DESC" && key.key != "ASC") key.key = "ASC" });
		res += ", CONSTRAINT [PK_" + sqlTableDef.tname + "] PRIMARY KEY CLUSTERED \n (\n";
		var keyStrings = keys.map( key => "[" + key.dname + "] " + key.key + "\n");
		res += keyStrings.join(",");
		res += ")WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]"
		/*
		CONSTRAINT [PK_DB_TBL_COL_COLLATION] PRIMARY KEY CLUSTERED
(
	[WSNAME] ASC,
	[SERVERNAME] ASC,
	[DB_NAME] ASC,
	[TNAME] ASC,
	[CID] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) */
	}
	res += "\n);\nGO";
	return res;
}

export function writeCreateTable(fnout: string, sqlTableDef : SQLTableDef) {
	var s = genCreateTable(sqlTableDef);
	fs.writeFileSync( fnout, s);
	return s;
}

const WSNAME = "WSNAME";

function cleanColNames(colnames : string[]) {
	if ( colnames.length && colnames[0] == WSNAME) {
		var cleannames = _.cloneDeep(colnames);
		cleannames.shift();
		return cleannames;
	}
	return colnames;
}

function validateColsWs(sqlTableDef: SQLTableDef, ws : Table, hasHeader : boolean) {
	var res = '';
	var colnames = sqlTableDef.cols.map( c => c.cname);
	var cleancolnames = cleanColNames(colnames);
	if ( hasHeader ) {
		var wscolnames = ws.tdata[0];
		var diff1 = _.difference(wscolnames, colnames);
		if ( !_.isEqual(diff1,[])) {
			res += "Err001 Difference in colnames for worksheet " + ws.wsname + ": \n" +
			"\ndiff:" + diff1.join(",") +
			"\nws :" + wscolnames.join(",") +
			"\nsqlc:" + cleancolnames.join(",") +
			"\nsql :" + colnames.join(",") +
			"\nsqlc:" + cleancolnames.join(",") +

			"\n";
		}
		diff1 = _.difference(colnames,wscolnames);
		if ( !_.isEqual(diff1,[]) && !_.isEqual(diff1,["WSNAME"])) {
			res += "Err002 Difference in colnames for worksheet " + ws.wsname + ": \n" +
			"ws :" + wscolnames.join(",") +
			"\nsqlc:" + cleancolnames.join(",") +
			"\nsql :" + colnames.join(",")
			"\ndiff:" + diff1.join(",") +
			+ "\n";

		}
	}
	if ( ws.mincols != colnames.length && ws.mincols != cleancolnames.length ) {
		res += "Err003 Difference in column length :  Worksheet: "
		 + ws.mincols + " != SQL:" + colnames.length + "\n";
	}
	if ( res != '') {
		res += ws.wsname + " difference : " + res;
	}
	return res;
}

export function validateCols(sqlTableDef : SQLTableDef, ts : TableSet, hasHeader: boolean) {
	// validate that all worksheets have
	var res = "";
	Object.getOwnPropertyNames(ts).forEach( pn => {
		var ws = ts[pn];
		res += validateColsWs(sqlTableDef, ws, hasHeader);
	});
	if ( res != '') {
		throw res;
	}
	return res;
}

function isNullValue(val : string): boolean {
	return val == null || val == undefined || val == '' || val == 'NULL';
}

var MAXERROR = 100;

function validateColsDataWs(sqlTableDef: SQLTableDef, ws : Table, hasHeader : boolean) {
	var res = '';
	var wsname = ws.wsname;
	var colnames = sqlTableDef.cols.map( c => c.cname);
	var cleancolnames = cleanColNames(colnames);
	var colmap = {};
	var nrError = 0;
	var addError = function(s) {
		++nrError;  if(nrError < MAXERROR) { return s;} return '';};
	var rowIdx = 0;
	if ( hasHeader) {
		var wscolnames = ws.tdata[0];
		colnames.forEach( (nm,idx) => {
			colmap[nm] = wscolnames.indexOf(nm);
		});
		rowIdx = 1;
	} else {
		if ( ws.mincols == colnames.length) {
			colnames.forEach( (nm,idx) => colmap[nm] = idx);
		} else {
			cleancolnames.forEach( (nm,idx) => colmap[nm] = idx);
			colmap[WSNAME] = -1;
		}
		rowIdx = 0;
	}
	for(; rowIdx < ws.tdata.length; ++rowIdx) {
		var row = ws.tdata[rowIdx];
		colnames.forEach( (cn,cidx)  => {
			if ( nrError >= MAXERROR) {
				return;
			}
			var srcCidx = colmap[cn];
			if ( srcCidx == null || srcCidx == -1) {
				if( cn == WSNAME ) {
					// will be augmented
				} else {
					// check col is nullable
					if(!sqlTableDef.cols[cidx].nullable == true) {
						res += addError( "ERR010 value for " + cn  + " does not fit type " + getSqlType(sqlTableDef.cols[cidx]) + " " + wsname + "@" + rowIdx+ "," + srcCidx + ") : value not present\n");
						res += addError(res);
					}
				}
			} else {
				var val = row[srcCidx];
				if( isNullValue(val)) {
					if(sqlTableDef.cols[cidx].nullable != true) {
						res += addError( "ERR012  value for " + cn  + " does not fit type " + getSqlType(sqlTableDef.cols[cidx]) + " " + wsname + "@" + rowIdx+ "," + srcCidx + ") : value : \""+ val + "\"\n");
					}
				} else {
					var colDef = sqlTableDef.cols[cidx];
					try {
						toSqlLiteral(colDef, val);
					} catch(e) {
						console.log(' cidx '+ cidx + " " + JSON.stringify(colDef));
						console.log(' colmap '+ cidx + " " + JSON.stringify(colmap));
						console.log(JSON.stringify(row,undefined,2));
						res += addError("ERR013 value for " + cn  + " does not fit type " + getSqlType(sqlTableDef.cols[cidx]) +" " + wsname + "@" + rowIdx+ "," + srcCidx + ") : value : \""+ val + "\" " + e + " " + wsname + "\n" );
					}
				}
			}
		});
	}
	return res;
}

export function validateColsData(sqlTableDef : SQLTableDef, ts : TableSet, hasHeader: boolean) {
	// validate that all worksheets have
	var res = "";
	Object.getOwnPropertyNames(ts).forEach( pn => {
		var ws = ts[pn];
		res += validateColsDataWs(sqlTableDef, ws, hasHeader);
	});
	return res;
}

export function checkColsValid(sqlTableDef : SQLTableDef, ts : TableSet, hasHeader: boolean) {
	var res = validateCols(sqlTableDef,ts,hasHeader);
	if( res != '') {
		throw res;
	}
}

class FileBearer {
	nrFiles : number;
	fnbase :string;
	fd : number;
	constructor(fn:string) {
		this.fnbase = fn;
		this.nrFiles = 1;
		this.fd = fs.openSync(fn, "w");
	}
	write(a  : string) {
		return fs.writeSync(this.fd, ''+a);
	}
	close() { fs.closeSync(this.fd); }

	openNextFile() {
		this.nrFiles++;
		fs.closeSync(this.fd);
		fs.openSync(this.fnbase + "." + this.nrFiles + ".sql", "w");
	}
}

export function checkColsDataValid(sqlTableDef : SQLTableDef, ts : TableSet, hasHeader: boolean) {
	var res = validateColsData(sqlTableDef,ts,hasHeader);
	if( res != '') {
		throw res;
	}
}

function getTableName(tn : string) {
	return "[dbo].[" + tn + "]";
}

function fsWSCreateWriteStream( fn : string ) {
	var fd = fs.createWriteStream(fn);
	var obj = {
		fd: fd,
		write : function(a  : string) {
			return fd.write(a);
		},
		close : function() { fd.close() }
	}
	obj.fd = fd;
	return obj;
}

function fsSStreamCreateWriteStream( fn : string ) {
	var fd = fs.openSync(fn, "w" );
	var obj = {
		fd: fd,
		write : function(a  : string) {
			return fs.writeSync(fd, ''+a);
		},
		close : function() { fs.closeSync(fd); }
	}
	obj.fd = fd;
	return obj;
}


function fsCreateWriteStream( fn : string ) {
	return fsSStreamCreateWriteStream(fn);
	//return fsWSCreateWriteStream(fn);
}



function fsCreateWriteStream2( fn : string ) {
	var obj = {
		fd:null,
		write : function(a  : string) {
			return this.fh.writeSync(a);
		},
		close : function() { this.fh.close() }
	}
	obj.fd = fs.createWriteStream(fn);
	return obj;
}


function genInsertSqlWs(sqlTableDef: SQLTableDef, ws : Table, hasHeader : boolean, fws : FileBearer) {
	simplifyDnameCName(sqlTableDef);
	var nrGenLines = 0;
	var colnames = sqlTableDef.cols.map( c => c.cname);
	var coldnames = sqlTableDef.cols.map( c => c.dname);
	var cleancolnames = cleanColNames(colnames);
	var colmap = {};
	var rowIdx = 0;
	if ( hasHeader) {
		var wscolnames = ws.tdata[0];
		colnames.forEach( (nm,idx) => {
			colmap[nm] = wscolnames.indexOf(nm);
		});
		rowIdx = 1;
	} else {
		if ( ws.mincols == colnames.length) {
			colnames.forEach( (nm,idx) => colmap[nm] = idx);
		} else {
			cleancolnames.forEach( (nm,idx) => colmap[nm] = idx);
			colmap[WSNAME] = -1;
		}
		rowIdx = 0;
	}
	var nrOffset = rowIdx;
	console.log(" generating " + ws.wsname + " " + (ws.tdata.length - rowIdx) + "... " )
	fws.write("-- generating " + ws.wsname + " " + (ws.tdata.length - rowIdx) + "... " )
	fws.write("-- suppress 1 row inserted\nSET NOCOUNT ON;\n GO\n");
	for(; rowIdx < ws.tdata.length; ++rowIdx) {
		var line = "INSERT INTO " + getTableName(sqlTableDef.tname) + " (" + coldnames.join(",") + ") VALUES ("
		var row = ws.tdata[rowIdx];
		var literals = colnames.map( (cn,cidx)  => {
			var srcCidx = colmap[cn];
			if ( srcCidx == null || srcCidx == -1) {
				if( cn == WSNAME ) {
					var colDef = sqlTableDef.cols[cidx];
					return makeTextLiteral(colDef, ws.wsname);
					// will be augmented
				} else {
					return "NULL";
				}
			} else {
				var val = row[srcCidx];
				if( isNullValue(val)) {
					return "NULL";
				} else {
					var colDef = sqlTableDef.cols[cidx];
					try {
						return toSqlLiteral(colDef, val);
					} catch(e) {
						console.log(' cidx '+ cidx + " " + JSON.stringify(colDef));
						console.log(' cidx '+ cidx + " " + JSON.stringify(colmap));
						console.log(JSON.stringify(row,undefined,2));
						throw "value for " + cn  + " does not fit type " + getSqlType(sqlTableDef.cols[cidx]) + " @" + rowIdx+ "," + srcCidx + ") : value + \""+ val + "\" " + e + "\n";
					}
				}
			}
		});
		line += literals.join(" ,");
		line += ");"
		++nrGenLines;
		fws.write( line + "\n");
		if( nrGenLines % 250 == 249) {
			fws.write("\nGO\n");
		}
		const NEW_FILES_AT_LINE = 1000000;
		if ( nrGenLines % NEW_FILES_AT_LINE == NEW_FILES_AT_LINE -1 ) {
			var fnoutNext = fws.openNextFile();
			//var fnoutNext = fb.fnout +"." + nrFiles + ".sql" ;
			console.log("Opening next file for next million " + (nrGenLines +1)+ " " + fnoutNext);
			fws.write("-- generating " + ws.wsname + " " + (ws.tdata.length - rowIdx) + " file #" + fws.nrFiles + " (" + (nrGenLines+1) + ")... " );
			fws.write("-- suppress 1 row inserted\nSET NOCOUNT ON;\n GO\n");
		}
	}
	console.log(" ... generated " + ws.wsname + " " + (nrGenLines) +
	 "/" + (ws.tdata.length - nrOffset) + "... " );
}

export function genInsertSql(sqlTableDef : SQLTableDef, ts : TableSet, hasHeader: boolean, fnout : string) {
	// validate that all worksheets have
	var fws = new FileBearer(fnout);
	Object.getOwnPropertyNames(ts).forEach( pn => {
		var ws = ts[pn];
		genInsertSqlWs(sqlTableDef, ws, hasHeader, fws);
	});
	if ( fws.nrFiles > 1 ) {
		console.log(" Beware, more than one file  " + fws.nrFiles);
	}
	fws.close();
}



export function writeInsertSqlHuge(fnout: string, sqlTableDef : SQLTableDef, ts : TableSet, hasHeader: boolean) {
	var s = genInsertSql(sqlTableDef, ts, hasHeader, fnout);
	return undefined;
}



export function summary(ts : TableSet) {
	var res = "";
	res += "Nr Worksheets : " + Object.getOwnPropertyNames(ts).length + "\n";
	Object.getOwnPropertyNames(ts).forEach( pn => {
		var ws = ts[pn];
		res +=  ws.wsname + " (" + ws.nrrows + " x " + ws.maxcols + ")\n";
		if( ws.maxcols != ws.mincols) {
			res += "! raggeds mincols:" + ws.mincols + " != " + ws.maxcols + "\n";
		}
		if ( ws.tdata.length > 0 ) {
			res += "line 0: " + ws.tdata[0].join(",") + "\n";
		}
		if ( ws.tdata.length > 1 ) {
			res += "line 1: " + ws.tdata[1].join(",") + "\n";
		}
	});
	return res;
}
