import React from 'react'
import postData from '.';
import useZerodha from './useZerodha';
import getTicks from './getTicks';
import Order from './Order';

interface Config{
  instrumentToken:number,
  tradingsymbol:any,
  maxOrder:any,
  minTarget:any,
  quantity :any,
  isBullish:any,
  marketOrder:any,
  interval:any,
}

export default function useSellTrade(config:Config,userProfile){

  let [state,setState] = React.useState({
    orders: userProfile.orders?.filter(item=>item.tradingsymbol == config.tradingsymbol)||[],
    closedOrders: userProfile.closedOrders?.filter(item=>item.tradingsymbol == config.tradingsymbol)||[],
    closePrice:0,
    signal:undefined,
    intervalId:undefined,
    pendingOrders:userProfile.pendingOrders?.filter(item=>item.tradingsymbol == config.tradingsymbol)||[],
  });
  let {pendingOrders,orders,closedOrders} = state;
  let {createOrder2,getHistory} = useZerodha();
  let [history,setHistory] = React.useState([])
  let [closePrice,setClosePrice] = React.useState(200);

  React.useEffect(()=>{
    if(config.instrumentToken){
      getTicks([config.instrumentToken],(ticks)=>{
        let tick =ticks[config.instrumentToken];
        let closePrice = (tick.depth.buy[0].price+tick.depth.sell[0].price)/2 || tick.last_price;
        setClosePrice(Number(closePrice.toFixed(1)));
      });
    }
  },[config.instrumentToken])


  const fetchHistory  = React.useCallback(async()=>{
    let res = await getHistory(config.tradingsymbol,{
      interval:config.interval
    });
    setHistory(res.history);
  },[config.interval])

  function startAutoTrade(){
    console.log('starting autotrade...')
    let intervalId = setInterval(fetchHistory,10000);
    fetchHistory();
    setState({
      ...state,
      intervalId
    })
  }

  async function stopAutoTrade(){
    console.log('stoping autotrade...')
    let {intervalId}  = state;
    clearInterval(intervalId)
  }


  const log = React.useCallback((...args)=>{
    console.log(args)
  },[])

  React.useEffect(()=>{

    async function buySell(){

      let quote = history[history.length-1];
    
      if(!quote){
        return;
      }

      console.log('quote',quote)

      let signal = quote.signal;
      let orders:Order[] = [...state.orders]

      if(state.signal && state.signal != signal){
      
        if(signal == 'GREEN'){
          log("Green candle",quote);
          if(orders.length < config.maxOrder){
            log("Creating open position");
          
            let order = new Order({
              tradingsymbol:config.tradingsymbol
            });

            await order.openPosition({
              transactionType:"SELL",
              price:closePrice,
              quantity:config.quantity
            });

            orders.push(order)

          }else{
            log("Orders full")
          }
        }

        else if(signal == 'RED'){
          log("Red candle",quote);
          for(let order of orders.filter(item=>item.status == 'POSITION_OPEN')){
            log('trying closing order',order);
            await order.tryClosePosition({
              price:closePrice
            });
          }
        }
      }

      setState({
        ...state,
        signal,
        orders
      })

      await save({
        orders
      })
    }
    buySell()

  },[history.length]);

  async function save({
    configs,
    orders
  }:{configs?:any,orders?:any}){
    
    let data = {
      userId:userProfile.user_id,
      tradingsymbol:config.tradingsymbol,
      session:{
        configs:configs||config,
        orders:orders||state.orders,
      }
    };

    console.log('Saving user',data);
    await postData('/api/updateUser',data);
    
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }  
  
  async function getOrder(orderId){
    
    await sleep(200);
    let allOrders = await fetch('/api/getOrders').then(res=>res.json())
    let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
    if(!currOrder){
      console.log('Invalid OrderID');
      return;
    }

    return currOrder;
  }

  
 
  function triggerOrderNow(){

  }

  function importOpenOrders(){}

  function sellOrder(row){

  }

  function deleteOrder(row,test){

  }

  return{
    closePrice,
    pendingOrders,
    closedOrders,
    orders,
    save,
    importOpenOrders,
    // updateOrder,
    startAutoTrade,
    stopAutoTrade,
    // refreshPendingOrders,
    deleteOrder,
    triggerOrderNow,
    sellOrder
  }
}