

import { Server } from 'socket.io'
import {getKiteTickerClient} from '../../helpers/kiteConnect';
let { SmartAPI, WebSocket,WebSocketClient } = require("smartapi-javascript");

let smart_api = new SmartAPI({
  api_key: "bMhFOYF3",    // PROVIDE YOUR API KEY HERE
    
});

const ioHandler = async(req, res) => {
  let loginRes = await smart_api.generateSession("A631449", "Kushwaha1@")
  let {feedToken}  = loginRes.data;


  let web_socket = new WebSocket({
    client_code: "A631449",   
    feed_token:feedToken
  });

    
  web_socket.connect()
    .then(() => {
      web_socket.runScript("nse_cm|2885", "dp") // SCRIPT: nse_cm|13528, mcx_fo|222900  TASK: mw|sfi|dp

      setTimeout(function () {
        web_socket.close()
      }, 3000)
    })

  web_socket.on('tick', receiveTick)


  function receiveTick(data) {
    console.log("receiveTick:::::", data)
  }


  res.status(200).json(loginRes)    

};


export default ioHandler;