import { Server } from 'socket.io'
import {getKiteTickerClient} from '../../helpers/kiteConnect';

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    console.log('*First use, starting socket.io')

    const io = new Server(res.socket.server)

    io.on('connection', socket => {

      socket.on('init',async data=>{
        let tokens = data.instrumentTokens;
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

        ticker.on("error", function onTicks(data) {
          socket.emit('error',{
            data
          }) 
        })
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