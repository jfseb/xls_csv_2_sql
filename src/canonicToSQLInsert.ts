// Given a canonic file, and an SQL Table definition file,
// - validate input conforms,
// - generate SQL INSERT FILE

const fs = require('fs');
const _ = require('lodash');
import * as TableSet from './tableSet';
import * as Helpers from './helpers';
import { Console } from "console";

function makeDataBaseName(baseName: string) {
	return TableSet.makeDataBaseName(baseName);
}

export function writeSqlDef(baseName : string, x : TableSet.TableSet, hasHeader: boolean ) {
	var inpFile = 'data/' + baseName + '/' + baseName + '.col.json';
	var inpSQLDef = 'data/' + baseName + '/'+ baseName + '.tableDef.json';
	var sqlTableDef = TableSet.readSqlDefSync(inpSQLDef);
	var resCreate = TableSet.writeCreateTable(makeDataBaseName(baseName) + ".createTable.sql", sqlTableDef);
	console.log(resCreate);
	var ts = x || TableSet.readTableSetSync(inpFile);
	TableSet.checkColsValid(sqlTableDef, ts, hasHeader);
	TableSet.checkColsDataValid(sqlTableDef, ts, hasHeader);
	TableSet.writeInsertSqlHuge(makeDataBaseName(baseName)  + ".insert.sql", sqlTableDef, ts, hasHeader);
	//	fs.writeFileSync(makeDataBaseName(baseName) + ".create_and_insert.sql", resCreate + "\n" + resInsert);

}

// writeSqlDef("Excel_xml_2003", true);
