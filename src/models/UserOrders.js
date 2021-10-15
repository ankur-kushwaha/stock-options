const mongoose =require('mongoose');
var Schema = mongoose.Schema;

var UserOrders = new Schema({
  "userId": {
    "type": "String"
  },
  "orders": {
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

var UserOrders = mongoose.model('UserOrders', UserOrders);

module.exports = UserOrders;