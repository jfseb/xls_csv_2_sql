import { fstat } from "fs";
import * as fs from 'fs';

export function readJSON( fn : string) : any {
	try {
		return JSON.parse('' + fs.readFileSync(fn));
	} catch( e ) {
		console.log("Error parsing content of "+ fn + " " + e);
		throw e;
	}
}



export function assureDirExists( fn : string) : void {
	if(!fs.existsSync(fn)) {
		fs.mkdirSync(fn);
	}
}

export function readJSONorNull( fn : string) : any {
	try {
		return JSON.parse('' + fs.readFileSync(fn));
	} catch( e ) {
		console.log("file " + fn + " not found or no json, (ok) " + e);
		return null;
	}
}

export function makeTypeInfoCDSCSN( field ) {
	/*
	"type" : "cdsType",
	"length" : "length",
	"key" : "key",
	"precision": "precision",
	"scale": "scale",
	"notNull" : "notNull",
	nativeDbType"
	*/
	var s = "";
	s = field.cdsType;
	s += " ";
	if (field.nativeDbType) {
	s += field.nativeDbType;
	}
	if ( field.length) {
	s += "(" +  field.length;
	if ( field.scale ) {
		s+= "," + field.scale;
	}
	s += ")";
	}
	if ( field.precision ) {
	s += "(" + field.precision;
	if ( field.scale ) {
		s+= "," + field.scale;
	}
	s += ")";
	}
	if ( field.notNull ) {
	s += " NOT NULL";
	}
	return s;
}


export function filterRecords(nxt : any[],splitFilters): any[] {
	var sizeI = nxt.length;
	Object.getOwnPropertyNames(splitFilters).forEach( pn =>{
		if( pn.startsWith("skip-")) {
			var skip = splitFilters[pn] as string[];
			var prop = pn.substring("skip-".length);
			console.log("filters " + pn + " " + skip);
			var skipIdx = {};
			skip.forEach(s => skipIdx[s] = 1);
			nxt = nxt.filter( rec => {
				if(skipIdx[rec[prop]] == 1) {
					return false;
				}else {
					return true;
				}
			});
		}
	}
	);
	if ( sizeI != nxt.length) {
		console.log("filtered " + (sizeI - nxt.length) + " of " + sizeI + " records ");
	}
	return nxt;
}