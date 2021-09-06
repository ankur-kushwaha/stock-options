const mongoose =require( 'mongoose');
var Schema = mongoose.Schema;

var angelInstrument = new Schema({
  "token": {
    "type": "Number"
  },
  "symbol": {
    "type": "String"
  },
  "name": {
    "type": "String"
  },
  "expiry": {
    "type": "Date"
  },
  "strike": {
    "type": "Number"
  },
  "lotsize": {
    "type": "Number"
  },
  "instrumenttype": {
    "type": "String"
  },
  "exch_seg": {
    "type": "String"
  },
  "tick_size": {
    "type": "Number"
  }
});

mongoose.models = {};

var AngelInstrument = mongoose.model('AngelInstrument', angelInstrument,"angelInstruments");

module.exports = AngelInstrument;
