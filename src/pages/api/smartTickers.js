import { Server } from 'socket.io'
import {getKiteTickerClient} from '../../helpers/kiteConnect';
let { SmartAPI, WebSocket,WebSocketClient } = require("smartapi-javascript");

let smart_api = new SmartAPI({
  api_key: "bMhFOYF3",    // PROVIDE YOUR API KEY HERE
  // OPTIONAL : If user has valid access token and refresh token then it can be directly passed to the constructor. 
  access_token: "eyJhbGciOiJIUzUxMiJ9.eyJ1c2VybmFtZSI6IkE2MzE0NDkiLCJyb2xlcyI6MCwidXNlcnR5cGUiOiJVU0VSIiwiaWF0IjoxNjMwNTk5NDcwLCJleHAiOjE3MTY5OTk0NzB9.rUqZRJPamffC6lnhbnDamhcOBIIuipvDr0c2Talrk8_MZZX-r2nk4UJ6m9X-rIKupRhPPzjcHjv5TWKp2xMCEg",
  refresh_token: "eyJhbGciOiJIUzUxMiJ9.eyJ0b2tlbiI6IlJFRlJFU0gtVE9LRU4iLCJpYXQiOjE2MzA1OTk0NzB9.vLt-o0u0cf-5LY2oxIGRjNlatqiSbzsRjA1Qtn5TVHorTDMRv_rtQOcCxH493Wvv8ZNQ8OgXqV1PUWkKoas0sw"
});

let web_socket = new WebSocket({
  client_code: "CLIENT_CODE",   
  feed_token: "FEED_TOKEN"
});

// let data = await smart_api.generateSession("A631449", "Kushwaha1@");
// console.log(data);

const ioHandler = async (req, res) => {
  let loginRes = await smart_api.generateSession("A631449", "Kushwaha1@")
  if (!res.socket.server.io) {
    console.log('*First use, starting socket.io')

    const io = new Server(res.socket.server)

    io.on('connection',async socket => {
      
      let {feedToken}  = loginRes.data;
      let web_socket;
      
      socket.on('disconnect',async data=>{
        console.log('disconnected');
        web_socket.close()
      });

      socket.on('init',async data=>{

        web_socket = new WebSocket({
          client_code: "A631449",
          feed_token:feedToken
        });

        web_socket.connect()
          .then(() => {
            web_socket.runScript("mcx_fo|222900", "dp") // SCRIPT: nse_cm|13528, mcx_fo|222900  TASK: mw|sfi|dp
          })
    
        web_socket.on('tick', receiveTick)
    
        function receiveTick(data) {
          console.log("receiveTick:::::", data)
          socket.emit('error',{
            ticks:data.toString()
          }) 
        }
        
        // let tokens = data.instrumentTokens;
        // let ticker = await getKiteTickerClient(socket.handshake.headers.cookie);
        
        // ticker.connect();
        
        // ticker.on("connect", function subscribe() {
        //   console.log("Subscribing", tokens);
        //   ticker.subscribe(tokens);
        //   ticker.setMode(ticker.modeFull, tokens);
        // })

        // ticker.on("subscribe", function onTicks({instrumentTokens}) {
        //   ticker.subscribe(instrumentTokens);
        //   ticker.setMode(ticker.modeFull, tokens);
        // });

        // ticker.on("unsubscribe", function onTicks({instrumentTokens}) {
        //   ticker.unsubscribe(instrumentTokens);
        // });
    
        // ticker.on("ticks", function onTicks(ticks) {
        //   socket.emit('ticks',{
        //     ticks
        //   }) 
        // })

        // ticker.on("error", function onTicks(data) {
        //   socket.emit('error',{
        //     data:data.toString()
        //   }) 
        // })
      })
    })

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

export default ioHandler;