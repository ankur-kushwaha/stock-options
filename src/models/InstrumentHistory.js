const mongoose =require( 'mongoose');
var Schema = mongoose.Schema;

var instrumentHistory = new Schema({
  name:{
    "type": "String"
  },
  lastChange:{
    "type": "Number"
  },
  lastReverse:{
    "type": "Number"
  },
  "date": {
    "type": "String"
  },
  "stock": {
    "type": "String"
  },
  "signal": {
    "type": "String"
  },
  "day5Change": {
    "type": "String"
  },
  "day10Change": {
    "type": "String"
  }
  
});

mongoose.models = {};

var Instrument = mongoose.model('InstrumentHistory', instrumentHistory,"InstrumentHistory");

module.exports = Instrument;