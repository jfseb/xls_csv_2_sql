// extract dimension information from Yulis excels
const fs = require('fs');
import * as _ from 'lodash';
import * as TableSet from './tableSet';
import * as Helpers from './helpers';
import { Console } from "console";
import { resolve } from 'url';
//import { arrayBuffer } from "stream/consumers";
const readline = require('readline');

const Connection = require('tedious').Connection;
const Request = require('tedious').Request;
const TYPES = require('tedious').TYPES;



var config = {
  server: 'WSyour_server.database.windows.net',  //update me
  authentication: {
      type: 'default',
      options: {
          userName: 'your_username', //update me
          password: 'your_password'  //update me
      }
  },
  options: {
      encrypt: true,
      database: 'WFAMDDB'  //update me
  }
};


/*
function runQuery( string sql,)
    var config = {
        server: 'your_server.database.windows.net',  //update me
        authentication: {
            type: 'default',
            options: {
                userName: 'your_username', //update me
                password: 'your_password'  //update me
            }
        },
        options: {
            // If you are on Microsoft Azure, you need encryption:
            encrypt: true,
            database: 'your_database'  //update me
        }
    };

    var connection = new Connection(config);
    connection.on('connect', function(err) {
        // If no error, then good to proceed.
        console.log("Connected");
    });



*/

function executeStatementInternal(sql, connection, resolve,reject) {
  // "SELECT c.CustomerID, c.CompanyName,COUNT(soh.SalesOrderID) AS OrderCount FROM SalesLT.Customer AS c LEFT OUTER JOIN SalesLT.SalesOrderHeader AS soh ON c.CustomerID = soh.CustomerID GROUP BY c.CustomerID, c.CompanyName ORDER BY OrderCount DESC;", function(err) {
  var request = new Request(sql, (err =>{
      if (err) {
        console.log(err);
      }
    }));
  var result = "";
  request.on('row', function(columns) {
    columns.forEach(function(column) {
      if (column.value === null) {
        console.log('NULL');
      } else {
        result+= column.value + " ";
      }
    });
    console.log(result);
    result ="";
  });

  request.on('done', function(rowCount, more) {
    console.log(rowCount + ' rows returned');
  });

  // Close the connection after the final event emitted by the request, after the callback passes
  request.on("requestCompleted", function (rowCount, more) {
    connection.close();
    resolve(result)
  });
  connection.execSql(request);
}

const Sql = require("msnodesqlv8");


function executeStatement2(sql : string) {
  return new Promise( (resolve,reject) =>{
    //var Connection = require('tedious').Connection;
    const pool = new Sql.ConnectionPool({
      server: "W-R90X6N83\\SQL2016DEVA",
      database: "WFADBMD",
      options: {
        trustedConnection: true
      }
    });
    pool.connect().then( a => {
      const request = new Sql.Request(pool);

      const query = `SELECT [FirstName]
        ,[LastName]
        ,[Email]
      FROM [Dev].[Users]`;
      request.query(query).then( (result) => {
        console.log(result);
      });
    });
  });
}

// very primitive
function executeStatement3(sql : string) {
  return new Promise( (resolve,reject) =>{
  //  var connStr = "Server=W-R90X6N83\SQL2016DEVA; Database=HrmlPC13xProd; User id=sa; Password=manaGER4; Pooling=true; Connection Lifetime=60; Packet Size=32767";
    var connStr = "server=W-R90X6N83\\SQL2016DEVA;Database=WFADBMD;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";
    //var Connection = require('tedious').Connection;

    Sql.query(connStr, sql, (err,rows) => {
      console.log(err);
      console.log(rows);
    });
  });
}

