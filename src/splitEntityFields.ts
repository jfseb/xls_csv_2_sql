var fs = require('fs');
import * as  _ from 'lodash';

const ENTITIES = "entities";
const FIELDS = "fields";

import * as AugmentData from './augmentData';

import * as Helpers from './helpers';
var dataNames = Helpers.readJSON('data/data.json');

var entityColumns = ["entity", "entity_label"];

function makeFNData( dn: string, cls: string): string {
  return 'data/'+ dn + '/' + dn + '.' + cls + '.json';
}

function makeKey(dn: string, cls: string, rec: any ) {
  if ( cls == ENTITIES ) {
    return dn + "|" + rec.entity;
  }
  return dn + "|" + rec.entity + "|" + rec.field;
}

function splitTo(dn : string, cls : string, data : any[] ) {
  var fnModel = 'data/'+ dn + '/' + dn + '.' + cls + '.json.model.json';
  var r = Helpers.readJSONorNull(fnModel);

  var splitFilters = Helpers.readJSONorNull('data/' + dn + '/split.filters.json') || {};
//  if( splitFilters["skip-id"]) {
    //splitFilters["skip-id"] = splitFilters["skip-id"].map( fid => dn + "|" + fid);
  //}
  var columns = [] as string[];
  var dataColumns = AugmentData.augmentColumns(data, undefined);
  if ( r ) {
    columns = r.columns;
  } else {
    columns = AugmentData.augmentColumns(data, undefined)
    if ( cls == ENTITIES) {
      columns = entityColumns;
    }
  }
  columns = columns.concat(["uri"]);
  console.log("here " + cls + " columns " + columns);
  var nxt = [];
  var found = {};
  data.forEach( rec => {
    var key = makeKey(dn,cls,rec);
    var nxtEl = { "mdl" : dn,
                  "ids" : key };
    if(!found[key]) {
      columns.forEach( cn => {
        nxtEl[cn] = rec[cn] || nxtEl[cn];
      });
      nxtEl.mdl = dn;
      nxtEl.ids = key;
      nxt.push(nxtEl);
      found[key] = 1;
    } else {
      //  console.log('skipping ');
      found[key] = found[key] + 1;
    }
  });
  if ( cls == ENTITIES) {
    Object.getOwnPropertyNames(found).forEach( idx => {
      nxt.forEach( nxtRec => {
        if( nxtRec.ids == idx) {
          nxtRec["cnt"] = ''+ found[idx];
        }
      });
    })
  }
  nxt = Helpers.filterRecords(nxt,splitFilters);
  var fnData = makeFNData(dn,cls);
  fs.writeFileSync(fnData, JSON.stringify(nxt,undefined,2));
}

["bidb", "hris", "odmm", "odv2", "cfod", "acsn", "wspa", "wspm", "yuli"].forEach(dn => {
  var data = Helpers.readJSON("data/" + dn + "/" + dn + ".data.json");
  [ENTITIES, FIELDS].forEach( cls => splitTo(dn,cls,data));
});

{
  var dn = "wsps"
  var data = Helpers.readJSON("data/wspc/Table_Descriptions__EC_.data.json");
  [ENTITIES, FIELDS].forEach( cls => splitTo(dn,cls,data));
}