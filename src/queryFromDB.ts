// dump an SQL Query result to JSON.
"use strict";
import { PerformanceObserver, performance } from 'perf_hooks';
import * as fs from 'fs';
import * as SQL2JSON from './sql2JSON';
var t0 = performance.now();

//var hana = require("@sap/hana-client");

var creds = JSON.parse(''+fs.readFileSync('./HANACREDS.json'));
var QAX = creds["QAX"];
var BN3 = creds["BN3"];

//"httpUrl": "http://hanadbqax01.hcm-eng.c.eu-de-2.cloud.sap:8002"
//"httpUserName": "XXXX",

var connOptionsHANA = {
	serverNode: "qa1XXXXXXXXXXXXod.sap.biz:30115",
	encrypt: "true",
	sslValidateCertificate: "false",
	UID: "WSTSERVICE",
	PWD: "XXXXXXX",
  };

var tableNamesBizX = JSON.parse(''+fs.readFileSync('srcData/filters.json')).bizxTableNames as string[];

var schemaSELECTStart = "SELECT TABLE_NAME AS \"Table\", COLUMN_NAME, \"POSITION\" AS \"POS\", DATA_TYPE_NAME, CS_DATA_TYPE_NAME, \"LENGTH\", SCALE , LOWER( IS_NULLABLE ) AS IS_NULLABLE, INDEX_TYPE FROM SYS.TABLE_COLUMNS WHERE ";
var schemaSELECTOrder = " ORDER BY \"Table\", POS"

function makeQuery(schemaName : string, tableNames : string []) {
	return  schemaSELECTStart +
	" SCHEMA_NAME = '" + schemaName + "' AND TABLE_NAME IN ('"
	 + tableNames.join("', '") + "')"
	 + schemaSELECTOrder;
}

{
	var queryBIZX = makeQuery('ENGXSA_ANAEHSAC1',tableNamesBizX);
	/** some bizx data from QAX - ENGXSA_ANAEHSAC1 */
	SQL2JSON.selectJSON(queryBIZX, QAX, "QAX-BIZX" ).then( res =>
		fs.writeFileSync("srcData/bsch/schema.query.json", JSON.stringify(res,undefined,2))
		);
}
{
	var tableNamesWFAOLAP = ["FACT_TABLE_1", "FACT_TABLE_2"];
	var queryWFHO = makeQuery('ANAPEPSIOLAP_OLAP', tableNamesWFAOLAP);
	SQL2JSON.selectJSON(queryWFHO, BN3, "BNE3-HANAOLAP" ).then( res =>
		fs.writeFileSync("srcData/wfho/schema.query.json", JSON.stringify(res,undefined,2))
	);
}

//var tablesHANA = ["ANAPEPSIOLAP_OLAP.FACT_TABLE_1"];
//var tablesDWC = ["CDI_GATEWAY_SF.CDI_FACT_EOP_PERSIST" ];

/*
var tablesBOTH =[ { HANA : "ANAPEPSIOLAP_OLAP.FACT_TABLE_1",
					DWC : "CDI_GATEWAY_SF.R_FACT_TABLE_1_VW"},
					{ HANA : "ANAPEPSIOLAP_OLAP.FACT_TABLE_2",
					DWC : "CDI_GATEWAY_SF.R_FACT_TABLE_2_VW"},
					{ HANA : "ANAPEPSIOLAP_OLAP.FACT_TABLE_3",
					DWC : "CDI_GATEWAY_SF.R_FACT_TABLE_3_VW"}
			];

var tablesBOTH = [
	{	HANA : "CDI_GATEWAY_SF.CDI_FACT_EOP_PERSIST",
		DWC : "CDI_GATEWAY_SF.CDI_FACT_EOP_PERSIST"
	}
];

connOptionsHANA = connOptionsDWC;

function selectCountStar(viewName, connOptions, tag ) {
	return new Promise(function(resolve, reject) {
		var dbConnectionHANA = hana.createConnection();
		dbConnectionHANA.connect(connOptions, function (err) {
			if (err) {
				reject(err);
				return;
			}
			dbConnectionHANA.exec(
				"SELECT COUNT(*) as C FROM " + viewName,
				function (err, result) {
					if (err) {
						console.log(" error " + tag + " " + viewName + "" + err);
						reject(err);
						return;
					}
				//console.log(result[0]);
				//console.log(JSON.stringify(result[0]) + " " + tag + " "  + viewName + " " + (performance.now() - t0) + " ms");
				dbConnectionHANA.disconnect();
				resolve(result);
			});
		});
	});
}

function showOnePair(viewName) {
	return selectCountStar(viewName.HANA, connOptionsHANA, "HANA")
		.then( (a)=> {	selectCountStar(viewName.DWC, connOptionsDWC, "DWC" ).then( (b) => {
			console.log( " HANA " +  (a[0]["C"]+"").padStart(8) + " DWC " + (b[0]["C"] + " ").padStart(8) + viewName.DWC.padStart(20) + " " + (Math.floor((performance.now() - t0)) + " ms").padStart(10) ); return 1; }) } );
}

async function showOne() {
	for(var i = 0; i < 1000000; ++i) {
		for(const file of tablesBOTH) {
			await showOnePair(file);
		}
	}
};

showOne();

*/