import { Server } from 'socket.io'
import connectDB from '../../middleware/mongodb';
import { getKiteClient, getKiteTickerClient } from '../../helpers/kiteConnect'
import Instrument from '../../models/instrument';


async function fetchOptions({
  tradingsymbol,
  expiry = '2021-08-26'
}) {

  let options = await Instrument.find({ name: tradingsymbol, expiry: expiry }).exec();
  console.log({ name: tradingsymbol, expiry: expiry });

  return options.reduce(function(a,b){
    a[b.instrument_token] = b;
    return a;
  },{})
}

async function getStockQuote( tradingsymbol,kc) {
  console.log("Getting quote for ",tradingsymbol);
  let res = await kc.getQuote(["NSE:"+tradingsymbol])
  return res;
}

async function ioHandler(req, res) {

  if (!res.socket.server.io) {
    console.log('*First use, starting socket.io')

    const io = new Server(res.socket.server)

    let ticker = await getKiteTickerClient(req, res);
    let kc = await getKiteClient(req, res);

    
   

    io.on('connection', socket => {
      socket.broadcast.emit('a user connected')
      let tradingsymbol;

      ticker.connect();

      socket.on('disconnect',function(){
        ticker.disconnect();
      })
     

      socket.on('hello', async data => {
        console.debug("Hello data", data);

        
        let tradingsymbol = data.tradingsymbol;
        let stockData = await getStockQuote(tradingsymbol,kc);

      let options = await fetchOptions({
        tradingsymbol
      });

      let instrumentTokens = Object.keys(options).map(key=>Number(key));

        console.log("Connecting ticker", instrumentTokens);
        ticker.on("connect", function subscribe() {
          var items = instrumentTokens;
          console.log("Subscribing", items);
          ticker.subscribe(items);
          ticker.setMode(ticker.modeFull, items);
        })

        

        ticker.on("ticks", function onTicks(ticks) {
          
          console.debug("Ticks");
          ticks = ticks.map(tick=>{
            return {
              stockData,
              depth:tick.depth,
              instrument:options[tick.instrument_token]
            }
          })
          socket.emit("ticks", ticks);
        });

        ticker.on("error", function (data) {
          console.error("Error in getting ticker", data);
        })

      })
    });

    res.socket.server.io = io
  } else {
    console.log('socket.io already running')


  }
  res.end()
}

export const config = {
  api: {
    bodyParser: false
  }
}

export default connectDB(ioHandler)