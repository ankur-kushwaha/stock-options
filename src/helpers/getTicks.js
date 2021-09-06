
import io from 'socket.io-client'
export default function useTicker(instrumentTokens,callback){
  

  let ticks = {};
  fetch('/api/ticker').finally(() => {
    const socket = io()
       
    socket.on('connect',() => {
      console.log('connect')
      
      socket.emit('init',{
        instrumentTokens:instrumentTokens.map(Number)
      })
    })

    socket.on('error',(data) => {
      console.error(data);
    });
      
    socket.on('ticks', rawTicks => {
      let newTicks = rawTicks.ticks.reduce((a,b)=>{
        a[b.instrument_token] = b;
        return a;
      },{});
      ticks = {
        ...ticks,
        ...newTicks
      }

      callback(ticks)

    })
      
    socket.on('a user connected', () => {
      console.log('a user connected')
    })
      
    socket.on('disconnect', () => {
      console.log('disconnect')
    })
  })
}