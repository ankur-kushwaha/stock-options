const app = require('express')();
const server = require('http').Server(app);

const next = require('next');

const { fetchOptions,fetchStock,fetchStocks} = require('./src/helpers/dbHelper');
const { getKiteTickerClient } = require('./src/helpers/kiteConnect');

const mongoose = require('mongoose');

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const nextHandler = nextApp.getRequestHandler();


let port = process.env.PORT || 3000;

const io = require('socket.io')(server);
io.on('connect', async function (socket) {
  console.log('connected'); 
    
  socket.on('initPositions',async data=>{
    let tokens = data.instrumentToken;
    let ticker = await getKiteTickerClient(socket.handshake.headers.cookie);
    
    ticker.connect();
    
    ticker.on("connect", function subscribe() {
      console.log("Subscribing", tokens);
      ticker.subscribe(tokens);
      ticker.setMode(ticker.modeFull, tokens);
    })

    ticker.on("ticks", function onTicks(ticks) {
      socket.emit('ticks',{
        ticks
      }) 
    })

  })

  socket.on('init2',async data=>{
    let ticker = await getKiteTickerClient(socket.handshake.headers.cookie);
    console.debug("INIT", data);

    let {tradingsymbols,instrumentType} = data;
    let expiry = data.expiry;

    let instruments = [];
    let options = {}
    for(let tradingsymbol of tradingsymbols){
      let stockOptions = await fetchOptions({
        tradingsymbol,
        expiry,
        instrumentType:instrumentType||'CE'
      });

      options = {...options,...stockOptions}
      // console.log(options)
    }
    instruments = instruments.concat(Object.keys(options));
    // console.log(instruments);
    let stocks = await fetchStocks({tradingsymbols})

    instruments = instruments.concat(Object.keys(stocks));

    instruments = instruments.map(i=>Number(i));

    ticker.connect();
    ticker.on("connect", function subscribe() {
      console.log("Subscribing", instruments);
      ticker.subscribe(instruments);
      ticker.setMode(ticker.modeFull, instruments);
    })

    ticker.on("ticks", function onTicks(ticks) {
      // console.log("ticks",ticks.length)
      ticks = ticks
        .map(tick => {
          let instrumentType,instrument;
          if(options[tick.instrument_token]){
            instrumentType='OPTIONS';
            instrument = options[tick.instrument_token]
          }else{
            instrumentType='STOCK';
            instrument = stocks[tick.instrument_token]
          }
          return {
            tick,
            instrumentType,
            instrument
          }
        })
      socket.emit("ticks", {
        ticks
      });
    });

    ticker.on("error", function (data) {
      console.error("Error in getting ticker", data);
    })



  })

  socket.on('init', async data => {
    console.debug("INIT", data);
    let ticker = await getKiteTickerClient(socket.handshake.headers.cookie);

    let {tradingsymbol} = data;
    let expiry = data.expiry;

    let options = await fetchOptions({
      tradingsymbol,
      expiry
    });

        
    let stock = await fetchStock({tradingsymbol})
        

    let instrumentTokens = Object.keys(options).map(key => Number(key));
    instrumentTokens.push(stock.instrument_token);

    console.log("Connecting ticker", instrumentTokens);
    ticker.connect();
    ticker.on("connect", function subscribe() {
      var items = instrumentTokens;
      console.log("Subscribing", items);
      ticker.subscribe(items);
      ticker.setMode(ticker.modeFull, items);
    });

    ticker.on("ticks", function onTicks(ticks) {
      ticks = ticks
        .map(tick => {
          return {
            stock,
            tick,
            depth: tick.depth,
            instrument: options[tick.instrument_token]
          }
        })
      socket.emit("ticks", ticks);
    });

    ticker.on("error", function (data) {
      console.error("Error in getting ticker", data);
    })
  })
});

nextApp.prepare().then(() => {
    
  app.get("*", async (req, res) => {
    return nextHandler(req, res);
  })
    
  mongoose.connect('mongodb+srv://ankur:ankur@cluster0.wgb6k.mongodb.net/myFirstDatabase?retryWrites=true&w=majority' ,{
    useNewUrlParser: true
  } ,(err) => {
    console.log('mongodb connected',err);
  })
    
  server.listen(port, (err) => {
    if (err) throw err;
    console.log("Server stared on ", port);
  })
})