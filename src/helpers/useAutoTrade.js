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
      averagePrice : currOrder.average_price,
      quantity : currOrder.quantity,
      status:currOrder.status||'COMPLETE',
      transactionType:currOrder.transaction_type,
      buyPrice:currOrder.price||currOrder.average_price,
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }   

  async function getOrder(orderId){
    await sleep(2000);
    let allOrders = await fetch('/api/getOrders').then(res=>res.json())
    let currOrder = allOrders.filter(item=>orderId == item.order_id)[0];
    if(!currOrder){
      console.log('Invalid OrderID');
      return;
    }

    return currOrder;
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

    let currKiteOrder = await getOrder(orderId);
    if(!currKiteOrder){
      console.log('order failed....');
      return;
    }

    return getMappedOrder(currKiteOrder);
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

  React.useEffect(()=>{

    async function run(){
      let quote = history[history.length-1];
      if(!quote){
        return;
      }
      console.log(quote.signal,quote)
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
                buyOrder.status = 'AUTOBUY_COMPLETE'
                buyOrder.buyPrice = buyOrder.averagePrice;
                orders.push(buyOrder);
              }else{
                buyOrder.status = 'AUTOBUY_PENDING'
                buyOrder.buyPrice = closePrice;
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
                orders = orders.filter(item => item.orderId != openOrder.orderId);
                if(sellOrder.status == 'COMPLETE'){
                  let soldOrder = createClosedOrder(openOrder,sellOrder)
                  soldOrder.status = 'AUTOSELL_COMPLETE'
                  closedOrders.unshift(soldOrder);
                }else{
                  sellOrder.buyPrice = openOrder.averagePrice;
                  sellOrder.status = 'AUTOSELL_PENDING'
                  pendingOrders.push(sellOrder)
                }
              }
            }else{
              console.log('Sell order blocked, minChange',minChange,'Curr Change',currChange);
            }
          }
        }
      }

      let enabledStoploss = config.enabledStoploss;
      let stoploss = config.stoploss;
      if(enabledStoploss){
        for(let openOrder of state.orders){
          let maxLoss = stoploss * openOrder.averagePrice/100;
          let currChange = openOrder.averagePrice - closePrice;

          if(currChange > maxLoss){
            console.log('Stoploss hit..., currChange',currChange, 'maxLoss',maxLoss);
            let sellOrder = await createOrder({
              transactionType:"SELL",
              quantity:0
            });
            if(sellOrder){
              hasOrdersUpdated = true;
              orders = orders.filter(item => item.orderId != openOrder.orderId);
              if(sellOrder.status == 'COMPLETE'){
                let soldOrder = createClosedOrder(openOrder,sellOrder)
                soldOrder.status = 'AUTOSELL_COMPLETE'
                closedOrders.unshift(soldOrder);
              }else{
                sellOrder.buyPrice = openOrder.averagePrice;
                sellOrder.status = 'AUTOSELL_PENDING'
                pendingOrders.push(sellOrder)
              }
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
    }
    run()
    

  },[history.length]);

  const save=(async ({
    newConfig,
    orders,
    pendingOrders,
    closedOrders
  }={})=>{
    
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
    
  })

  const deleteOrder = (async(order,type)=>{
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
  })

  async function updateOrder(order){
    let pendingOrders = [...state.pendingOrders];
    let res = await postData('/api/modifyOrder',{
      variety:"regular",
      orderId:order.orderId,
      params:{
        price:closePrice
      }
    });

    if(!res.error){
      for(let item of pendingOrders){
        if(order.orderId == item.orderId){
          order.price = closePrice
          order.buyPrice = closePrice
          break;
        }
      }

      setState({
        ...state,
        pendingOrders
      })

    }else{
      alert(res.error.message);
      console.error(res);
      return;
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
        let soldOrder = createClosedOrder(order,sellOrder)
        soldOrder.status = 'SELL_COMPLETE'
        closedOrders.unshift(soldOrder);
      }else{
        sellOrder.status = 'SELL_PENDING'
        sellOrder.buyPrice = order.averagePrice;
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
      let currKiteOrder = allOrders[pendingOrder.orderId];
      if(!currKiteOrder){
        console.error('Pending order doesnot exits on All Orders', pendingOrder,allOrders);
        continue;
      }

      if(currKiteOrder.status == 'COMPLETE'){ 
        pendingOrders = pendingOrders.filter(item => item.orderId != pendingOrder.orderId);
        if(pendingOrder.transactionType == 'BUY'){
          let buyOrder = getMappedOrder(currKiteOrder)
          buyOrder.status = "BUY_COMPLETE"
          orders.push(buyOrder);
        }else if(pendingOrder.transactionType == 'SELL'){
          
          let closedOrder = getMappedOrder(currKiteOrder);
          closedOrder.buyPrice = pendingOrder.buyPrice;
          closedOrder.sellPrice = closedOrder.averagePrice;
          
          closedOrder.profit = (closedOrder.sellPrice - closedOrder.buyPrice)*closedOrder.quantity;
          closedOrder.profitPct = (closedOrder.sellPrice - closedOrder.buyPrice)/closedOrder.buyPrice * 100;
          closedOrder.status = 'SELL_COMPLETE'
          closedOrders.unshift(closedOrder);
        }else{
          console.error("invalid transaction type",currKiteOrder)
        }
      }
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
  
  async function importOpenOrders(){
    let positions = await fetch('/api/positions').then(res=>res.json());
    let openOrder = positions.positions.net.filter(order=>{
      return order.tradingsymbol==config.tradingsymbol && order.quantity>0
    })[0];

    let orders = [...state.orders];

    let positionOrder =  orders.filter(item=>!item.order_id);
    if(positionOrder && openOrder){
      orders = orders.filter(item=>item.order_id);
      orders.push(getMappedOrder(openOrder));
    } else if(openOrder){
      
      orders.push(getMappedOrder(openOrder));
      
    }

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
        buyOrder.status = 'BUY_COMPLETE'
        orders.push(buyOrder);
      }else{
        buyOrder.status = 'BUY_PENDING'
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