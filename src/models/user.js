const mongoose =require( 'mongoose');
var Schema = mongoose.Schema;

var user = new Schema({
  "user_id": {
    "type": "String"
  },
  "user_type": {
    "type": "String"
  },
  onTrial : { type: "Boolean", default: true },
  "email": {
    "type": "String"
  },
  "user_name": {
    "type": "String"
  },
  "user_shortname": {
    "type": "String"
  },
  "broker": {
    "type": "String"
  },
  "exchanges": {
    "type": [
      "String"
    ]
  },
  "products": {
    "type": [
      "String"
    ]
  },
  "order_types": {
    "type": [
      "String"
    ]
  },
  "avatar_url": {
    "type": "Mixed"
  },
  "meta": {
    "demat_consent": {
      "type": "String"
    }
  },
  "lastLogin": {
    "type": "Date"
  },
  "firstLogin": {
    "type": "Date"
  },
  "loginSessions": {
    "type": [
      "Mixed"
    ]
  },
  configs:{
    "maxOrder": {
      "type": "Number"
    },"minTarget": {
      "type": "Number"
    },"quantity": {
      "type": "Number"
    },
    "marketOrder": {
      "type": "Boolean"
    },
    "isBullish": {
      "type": "Boolean"
    },
    "isBearish": {
      "type": "Boolean"
    }
  },
  "orders":{
    "type": [
      "Mixed"
    ]
  },
  "shortOrders":{
    "type": [
      "Mixed"
    ]
  }
},{
  toObject: {
    transform: function (doc, ret) {
      ret.lastLogin = JSON.stringify(ret.lastLogin);
      ret.firstLogin = JSON.stringify(ret.firstLogin||"");
      delete ret._id;
    }
  },
  toJSON: {
    transform: function (doc, ret) {
      delete ret._id;
    }
  }
});

mongoose.models = {};

var User = mongoose.model('User', user);

module.exports = User;