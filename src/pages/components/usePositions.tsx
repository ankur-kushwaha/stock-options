
import React,{useEffect} from 'react'



async function kiteConnect(method, args = []) {
  let url = `http://localhost:3000/api/kiteConnect?method=${method}&args=${JSON.stringify(args || [])}`
  console.debug('kiteConnect', url);
  return await fetch(url).then(res => res.json());
}
  
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
  
async function getPositions() {
      
    
  console.log('getting positions')
  try {
    const response = await kiteConnect('getPositions');
    return response.net;
  } catch (e) {
    console.error(e)
  }
}


  
export default function usePosition({
  interval=10000
}) {
  const [positions, setPositions] = React.useState(undefined);
  
  
  useEffect(() => {
  
    (async ()=>{
        
      let positions = await getPositions();
      
      if(positions){
        setPositions(positions.filter(position=>position.quantity<0))
      }
        
    })()
      
  }, [])
  
  React.useEffect(() => {
    let timer = setTimeout(async () => {
      let positions = await getPositions();
      if(positions){
        setPositions(positions.filter(position=>position.quantity<0))
      }

    }, interval)
    return () => {
      clearTimeout(timer)
    }
  
  }, [positions])
  
  return {
    positions
  }
}