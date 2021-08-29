const Instrument = require('../models/instrument');

async function fetchOptions({
  instrumentType='CE',
  tradingsymbol,
  expiry
}) {


  let query;
  if(Array.isArray(tradingsymbol)){
    query = { name: {$in:tradingsymbol}, expiry: expiry, instrument_type: instrumentType }
  }else{
    tradingsymbol = tradingsymbol.split(" ")[0];
    query = { name: tradingsymbol, expiry: expiry, instrument_type: instrumentType }
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

module.exports = {
  fetchStock,
  fetchStocks,
  fetchOptions
}
