import React from 'react'
import postData from '.';
import useZerodha from '../helpers/useZerodha';
import getTicks from '../helpers/getTicks';

export default function useAutoTrade(config,userProfile){
//   config.shouldRun = true;
  let [state,setState] = React.useState({
    orders: userProfile.orders?.filter(item=>item.tradingsymbol == config.tradingsymbol),
    closedOrders: userProfile.closedOrders?.filter(item=>item.tradingsymbol == config.tradingsymbol)||[],
    closePrice:0,
    pendingOrders:userProfile.pendingOrders?.filter(item=>item.tradingsymbol == config.tradingsymbol)||[],
    closePrice:200
  });
  let {pendingOrders,orders,closedOrders} = state;
  let {createOrder2,getHistory} = useZerodha();
  let [history,setHistory] = React.useState([])
  let [closePrice,setClosePrice] = React.useState(0);

  
  async function fetchHistory(){

    let res = await getHistory(config.tradingsymbol,{
      interval:config.interval
    });
    setHistory(res.history);
  }

  function startAutoTrade(){
    console.log('starting autotrade...')
    let intervalId = setInterval(fetchHistory,30000);
    fetchHistory();
    setState({
      ...state,
      intervalId
    })
  }

  function stopAutoTrade(){
    console.log('stoping autotrade...')
    let {intervalId}  = state;
    clearInterval(intervalId)
  }

  function getMappedOrder(currOrder){
    return {
      orderId:currOrder.order_id,
      timestamp:currOrder.order_timestamp,
      tradingsymbol:currOrder.tradingsymbol,
      price:currOrder.price,
      buyPrice:currOrder.average_price,
      profit: (closePrice - currOrder.average_price) * currOrder.quantity,
      profitPct: (closePrice - currOrder.average_price)/currOrder.average_price*100,
      averagePrice : currOrder.average_price,
      quantity : currOrder.quantity,
      status:currOrder.status,
      transactionType:currOrder.transaction_type
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }   

  async function getOrder(orderId){
    await sleep(1000);
    let allOrders = await fetch('/api/getOrders').then(res=>res.json())
    let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
    if(!currOrder){
      console.log('Invalid OrderID');
      return;
    }

    return getMappedOrder(currOrder);
  }

  async function createOrder({
    transactionType,
    quantity
  }){

    if(transactionType == 'BUY'){
      console.log('buying stock...')
    }else{
      console.log('selling stock...')
    }


    let orderId = await createOrder2({
      transactionType,
      tradingsymbol:config.tradingsymbol,
      quantity:quantity||config.quantity,
      price: config.marketOrder?'MARKET':closePrice
    });

    if(!orderId){
      console.log('order failed....');
      return ;
    }

    let buyOrder = await getOrder(orderId);
    if(!buyOrder){
      console.log('order failed....');
      return;
    }

    // buyOrder.status = 'COMPLETE'

    return buyOrder;
  }

  React.useEffect(()=>{
    if(config.instrumentToken){
      getTicks([config.instrumentToken],(ticks)=>{
        let tick =ticks[config.instrumentToken];

        let closePrice = (tick.depth.buy[0].price+tick.depth.sell[0].price)/2 || tick.last_price;
        // console.log('closePrice',closePrice);
        setClosePrice(Number(closePrice.toFixed(1)));
      });
    }
    
  },[config.instrumentToken])

  React.useEffect(async ()=>{
    let quote = history[history.length-1];
    if(!quote){
      return;
    }
    console.log(quote)
    let signal = quote.signal;
    let orders = [...state.orders],pendingOrders=[...state.pendingOrders],closedOrders=[...state.closedOrders];

    let hasOrdersUpdated = false;
    if(state.signal && state.signal != signal){
      if(signal == 'GREEN'){

        if((orders.length + pendingOrders.length) < config.maxOrder){
          let buyOrder = await createOrder({
            transactionType:"BUY"
          });
          if(buyOrder){
            hasOrdersUpdated = true;
            if(buyOrder.status == 'COMPLETE'){
              orders.push(buyOrder);
            }else{
              pendingOrders.push(buyOrder);
            }
          }
        }else{
          console.log('Buy order limit exceeded, Limit ', config.maxOrder);
        }
      }

      else if(signal == 'RED'){

        for(let openOrder of state.orders){
          let minChange = config.minTarget * openOrder.averagePrice/100;
          let currChange = closePrice - openOrder.averagePrice;

          if(currChange > minChange){
            let sellOrder = await createOrder({
              transactionType:"SELL",
              quantity:0
            });
            if(sellOrder){
              hasOrdersUpdated = true;
              if(sellOrder.status == 'COMPLETE'){
                closedOrders.push(createClosedOrder(openOrder,sellOrder));
                orders = orders.filter(item => item.orderId != openOrder.orderId);
              }else{
                pendingOrders.push(sellOrder)
              }
            }
          }else{
            console.log('Sell order blocked, minChange',minChange,'Curr Change',currChange);
          }
        }
      }
    }

    setState({
      ...state,
      signal,
      orders,
      pendingOrders,
      closedOrders
    })

    console.log("orders",orders,
      pendingOrders,
      closedOrders)

    if(hasOrdersUpdated){
      await save({
        orders,
        pendingOrders,
        closedOrders
      })
    }

    

  },[history.length]);

  async function save({
    newConfig,
    orders,
    pendingOrders,
    closedOrders
  }={}){
    
    let data = {
      userId:userProfile.user_id,
      tradingsymbol:config.tradingsymbol,
      session:{
        configs:newConfig||config,
        orders:orders||state.orders,
        pendingOrders:pendingOrders||state.pendingOrders,
        closedOrders:closedOrders||state.closedOrders
      }
    };

    console.log('Saving user',data);
    await postData('/api/updateUser',data);
    
  }

  async function deleteOrder(order,type){
    console.log('deleting order', order,type)
    let orders = [...state[type]];
    
    if(order.orderId){
      orders = orders.filter(item=> item.orderId != order.orderId);
    }else{
      orders = orders.filter(item=> item.orderId);
    }

    console.log(orders);

    setState({
      ...state,
      [type]:orders
    })

    await save({
      [type]:orders
    })
  }

  async function updateOrder(order,type){
    order.price = closePrice;
    let pendingOrders = [...state.pendingOrders];
    let res = await postData('/api/modifyOrder',{
      variety:"regular",
      orderId:order.orderId,
      params:{
        price:closePrice
      }
    });

    let currOrder;

    if(!res.error){
      for(let item of pendingOrders){
        if(order.orderId == item.orderId){
          order.price = currOrder.price;
          break;
        }
      }

      setState({
        ...state,
        pendingOrders
      })

    }else{
      console.log(res);
    }
  }

  function createClosedOrder(buyOrder,closeOrder){
    buyOrder.buyPrice = buyOrder.averagePrice;
    buyOrder.sellPrice = closeOrder.averagePrice;
    buyOrder.profit = (buyOrder.sellPrice - buyOrder.averagePrice)*buyOrder.quantity;
    buyOrder.profitPct = (buyOrder.sellPrice - buyOrder.averagePrice)/buyOrder.buyPrice*100;
    return buyOrder;
  }

  async function sellOrder(order){
    let orders = [...state.orders];
    let closedOrders = [...state.closedOrders];

    let sellOrder = await createOrder({
      transactionType:"SELL",
      quantity:order.quantity
    });
    if(sellOrder){
      orders = orders.filter(item => item.orderId != order.orderId);
      if(sellOrder.status == 'COMPLETE'){
        closedOrders.push(createClosedOrder(order,sellOrder));
      }else{
        pendingOrders.push(sellOrder)
      }
      setState({
        ...state,
        orders,
        closedOrders,
        pendingOrders
      })
      await save({
        orders,
        closedOrders,
        pendingOrders
      })
    }
  }

  async  function refreshPendingOrders(){
    let pendingOrders = [...state.pendingOrders];
    let orders = [...state.orders];
    let closedOrders = [...state.closedOrders];

    let response  = await fetch('/api/getOrders').then(res=>res.json())
    let allOrders = response.reduce((a,b)=>{
      a[b.order_id] = b;
      return a;
    },{})

    for(let pendingOrder of state.pendingOrders){
      let currOrder = allOrders[pendingOrder.orderId];

      if(currOrder.status == 'COMPLETE'){
        pendingOrders = pendingOrders.filter(item => item.orderId != currOrder.orderId);
        if(currOrder.transaction_type == 'BUY'){
          orders.push(pendingOrder);
        }else if(currOrder.transaction_type == 'SELL'){
          closedOrders.push(pendingOrder);
        }else{
          console.error("invalid transaction type",currOrder)
        }
      }
    }

    setState({
      ...state,
      orders,
      closedOrders,
      pendingOrders
    })
  }
  
  async function importOpenOrders(){
    let positions = await fetch('/api/positions').then(res=>res.json());
    let openOrder = positions.positions.net.filter(order=>{
      return order.tradingsymbol==config.tradingsymbol && order.quantity>0
    })[0];

    let orders = [...state.orders];
    orders.push(getMappedOrder(openOrder));

    setState({
      ...state,
      orders
    })

    await save({
      orders
    });
  }

  async function triggerOrderNow(){

    let orders = [...state.orders];
    let pendingOrders = [...state.pendingOrders]
    let buyOrder = await createOrder({
      transactionType:"BUY"
    });
    if(buyOrder){
      
      if(buyOrder.status == 'COMPLETE'){
        orders.push(buyOrder);
      }else{
        pendingOrders.push(buyOrder);
      }
    }
    

    setState({
      ...state,
      orders,
      pendingOrders
    })

    await save({
      orders,
      pendingOrders
    })
  }

  return{
    closePrice,
    pendingOrders,
    closedOrders,
    orders,
    save,
    importOpenOrders,
    updateOrder,
    startAutoTrade,
    stopAutoTrade,
    refreshPendingOrders,
    deleteOrder,
    triggerOrderNow,
    sellOrder
  }
}