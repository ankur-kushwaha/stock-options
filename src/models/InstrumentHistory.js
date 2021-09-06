const mongoose =require( 'mongoose');
var Schema = mongoose.Schema;

var instrumentHistory = new Schema({
  "name": {
    "type": "String"
  },
  "token": {
    "type": "String"
  },
  "change": {
    "type": "String"
  },
  "trend": {
    "type": "String"
  },
  "trendCount": {
    "type": "String"
  },
  "timestamp": {
    "type": "Date"
  },
  "history": {
    "type": [
      "Mixed"
    ]
  }
});

mongoose.models = {};

var Instrument = mongoose.model('InstrumentHistory', instrumentHistory,"InstrumentHistory");

module.exports = Instrument;