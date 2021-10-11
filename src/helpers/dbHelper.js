const Instrument = require('../models/instrument');
const User = require('../models/user');

async function fetchOptions({
  instrumentType='CE',
  tradingsymbol,
  expiry=""
}) {

  

  let query;
  if(Array.isArray(tradingsymbol)){
    tradingsymbol = tradingsymbol.map(item=>{
      if(item.indexOf("NIFTY") != -1){
        return 'NIFTY'
      }else{
        return item
      } 
    })
    query = { name: {$in:tradingsymbol}, instrument_type: instrumentType }
  }else{
    tradingsymbol = tradingsymbol.split(" ")[0];
    query = { name: tradingsymbol, instrument_type: instrumentType }
  }

  if(expiry){
    query.expiry = expiry;
  }

  console.log(query);
  
  let options = await Instrument.find(query).exec();

  return options.map(doc=>{

    return doc.toObject();
    
  }).map(out=>{
    delete out._id;
    return out;
  }).reduce(function (a, b) {
    a[b.instrument_token] = b;
    return a;
  }, {})
}

// { name: {$in:['ADANIENT']}, expiry: '2021-09-30', instrument_type: 'CE' }

async function fetchStock({
  tradingsymbol
}) {


  let stock = await Instrument.findOne({ tradingsymbol: tradingsymbol, exchange: "NSE" }).exec();
  console.log({ name: tradingsymbol });
  return stock;
}

async function fetchStocks({
  tradingsymbols
}) {

  let stocks = await Instrument.find({ tradingsymbol: { $in: tradingsymbols }, exchange: "NSE" }).exec();
  return stocks.reduce((a, b) => {
    a[b.instrument_token] = b;
    return a;
  }, [])
}

async function getUser(userId){
  return await User.findOne({user_id:userId}).exec();
}

async function updateUser(user){
  user.lastLogin = new Date();
  await user.save();
  return user;
}

async function createUser(userProfile){
  let user = new User(userProfile);
  user.firstLogin = new Date();
  await user.save();
}

module.exports = {
  createUser,
  getUser,
  updateUser,
  fetchStock,
  fetchStocks,
  fetchOptions
}
