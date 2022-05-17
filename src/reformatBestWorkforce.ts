// read in a json, reformat it
//
// 1) remove = "X" is sorted to bottom.
// 2) certain attributes are pulled into front.
//
//
var fs = require('fs');
var _ = require('lodash');
import * as AugmentData from "./augmentData";
import * as Helpers from './helpers';
import * as ExpandExcel from './expandExcel';
import { Recoverable } from "repl";
import { normalize } from "path";


var data = Helpers.readJSON('data/best/Workforce.json');

var transformed = [];

var PropMappings = {
  "ids": "acsn",
};

var PropOrder = [
  "todoCheck", "mdl", "entity",
  "field",
  "dimensionType",
  "dataType",
  "field_label",
  "kind",
  "cfo",
  "csf",
  "comment",
  "newNotInACSN",
  "remove",
  "field_description",
  "aggregation",
  "values",
  "custom",
  "isBenchMark",
  "convertToAttribute",
  "benchMarkValues",
  "wfaSpecific",
  "dimensionTypeSource",
  "entityLabel",
  "acsn",
  "bidb",
  "cfod",
  "hris",
  "odmm",
  "odv2",
  "yuli",
  "odm_and_mdi_field",
  "odmcomment",
  "proptype",
  "notNull",
  "typeInfo",
  "cdsType",
  "length",
  "precision",
  "picklist",
  "scale"
];

var nr = 0;
data.forEach(element => {
  var obj  = {};
  Object.getOwnPropertyNames(element).forEach(pn =>  {
    var pnm = PropMappings[pn] || pn;
    if ( element[pnm] && element[pnm] != element[pn]) {
      obj[pn] = element[pn];
      console.log(" cannot map " + element[pnm] + " <-> " + element[pn] );
    }
    obj[pnm] = element[pn];
  });
  if ( !obj["mdl"]) {
    obj["mdl"] = "best";
  }
  if ( nr == 0) {
    console.log(JSON.stringify(obj,undefined,2));
  }
  ++nr;
  transformed.push(obj);
});

var SortByRemove = {
  undefined : 1,
  "" :  1,
  "C" : 2,
  "Q" : 3,
  "X" : 4
};


var SortByKind = {
  undefined : "77",
  "TableKey": "00",
  "Measure": "10",
  "DimensionEventRestriction" : "11",
  "DimensionPerson" : "12",
  "DimensionContract" : "13",
  "DimensionCostCenter" : "14",
  "DimensionPayroll" : "15",
  "DimensionGoal" : "16",
  "DimensionGoalInternal" : "17",
  "DimensionInternal" : "19",
  "internalDebug" : "21"
};


function getSortByKind(s ) {
  if( SortByKind[s]) {
    return SortByKind[s];
  }
  console.log('Unknown kind' + s);
  return 2;
}

function makeSortKey(rec) {
  return '' + SortByRemove[rec.remove] + ' ' + getSortByKind(rec.kind);
}
console.log("prior sort : " +  JSON.stringify(transformed[0],undefined,2));
transformed = _.sortBy(transformed, [rec => makeSortKey(rec)]);
console.log(JSON.stringify(transformed[0],undefined,2));
var datar = AugmentData.resortPropsFromModelOrDefaults(transformed, "data/best/workforce.data.model.json", PropOrder);
fs.writeFileSync('data/best/Workforce.json.tmp.json',JSON.stringify(datar,undefined,2));
var modelData = AugmentData.makeDataNameModel(datar, "" );
fs.writeFileSync("data/best/Workforce.json.model.data.tmp",JSON.stringify(modelData,undefined,2));
fs.writeFileSync('data/best/Workforce.json.tmp.full.json',JSON.stringify(datar,undefined,2));
