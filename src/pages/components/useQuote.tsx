
import React,{useEffect} from 'react'



async function kiteConnect(method, args = []) {
  let url = `http://localhost:3000/api/kiteConnect?method=${method}&args=${JSON.stringify(args || [])}`
  console.debug('kiteConnect', url);
  return await fetch(url).then(res => res.json());
}
  
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
  
async function getQuote({instruments}) {
      
    
  console.log('getting quote..',instruments)
  try {
    const response = await kiteConnect('getQuote', [instruments]);
    return response;
  } catch (e) {
    console.error(e)
  }
}


type Quote = {
    last_price: number,
    depth:{
      sell:[{
        price:number
      }]
    }
  }

  
export default function useQuote({
  instruments,
  interval=10000
}) {
  const [quote, setQuote] = React.useState<Quote>(undefined);
  
  
  useEffect(() => {
  
    (async ()=>{
        
      let quote = await getQuote({instruments});
      setQuote(quote)
        
    })()
      
  }, [])
  
  React.useEffect(() => {
    let timer = setTimeout(async () => {
      let quote = await getQuote({instruments});
      setQuote(quote)
    }, interval)
    return () => {
      clearTimeout(timer)
    }
  
  }, [quote])
  
  return {
    quote
  }
}