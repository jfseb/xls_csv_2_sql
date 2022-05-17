import * as  _ from 'lodash';

import * as Helpers from './helpers';

var sortColumns = [];

function alignA(a: string) {
  var r =  sortColumns.indexOf(a);
  if ( r >= 0 ) {
    return (''+r) .padStart(3,'0');
  }
  return "999" + a;
}

function compareAB(a: string, b: string) : number {
  var ap = alignA(a);
  var bp = alignA(a);
  if ( ap == bp) {
    return 0;
  }
  if ( bp < ap) {
    return -1;
  }
  return 1;
}

export class Result {
	data? : any;
	modelDescription? : string;
	columns : string[];
	columnsIndexed : string[];
	columnsDescription : Map<string,string>;
	columnsDefaultWidth? : Map<string,number>;
}

export function augmentColumns(data: any[], columns : string[]) {
  var seenColumns = { "uri" : 1}; // skip
  if (columns) {
    return columns;
  }
  columns =[];
  data.forEach( rec => {
    Object.getOwnPropertyNames(rec).forEach( pn => {
      if ( !seenColumns[pn] ) {
        seenColumns[pn] = 1;
        columns.push(pn);
      }
    });
  });
  return columns;
}


function augmentColumnsIndexed(columns : string[], columnsIndexed) : any {
  if (columnsIndexed) {
    return columnsIndexed;
  }
  return columns.map(cn => cn);
}

function augmentColumnsDescription(columns : string[], columnsDescription) : any {
  if (columnsDescription) {
    return columnsDescription;
  }
  var result = {};
  columns.forEach( cn => result[cn] = cn);
  return result;
}

function augmentColumnsDefaultWidth(columns : string[], columnsDefaultWidth) : any {
  if (columnsDefaultWidth) {
    return columnsDefaultWidth;
  }
  var result = {};
  columns.forEach( cn => { result[cn] = 100; });
  return result;
}

function augmentData(data : any[], columns : string[]) {
  var seenColumns = { "uri" : 1};
  columns.forEach(cn => seenColumns[cn] = 1);
  data.forEach(rec => {
    var presentColumns = {};
    Object.getOwnPropertyNames(rec).forEach( pn => {
      presentColumns[pn] = 1;
      // TODO flatten array
      if (!seenColumns[pn]) {
        delete rec[pn];
      }
    });
    columns.forEach(cn => {
      if (!presentColumns[cn]) {
        rec[cn] = "";
      }
    });
   });
}

function augmentSerIndex(result) {
  if ( result.serIndex) {
    return;
  }
  //var elasticlunr = (window as any).elasticlunr;
  // result.serIndex = AdaptElastic.makeLunrIndex(elasticlunr, result.data, result.columnsIndexed);
}

export function augmentResult(result : Result, jsonUrl: string) {
  result.columns = augmentColumns(result.data,result.columns);
  result.columnsIndexed = augmentColumnsIndexed(result.data,result.columns);
  result.columnsDescription = augmentColumnsDescription(result.columns, result.columnsDescription);
  result.columnsDefaultWidth = augmentColumnsDefaultWidth(result.columns, result.columnsDefaultWidth);
  augmentData(result.data, result.columns);
  augmentSerIndex(result);
}

function resortProps(rec, columns: []) {
  var res = {} as any;
  var recNames = Object.getOwnPropertyNames(rec);
  columns.forEach(cn => {
    if (recNames.indexOf(cn) >= 0) {
      res[cn] = rec[cn];
    }
  })
  return res;
}

export function resortPropsFromModelOrDefaults(data :any, modelPath : string, defaultColumnOrder : string[] ) : any[] {
  var mdl = Helpers.readJSONorNull(modelPath);
  var columns = (mdl && mdl.columns) || defaultColumnOrder;
  var allColumns = augmentColumns(data,null);
  allColumns.forEach(col => {
    if ( columns.indexOf(col) <= 0 ) {
      columns.push(col);
    }
  });
  console.log("Columns sorted as: " + columns);
  return data.map( rec => resortProps(rec, columns));
}


export function augmentResultFromData(data) : Result{
	var u : Result;
	u = {
	  data : data,
	  modelDescription : null,
	  columns : null,
	  columnsIndexed : null,
	  columnsDescription : null,
	  columnsDefaultWidth : null
	};
	augmentResult(u, "");
	sortColumns = ["entity","field","field_label","typeInfo", "entity_label"].concat(_.cloneDeep(u.columns));
	u.columns.sort( compareAB );
 	u.columnsIndexed.sort( compareAB );
	delete u.data;
  return u;
}


export function makeDataNameModel(data : any, fnurl: string ) {
  var u : Result;
  console.log(' working on ' + fnurl + " " + (data && data.length));
  u = {
    data : data,
    modelDescription : null,
    columns : null,
    columnsIndexed : null,
    columnsDescription : null,
    columnsDefaultWidth : null
  };
  augmentResult(u, fnurl);
  sortColumns = ["entity","field","field_description","typeInfo", "entity_description"].concat(_.cloneDeep(u.columns));
  u.columns.sort( compareAB );
  u.columnsIndexed.sort( compareAB );
  delete u.data;
  return u;
}
