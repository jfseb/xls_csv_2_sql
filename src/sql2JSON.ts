// dump an SQL Query result to JSON
//
"use strict";
const { PerformanceObserver, performance } = require('perf_hooks');
var t0 = performance.now();
var hana = require("@sap/hana-client");
var t0 = performance.now();
var connOptionsDWC = {
  serverNode: "7c0a2099-4a95-4389-bb71-d4341f02c0d2.hana.canary-eu10.hanacloud.ondemand.com:443",
  encrypt: "true",
  sslValidateCertificate: "false",
  uid: "CDI_GATEWAY_SF#D026276",
  pwd: "FHeU/XC_k#*CL7tT",
  UID: "CDI_GATEWAY_SF#D026276",
  PWD: "FHeU/XC_k#*CL7tT",
};

//"httpUrl": "http://hanadbqax01.hcm-eng.c.eu-de-2.cloud.sap:8002"
//"httpUserName": "WSTSERVICE",
//"httpPassword": "Bne2blr!%",

var connOptionsHANA = {
	serverNode: "qa13hdbbn301.lab.od.sap.biz:30115",
	encrypt: "true",
	sslValidateCertificate: "false",
	uid: "WSTSERVICE",
	pwd: "XXXX",
	UID: "WSTSERVICE",
	PWD: "Bne2blr!%",
  };

  var tablesHANA = ["ANAPEPSIOLAP_OLAP.FACT_TABLE_1"];
  var tablesDWC = ["CDI_GATEWAY_SF.CDI_FACT_EOP_PERSIST" ];
/*
var tablesBOTH =[ { HANA : "ANAPEPSIOLAP_OLAP.FACT_TABLE_1",
					DWC : "CDI_GATEWAY_SF.R_FACT_TABLE_1_VW"},
					{ HANA : "ANAPEPSIOLAP_OLAP.FACT_TABLE_2",
					DWC : "CDI_GATEWAY_SF.R_FACT_TABLE_2_VW"},
					{ HANA : "ANAPEPSIOLAP_OLAP.FACT_TABLE_3",
					DWC : "CDI_GATEWAY_SF.R_FACT_TABLE_3_VW"}
			];
*/

export function selectJSON(sql, connOptions, tag ) {
	return new Promise(function(resolve, reject) {
		var dbConnectionHANA = hana.createConnection();
		dbConnectionHANA.connect(connOptions, function (err) {
			if (err) {
				reject(err);
				return;
			}
			dbConnectionHANA.exec(
				sql,
				function (err, result) {
					if (err) {
						console.log(" error " + tag + " " + sql + "" + err);
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
