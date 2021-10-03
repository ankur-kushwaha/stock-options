import React from 'react'
import postData from '.';
import useZerodha from './useZerodha';
import getTicks from './getTicks';
import Order, { getMappedOrder, OrderStatus } from './Order';

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

  let savedOrders = (userProfile.orders?.filter(item=>item.tradingsymbol == config.tradingsymbol)||[]).map(item=>new Order({
    tradingsymbol:config.tradingsymbol
  }).load(item))

  let [state,setState] = React.useState({
    orders: savedOrders,
    closedOrders: userProfile.closedOrders?.filter(item=>item.tradingsymbol == config.tradingsymbol)||[],
    closePrice:0,
    signal:undefined,
    intervalId:undefined,
    pendingOrders:userProfile.pendingOrders?.filter(item=>item.tradingsymbol == config.tradingsymbol)||[],
  });
  
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

  React.useEffect(()=>{
    save({
      orders:state.orders
    })
  },[state.orders])


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
      let hasUpdated = false;
      if(state.signal && state.signal != signal){
      
        if(signal == 'GREEN'){
          log("Green candle",quote);
          if(orders.length < config.maxOrder){
            log("Creating open position");
            hasUpdated = true;
          
            let order = new Order({
              tradingsymbol:config.tradingsymbol
            });

            let isSuccess = await order.openPosition({
              transactionType:"SELL",
              price:closePrice,
              quantity:config.quantity
            });
            
            if(isSuccess){
              orders.push(order)
            }

          }else{
            log("Orders full");
          }
        }

        else if(signal == 'RED'){
          log("Red candle",quote);
          let openOrders = orders.filter(item=>item.status == OrderStatus.POSITION_OPEN);
          console.log('Open orders',openOrders);
          for(let order of openOrders){
            log('trying closing order',order);
            hasUpdated = true;
            await order.tryClosePosition({
              price:closePrice
            });
          }
        }
      }

      setState({
        ...state,
        signal,
        orders:hasUpdated?orders:state.orders
      })
    }
    buySell()

  },[history.length]);

  React.useEffect(()=>{

    async function refreshPendingOrders(){
      let response  = await fetch('/api/getOrders').then(res=>res.json())
      let allOrders = response.reduce((a,b)=>{
        a[b.order_id] = b;
        return a;
      },{})

      let orders = [...state.orders];
      let hasUpdated = false;
      for(let pendingOrder of orders){
        let updatedPendingOrder = allOrders[pendingOrder.sellOrder.orderId];

        if(updatedPendingOrder.status == 'COMPLETE'){
          hasUpdated = true;
          if(pendingOrder.status = OrderStatus.POSITION_OPEN_PENDING){
            pendingOrder.status = OrderStatus.POSITION_OPEN;
          }else if(pendingOrder.status = OrderStatus.POSITION_CLOSE_PENDING){
            pendingOrder.status = OrderStatus.CLOSED;
          }
        }
      }
      if(hasUpdated){
        setState({
          ...state,
          orders
        })
      }

      
    }

    let pendingOrders = state.orders.filter(item=>item.status && item.status.indexOf('PENDING')>=0);
    if(pendingOrders.length>0){
      refreshPendingOrders();
    }
  },[history.length])

 
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

  
 
  async function triggerOrderNow(){
    let transactionType = 'SELL';
    let orders = [...state.orders]
    if(transactionType == 'SELL'){
      let order = new Order({
        tradingsymbol:config.tradingsymbol
      })
      let isSuccess = await order.openPosition({
        transactionType:"SELL",
        price:closePrice,
        quantity:config.quantity
      })
      
      if(isSuccess){
        orders.push(order);
      }
    }

    setState({
      ...state,
      orders
    })

  }

  async function importOpenOrders(){
    let positions = await fetch('/api/positions').then(res=>res.json());
    let openOrder = positions.positions.net.filter(order=>{
      return order.tradingsymbol==config.tradingsymbol && order.quantity>0
    })[0];

    

    let orders = [...state.orders];

    
    let order = new Order({
      tradingsymbol:config.tradingsymbol
    });
    order.mapOrder(openOrder);
    orders.push(order);

    setState({
      ...state,
      orders
    })

  }

  async function closePosition(row){
    let orders = [...state.orders];
    let order:Order = orders.find(item=>{
      return row.buyOrder?.orderId == item.buyOrder?.orderId || row.sellOrder?.orderId == item.sellOrder?.orderId
    })

    await order.closePosition({
      price:closePrice
    })

    setState({
      ...state,
      orders
    })

  }

  function deleteOrder(row){
    let orders = [...state.orders];

    orders = orders.filter(item=>{
      if(row.buyOrder){
        return row.buyOrder?.orderId != item.buyOrder?.orderId
      }else{
        return row.sellOrder?.orderId != item.sellOrder?.orderId
      }
    })
  
    setState({
      ...state,
      orders
    })
  }

  async function updatePosition(order){

    let orders = [...state.orders];
    order =  orders.find(item=>item.sellOrder.orderId == order.sellOrder.orderId);

    let res = await postData('/api/modifyOrder',{
      variety:"regular",
      orderId:order.sellOrder.orderId,
      params:{
        price:closePrice
      }
    });

    if(!res.error){
      order.sellOrder.price = closePrice;

      setState({
        ...state,
        orders
      })
    }else{
      alert(res.error.message)
    }

  }

  return{
    closePrice,
    orders:state.orders,
    save,
    importOpenOrders,
    updatePosition,
    startAutoTrade,
    stopAutoTrade,
    // refreshPendingOrders,
    deleteOrder,
    triggerOrderNow,
    closePosition
  }
}