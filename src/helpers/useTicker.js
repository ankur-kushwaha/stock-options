import React from 'react'
import io from 'socket.io-client'
export default function useTicker(instrumentTokens){
    let [ticks,setTicks] = React.useState([]);
    React.useEffect(()=>{
        fetch('/api/ticker').finally(() => {
            const socket = io()
      
            socket.on('connect',() => {
              console.log('connect')
      
              socket.emit('init',{
                  instrumentTokens
              })
            })
      
            socket.on('ticks', data => {
                setTicks(data.ticks);
            })
      
            socket.on('a user connected', () => {
              console.log('a user connected')
            })
      
            socket.on('disconnect', () => {
              console.log('disconnect')
            })
        })
    },[])    
    return {
        ticks
    }
}