function executeQueryStatement(connStr: string, sql :string, dbgHelp:string, statusCollector: any ) {
  return new Promise((resolve,reject) =>{
    Sql.open(connStr, (err,conn) => {
      if(err) {
        console.log(err);
        console.log(" error executing sql >>>>\""+ sql + "<<<<<<\n");
        reject(err);
      }
      var result = {} as TableSet.Table;
      console.log( " starting query for " + dbgHelp);
      var q = conn.query(sql, (err,res) =>{
        if(err) {
          console.log(err);
          console.log(" error #2 executing sql >>>>\""+ sql + "<<<<<<\n");
          reject(err);
        }
        var colNames = result.tdata[0];
        //console.log(JSON.stringify(res,undefined,2));
        res.forEach( row => {
          var rd = colNames.map( m => row[m]);
          result.tdata.push(rd);
        });
        var count = res.length;
        console.log("This is the log for " + dbgHelp + " " + (count + 1) )
        statusCollector[dbgHelp] += 2;
        result.nrrows = count+1;
        result.ttype[1].to = count+1;
      });
      q.on('meta', (meta: any) => {
        //console.log('event: meta[0].name = ' + meta[0].name + JSON.stringify(meta,undefined,2));
          result.nrrows = 1;
        	result.maxcols = meta.length;
          result.mincols = meta.length;
          result.hasHeader = true;
          result.ttype = [
            {
            from : 0,
            to : 1,
            tdata : meta.map( (m) => "text")
          },
          {
            from : 1,
            to : undefined,
            tdata : meta.map( (m) => m.sqlType)
          },
        ];
        // check that nanes are unique
        var names = meta.map( m => m.name);
        var ul = _.uniq( (meta.map( (m) => m.name )));
        if ( ul.length != names.length ) {
          var dupl = names.filter( (x,index) => names.indexOf(x) < index );
          throw "Column names must be unique for  " + dbgHelp + " this is not the case:\nduplicates " + dupl.join(",") + "\n all " + names.join(',');
        }

        result.tdata = [
          meta.map( (m) => m.name)
        ];
      });

      q.on('rowcount', (count: any) => {
        console.log('event: rowcount = ' + count + " ignored ");
        //result.nrrows = count;
        //result.ttype[1].to = count;
      });
      /*
      q.on('row', (row: any) => {
        console.log('event: row = ' + row);
      });
      */

      q.on('done', () => {
        console.log('event: query done ' + sql.split("\n")[0] + " " + dbgHelp + " " + result.nrrows + " " + statusCollector[dbgHelp]);
        statusCollector[dbgHelp] += 100;
        console.log("in process..." + Object.getOwnPropertyNames(statusCollector).filter( pn => statusCollector[pn] > 0 ).sort().join(","));
        console.log("initial..." + Object.getOwnPropertyNames(statusCollector).filter( pn => statusCollector[pn] == 0
              || statusCollector[pn] == undefined ).sort().join(","));
        resolve(result);
      });
      q.on('closed', () => {
        console.log('event: closed');
        resolve(result);
      });
    });
  });
}


function executeStatement(sql) {
  return new Promise( (resolve,reject) =>{
    var Connection = require('tedious').Connection;
    var config1 = {
      server: '\\\\W-R90X6N83\\SQL2016DEVA',  //update me
      database : "WFADBMD",
        authentication: {
            type: 'default',
            options: {
              userName: 'sa', //update me
              password: 'manaGER4'  //update me
            }
          },
          options: {
            trustedconnection : true,
            // If you are on Microsoft Azure, you need encryption:
            // encrypt: true,
            database: 'WFADBMD'  //update me
        }
    };
    var config = {
      driver :"",
      server: 'W-R90X6N83\\SQL2016DEVA',  //update me
      database : "WFADBMD",
      options: {
          trustedconnection : true,
      }
  };
    var connection = new Connection(config1);
    connection.on('connect', function(err) {
      if(err) {
        console.log('Err on Connect: Error: ', err)
      }
      executeStatementInternal(sql,connection, resolve,reject);
    });
    connection.connect();
  });
}



