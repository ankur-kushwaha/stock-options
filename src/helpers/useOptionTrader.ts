import { config } from 'fetch-mock';
import React from 'react'
import { kiteConnect } from './kiteConnect';
import { OrderStatus } from './Order';
import { getMockHistory } from './useZerodha';

async function getHistory(targetTradingsymbol, { interval, exchange }: { interval?: string, exchange?: string } = {}) {
  let dev = false;
  if (dev) {
    return await getMockHistory();
  } else {
    return await fetch(`/api/getDayHistory-v2?exchange=${exchange}&instruments=${targetTradingsymbol}&interval=${interval || 'ONE_MINUTE'}`)
      .then(res => res.json())
  }
}
  

export default function useOptionTrader({
  shouldRun,
  tradingsymbol,
  interval
}){

  const [state,setState]  = React.useState({
    signal:null,
    maxOrders:1,
    openOrders:[]
  });

  const [history,setHistory] = React.useState([]);

  const fetchHistory = React.useCallback(async()=> {
    let tradingsymbol = 'NIFTY 50'

    let newHistory = [...history];
    

    let res = await kiteConnect('getQuote',['NSE:'+tradingsymbol]);
    
    let quote = res['NSE:'+tradingsymbol];
    if(!quote){
      return;
    }    
      
    setHistory(old=>{
      let last = old[old.length-1];
      let count = 1
      let sum = quote.last_price;
      let period = 5;
      let historyLength = 1;
      while(count < period){
        if(history[history.length-count]){
          historyLength++
          sum+=history[history.length-count].closePrice;
        }
        count++;
      }
      let sma = sum/historyLength;
      let signal="";
    
      if(last){
        signal = sma > last?.sma ? 'GREEN': "RED"
      }
      newHistory = {
        sma,
        signal,
        closePrice:quote.last_price,
        "instrumentToken": quote.instrument_token,
        "tradingsymbol": quote.tradingsymbol,
        "timestamp":quote.timestamp,
      }
      return [...old,newHistory];
    });
    
  },[])

  React.useEffect(() => {
    let interval;
    fetchHistory()
    interval = setInterval(()=>{
      fetchHistory()
    },60000)
    return ()=>{
      clearInterval(interval)
    }
    
  }, [])

  return {
    history
  }
}