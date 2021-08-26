const Instrument = require('../models/instrument');

async function fetchOptions({
  instrumentType='CE',
  tradingsymbol,
  expiry
}) {

  console.log({ name: tradingsymbol, expiry: expiry });
  tradingsymbol = tradingsymbol.split(" ")[0];
  let options = await Instrument.find({ name: tradingsymbol, expiry: expiry, instrument_type: instrumentType }).exec();

  return options.reduce(function (a, b) {
    a[b.instrument_token] = b;
    return a;
  }, {})
}

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