function extractCSV(file, wsname, collect) {
	return new Promise( (resolve,reject)  => {
		var lineRead = readline.createInterface({
			input : fs.createReadStream(file)
		});
		var i = 0;
		var maxcols = 0;
		var mincols = 9999999;
		var rowdata = [];
		lineRead.on('line', function(line) {
			var columns = line.split(/,/);
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


function extractCSVS(files : any, inpFolder, fnout) {
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
    console.log(' Writing output file ' + fnout);
	  fs.writeFileSync( fnout, JSON.stringify(collect ,undefined, 2));
	  console.log(' TableSet...' + TableSet.summary(collect));
	  console.log(' Wrote canonic output to ' + fnout);
  })
}

export function csvsToRows(baseName : string) {
  var inpFolder = 'srcData/' + baseName + '/';
  var fnout = TableSet.makeDataBaseName(baseName) + ".col.json";
  return new Promise((resolve,reject) =>{
    fs.readdir(inpFolder, function(err, files) {
      console.log(JSON.stringify(files,null, 2));
      Helpers.assureDirExists('data/' + baseName);
      extractCSVS(files,inpFolder, fnout).then(
        x=> {
          console.log(" wrote data to " + fnout);
          resolve("ok");
        }
      );
    })
  })
}

function startsWith(ln : string, tag: string) : string {
  if( ln.startsWith(tag)) {
    return ln.substring(tag.length);
  }
  return undefined;
}
function stripQuotes(comment:string ) {
  if(comment.startsWith('"') && comment.endsWith('"')) {
    return comment.substring(1,comment.length-1);
  }
  return comment;
}

function parseSqlContext( context: any, ln: string, idx: number ) {
  ln = ln.trim();
  {
    var tag = "--WSORDER:";
    var tail = startsWith(ln,tag);
    if( tail ) {
      context.WSORDER = parseInt(tail);
      return true;
    }
  }
  {
    var tag = "--WSFIX:";
    var tail = startsWith(ln,tag);
    if( tail ) {
      var tails = tail.split(',');
      if(tails.length != 2) throw " Must follow numbers: --WSFIX:1,2  at " + idx + ":" + ln;
      context.WSFIX = tails.map( x => parseInt(x) );
      return true;
    }
  }
  {
    var tag = "--WSFIX:";
    var tail = startsWith(ln,"--WSCOLCOMMENT:");
    if( tail ) {
      var pos = tail.indexOf(":");
      if(pos < 1) throw "--WSCOLCOMMENT:ColnumNAMe:\"some text\" format expected, not at " + idx + ":" + ln + "tail:"+ tail;
      var colname = tail.substring(0,pos);
      var comment = tail.substring(pos+1);
      var comment = stripQuotes(comment);
      context.WSCOLCOMMENTS = context.WSCOLCOMMENTS || {};
      if( context.WSCOLCOMMENTS[colname]) {
        throw " Duplicate WSCOLCOMMENT for " + colname + " at " + idx + ":" + ln;
      }
      context.WSCOLCOMMENTS[colname] = comment;
      return true;
    }
  }
  return false;
}

function compareNumberNull(a : Number, b:Number) {
  if ( a == b ) {
    return 0;
  }
  if ( a == undefined && b != undefined ) {
    return 1;
  }
  if ( a != undefined && b == undefined ) {
    return -1;
  }
  if( a < b) {
    return -1;
  }
  return +1;
}

function fixFix(wb : TableSet.Table ) {
  if(wb.xlscontext?.WSFIX?.length >= 2 ) {
    wb.xlscontext.WSFIX[0] = Math.min(wb.xlscontext.WSFIX[0], wb.nrrows);
    wb.xlscontext.WSFIX[1] = Math.min(wb.xlscontext.WSFIX[1], wb.mincols);
  }
}

function moveColumnComments(wb : TableSet.Table ) {
  var cols = wb.tdata[0];
  if(wb.xlscontext?.WSCOLCOMMENTS) {
    wb.colcomments = cols.map( cn => wb.xlscontext?.WSCOLCOMMENTS[cn] || "" );
    Object.getOwnPropertyNames(wb.xlscontext.WSCOLCOMMENTS).forEach( ccname => {
      if( cols.indexOf(ccname) < 0 ) {
        console.log("WARNING: UNMAPPED COLUMN COMMENT  in " + wb.wsname
        + " column comment " + ccname + " know columns are " + cols.join(","));
      }
    });
  }
}
/// reads an SQL file script and
export function sqlGOToCanonic( baseName : string, sqlFileName : string, connServerDB :string, enc : string ) {
  var connStr = connServerDB + "Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";
  console.log("reading file " + sqlFileName);
  var fsql = fs.readFileSync(sqlFileName, enc);
  var res = {};
  var csql = { s:""};
  var state = "default";
  var wsqueries = [];
  var context = {} as TableSet.XslContext;
  var currWS = "UNKNOWN";
  (''+fsql).split("\n").forEach( (ln:string, idx) => {
    if(ln.trim().startsWith("--TOWS:")) {
      currWS = ln.trim().substring("--TOWS:".length);
      csql.s = "";
      context = {} as TableSet.XslContext;
      state ="readquery";
      return;
    };
    if(parseSqlContext(context, ln, idx)) {
      return;
    }
    if(ln.trim().startsWith("--")) {
      return;
    };
    if(ln.trim().startsWith("GO")) {
      console.log("Almost there " + JSON.stringify(ln) + " " + JSON.stringify(ln.trim()));
    }
    if ((ln.trim() == "GO;") || (ln.trim() == "GO" || (ln.trim() == "GO\r"))) {
      if( state=="readquery") {
        wsqueries.push({wsname : currWS, sql : csql.s, context : context, index : idx});
        csql.s = "";
        context = {} as TableSet.XslContext;
        state = "";
      }
    }
    if( state == "readquery" ) {
      csql.s += ln + "\n";
    }
  });
  console.log("Read queries : " + JSON.stringify(wsqueries));
  var wb = {} as TableSet.TableSet;
  var statusCollector = {};
  wsqueries.forEach( wsq => {  wb[wsq.wsname] = {} as TableSet.Table});
  var promset = wsqueries.map( wq =>
    {
      var dbgHelp = (wq.wsname + " @"+ wq.index );
      statusCollector[dbgHelp] = 0;
      return executeQueryStatement(connStr,"-- @ line "+ wq.index + "\n" + wq.sql, dbgHelp, statusCollector )
      .then(
        (r) => {
        wb[wq.wsname] = r as TableSet.Table;
        wb[wq.wsname].wsname = wq.wsname;
        wb[wq.wsname].xlscontext = wq.context;
    });
  });
  return Promise.all(promset).then( a => {
    // resort the workbooks
    var namesSorted = Object.getOwnPropertyNames(wb).sort( (a,b) => {
      var wba = wb[a];
      var wbb = wb[b];
      return compareNumberNull(wba?.xlscontext?.WSORDER, wbb?.xlscontext?.WSORDER);
    });
    // sort by names
    var wbr = {} as TableSet.TableSet;
    namesSorted.forEach( nm => {
      var tnm = nm;
      if ( nm.length > 30) {
        console.log("truncating too long worksheet name to 31 " + nm + " :" + tnm + "\n");
        tnm = nm.substring(0,30);
      }
      var MAXROWS = 120000;
      if ( wb[nm].nrrows > MAXROWS) {
        console.log(" Worksheet " + nm + " has too many rows + " + wb[nm].nrrows + " stripping to " + MAXROWS);
        wb[nm].nrrows = MAXROWS;
        wb[nm].tdata = wb[nm].tdata.slice(0,MAXROWS);
      }
      wbr[tnm] = wb[nm]
      wbr[tnm].wsname = tnm;
      fixFix(wbr[tnm]);
      moveColumnComments(wbr[tnm]);
    });
    // fix a fix
    return wbr;
  });
}
/*
var connStr = "server=W-R90X6N83\\SQL2016DEVA;Database=WFADBMD;Trusted_Connection=Yes;Driver={SQL Server Native Client 11.0}";
executeQueryStatment(connStr, "SELECT * FROM [dbo].[DB_KIND_COUNTS]").then( r => console.log(
  "here comes the sun" +
  JSON.stringify(r,undefined,2)));
*/

export function sqlGOToCanonicFile(baseName:string, sqlFileName: string, connServerDB : string, enc : string ) {
  return sqlGOToCanonic(baseName, sqlFileName, connServerDB, enc).then( x=>{
    Helpers.assureDirExists("data/"+ baseName);
    var fn = TableSet.makeDataBaseName(baseName) + '.col.json';
    fs.writeFileSync( fn, JSON.stringify(x,undefined,2));
    return x;
  });
}
/*test
sqlGOToCanonicFile("testSQL2XLS","testData/test.sql", "server=W-R90X6N83\\SQL2016DEVA;Database=WFADBMD;").then( (x)=> {
  console.log("is it love ? " + JSON.stringify(x,undefined,2));
  return x;
});
*/

//executeStatement3("SELECT * FROM [dbo].[DB_TBL_COL]");
//executeStatement2("SELECT * FROM [dbo].[DB_TBL_COL]");

//executeStatement("SELECT * FROM [dbo].[DB_TBL_COL]").then( (a) => console.log(a));
// csvsToRows('csv1');



