import React from 'react'
import postData from '.';
import useZerodha from './useZerodha';
import getTicks from './getTicks';
import { getMockHistory } from './useZerodha'

type Tick = {
  closePrice: number,
  rawTick?: {
    depth: {
      buy: [{
        price: number
      }],
      sell: [{
        price: number
      }]
    }

  }
}

async function getHistory(targetTradingsymbol, { interval, exchange }: { interval?: string, exchange?: string } = {}) {
  let dev = true;
  if (dev) {
    return await getMockHistory();
  } else {
    return await fetch(`/api/getDayHistory-v2?exchange=${exchange}&instruments=${targetTradingsymbol}&interval=${interval || 'ONE_MINUTE'}`)
      .then(res => res.json())
  }
}

export function useAutoTrade2({
  exchange,
  tradingsymbol,
  interval
}, {
  buy,
  sell
}) {

  let intervalId = React.useRef(null),
    signal = React.useRef(null),
    history = React.useRef(null);

  async function fetchHistory() {
    let res = await getHistory(tradingsymbol, {
      interval,
      exchange
    });

    if (res.history.length > history.current?.length) {
      console.log('History updated')
      return res.history[res.history.length - 1];
    }
    console.log('Same history')
    history.current = res.history;
    return null;
  }

  async function startTrading() {
    let quote = await fetchHistory();

    if (!quote) {
      return;
    }

    console.log(quote)

    if (signal.current && signal.current != quote.signal) {
      if (quote.signal == 'GREEN') {
        buy({
          tick: quote
        });
      }

      else if (quote.signal == 'RED') {
        sell({
          tick: quote
        });
      }
    }
    signal.current = quote.signal
  }

  function start() {
    let id = setInterval(startTrading, 5000);
    intervalId.current = id;
  }

  function stop() {
    clearInterval(intervalId.current)
  }

  return {
    start,
    stop
  }
}

export default function useAutoTrade(config, userProfile) {
  //   config.shouldRun = true;
  let [state, setState] = React.useState({
    orders: userProfile.orders?.filter(item => item.tradingsymbol == config.tradingsymbol),
    closedOrders: userProfile.closedOrders?.filter(item => item.tradingsymbol == config.tradingsymbol) || [],
    pendingOrders: userProfile.pendingOrders?.filter(item => item.tradingsymbol == config.tradingsymbol) || [],
    closePrice: 200,
    signal: null,
    intervalId: null
  });
  let { pendingOrders, orders, closedOrders } = state;
  let { createOrder, getHistory } = useZerodha();
  let [history, setHistory] = React.useState([])
  let [tick, setTick] = React.useState<Tick>({
    closePrice: null,
    rawTick: null
  });
  const { closePrice, rawTick } = tick;


  async function fetchHistory() {
    let stock = config.useStockPrice ? config.stock : config.tradingsymbol;

    let res = await getHistory(stock, {
      interval: config.interval,
      exchange: config.useStockPrice ? 'NSE' : "NFO"
    });
    setHistory(res.history);
  }

  function startAutoTrade() {
    console.log('starting autotrade...')
    let intervalId = setInterval(fetchHistory, 30000);
    fetchHistory();
    setState({
      ...state,
      intervalId
    })
  }

  function stopAutoTrade() {
    console.log('stoping autotrade...')
    let { intervalId } = state;
    clearInterval(intervalId)
  }

  function getMappedOrder(currOrder) {
    return {
      orderId: currOrder.order_id,
      timestamp: currOrder.order_timestamp,
      tradingsymbol: currOrder.tradingsymbol,
      price: currOrder.price,
      averagePrice: currOrder.average_price,
      quantity: currOrder.quantity,
      status: currOrder.status || 'COMPLETE',
      transactionType: currOrder.transaction_type,
      buyPrice: currOrder.price || currOrder.average_price,
      sellPrice: null,
      profit: null,
      profitPct: null
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function getOrder(orderId) {
    await sleep(2000);
    let allOrders = await fetch('/api/getOrders').then(res => res.json())
    let currOrder = allOrders.filter(item => orderId == item.order_id)[0];
    if (!currOrder) {
      console.log('Invalid OrderID');
      return;
    }

    return currOrder;
  }

  async function smartOrder({
    order
  }) {
    let currKiteOrder;

    let newPrice = order.price;
    if (order.price < rawTick.depth.buy[0].price) {
      newPrice = rawTick.depth.buy[0].price + 0.5;
      let res = await postData('/api/modifyOrder', {
        variety: "regular",
        orderId: order.orderId,
        params: {
          price: newPrice
        }
      });
    }

    currKiteOrder = await getOrder(order.orderId);

    if (currKiteOrder.status == 'COMPLETE') {
      return getMappedOrder(currKiteOrder)
    } else if (!['REJECTED', 'CANCELLED'].includes(currKiteOrder.status)) {
      await sleep(1000);
      return smartOrder(currKiteOrder)
    } else {
      console.log('Order', currKiteOrder)
      throw new Error('Order failed');
    }

  }
  async function createTradeOrder({
    transactionType,
    quantity,
    smartMode
  }: {
    transactionType: string,
    quantity?: number,
    smartMode?: boolean
  }) {

    if (transactionType == 'BUY') {
      console.log('buying stock...')
    } else {
      console.log('selling stock...')
    }

    let orderId = await createOrder({
      transactionType,
      tradingsymbol: config.tradingsymbol,
      quantity: quantity || config.quantity,
      price: config.marketOrder ? 'MARKET' : closePrice,
      exchange: "NFO"
    });

    if (!orderId) {
      console.log('order failed....');
      return;
    }


    let currKiteOrder = await getOrder(orderId);

    if (!currKiteOrder) {
      console.log('order failed....');
      return;
    }

    let mappedOrder = getMappedOrder(currKiteOrder);
    if (smartMode) {
      return (await smartOrder({ order: mappedOrder }))
    }

    return mappedOrder
  }

  React.useEffect(() => {
    if (config.instrumentToken) {
      getTicks([config.instrumentToken], (ticks) => {
        let tick = ticks[config.instrumentToken];

        let closePrice = (tick.depth.buy[0].price + tick.depth.sell[0].price) / 2 || tick.last_price;
        // console.log('closePrice',closePrice);
        setTick({
          rawTick: tick,
          closePrice: Number(closePrice.toFixed(1))
        });
      });
    }

  }, [config.instrumentToken])

  React.useEffect(() => {

    async function run() {
      let quote = history[history.length - 1];
      if (!quote) {
        return;
      }
      console.log(quote.signal, quote)
      let signal = quote.signal;
      let orders = [...state.orders], pendingOrders = [...state.pendingOrders], closedOrders = [...state.closedOrders];

      let hasOrdersUpdated = false;
      if (state.signal && state.signal != signal) {
        if (signal == 'GREEN') {

          if ((orders.length + pendingOrders.length) < config.maxOrder) {
            let buyOrder = await createTradeOrder({
              transactionType: "BUY"
            });
            if (buyOrder) {
              hasOrdersUpdated = true;
              if (buyOrder.status == 'COMPLETE') {
                buyOrder.status = 'AUTOBUY_COMPLETE'
                buyOrder.buyPrice = buyOrder.averagePrice;
                orders.push(buyOrder);
              } else {
                buyOrder.status = 'AUTOBUY_PENDING'
                buyOrder.buyPrice = closePrice;
                pendingOrders.push(buyOrder);
              }
            }
          } else {
            console.log('Buy order limit exceeded, Limit ', config.maxOrder);
          }
        }

        else if (signal == 'RED') {

          for (let openOrder of state.orders) {
            let minChange = config.minTarget * openOrder.averagePrice / 100;
            let currChange = closePrice - openOrder.averagePrice;

            if (currChange > minChange) {
              let sellOrder = await createTradeOrder({
                transactionType: "SELL",
                quantity: 0
              });
              if (sellOrder) {
                hasOrdersUpdated = true;
                orders = orders.filter(item => item.orderId != openOrder.orderId);
                if (sellOrder.status == 'COMPLETE') {
                  let soldOrder = createClosedOrder(openOrder, sellOrder)
                  soldOrder.status = 'AUTOSELL_COMPLETE'
                  closedOrders.unshift(soldOrder);
                } else {
                  sellOrder.buyPrice = openOrder.averagePrice;
                  sellOrder.status = 'AUTOSELL_PENDING'
                  pendingOrders.push(sellOrder)
                }
              }
            } else {
              console.log('Sell order blocked, minChange', minChange, 'Curr Change', currChange);
            }
          }
        }
      }

      let enabledStoploss = config.enabledStoploss;
      let stoploss = config.stoploss;
      if (enabledStoploss) {
        for (let openOrder of state.orders) {
          let maxLoss = stoploss * openOrder.averagePrice / 100;
          let currChange = openOrder.averagePrice - closePrice;

          if (currChange > maxLoss) {
            console.log('Stoploss hit..., currChange', currChange, 'maxLoss', maxLoss);
            let sellOrder = await createTradeOrder({
              transactionType: "SELL",
              quantity: 0
            });
            if (sellOrder) {
              hasOrdersUpdated = true;
              orders = orders.filter(item => item.orderId != openOrder.orderId);
              if (sellOrder.status == 'COMPLETE') {
                let soldOrder = createClosedOrder(openOrder, sellOrder)
                soldOrder.status = 'AUTOSELL_COMPLETE'
                closedOrders.unshift(soldOrder);
              } else {
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

      console.log("orders", orders,
        pendingOrders,
        closedOrders)

      if (hasOrdersUpdated) {
        await save({
          orders,
          pendingOrders,
          closedOrders
        })
      }
    }
    run()


  }, [history.length]);

  const save = (async ({
    newConfig,
    orders,
    pendingOrders,
    closedOrders
  }: {
    newConfig?: any,
    orders?: any,
    pendingOrders?: any,
    closedOrders?: any
  } = {}) => {

    let data = {
      userId: userProfile.user_id,
      tradingsymbol: config.tradingsymbol,
      session: {
        configs: newConfig || config,
        orders: orders || state.orders,
        pendingOrders: pendingOrders || state.pendingOrders,
        closedOrders: closedOrders || state.closedOrders
      }
    };

    console.log('Saving user', data);
    await postData('/api/updateUser', data);

  })

  const deleteOrder = (async (order, type) => {
    console.log('deleting order', order, type)
    let orders = [...state[type]];

    if (order.orderId) {
      orders = orders.filter(item => item.orderId != order.orderId);
    } else {
      orders = orders.filter(item => item.orderId);
    }

    setState({
      ...state,
      [type]: orders
    })

    await save({
      [type]: orders
    })
  })

  async function updateOrder(order) {
    let pendingOrders = [...state.pendingOrders];
    let res = await postData('/api/modifyOrder', {
      variety: "regular",
      orderId: order.orderId,
      params: {
        price: closePrice
      }
    });

    if (!res.error) {
      for (let item of pendingOrders) {
        if (order.orderId == item.orderId) {
          order.price = closePrice
          order.buyPrice = closePrice
          break;
        }
      }

      setState({
        ...state,
        pendingOrders
      })

    } else {
      alert(res.error.message);
      console.error(res);
      return;
    }
  }

  function createClosedOrder(buyOrder, closeOrder) {
    buyOrder.buyPrice = buyOrder.averagePrice;
    buyOrder.sellPrice = closeOrder.averagePrice;
    buyOrder.profit = (buyOrder.sellPrice - buyOrder.averagePrice) * buyOrder.quantity;
    buyOrder.profitPct = (buyOrder.sellPrice - buyOrder.averagePrice) / buyOrder.buyPrice * 100;
    return buyOrder;
  }

  async function sellOrder(order) {
    let orders = [...state.orders];
    let closedOrders = [...state.closedOrders];

    let sellOrder = await createTradeOrder({
      transactionType: "SELL",
      quantity: order.quantity
    });
    if (sellOrder) {
      orders = orders.filter(item => item.orderId != order.orderId);
      if (sellOrder.status == 'COMPLETE') {
        let soldOrder = createClosedOrder(order, sellOrder)
        soldOrder.status = 'SELL_COMPLETE'
        closedOrders.unshift(soldOrder);
      } else {
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

  async function refreshPendingOrders() {
    let pendingOrders = [...state.pendingOrders];
    let orders = [...state.orders];
    let closedOrders = [...state.closedOrders];

    let response = await fetch('/api/getOrders').then(res => res.json())
    let allOrders = response.reduce((a, b) => {
      a[b.order_id] = b;
      return a;
    }, {})

    for (let pendingOrder of state.pendingOrders) {
      let currKiteOrder = allOrders[pendingOrder.orderId];
      if (!currKiteOrder) {
        console.error('Pending order doesnot exits on All Orders', pendingOrder, allOrders);
        continue;
      }

      if (currKiteOrder.status == 'COMPLETE') {
        pendingOrders = pendingOrders.filter(item => item.orderId != pendingOrder.orderId);
        if (pendingOrder.transactionType == 'BUY') {
          let buyOrder = getMappedOrder(currKiteOrder)
          buyOrder.status = "BUY_COMPLETE"
          orders.push(buyOrder);
        } else if (pendingOrder.transactionType == 'SELL') {

          let closedOrder = getMappedOrder(currKiteOrder);
          closedOrder.buyPrice = pendingOrder.buyPrice;
          closedOrder.sellPrice = closedOrder.averagePrice;

          closedOrder.profit = (closedOrder.sellPrice - closedOrder.buyPrice) * closedOrder.quantity;
          closedOrder.profitPct = (closedOrder.sellPrice - closedOrder.buyPrice) / closedOrder.buyPrice * 100;
          closedOrder.status = 'SELL_COMPLETE'
          closedOrders.unshift(closedOrder);
        } else {
          console.error("invalid transaction type", currKiteOrder)
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

  async function importOpenOrders() {
    let positions = await fetch('/api/positions').then(res => res.json());
    let openOrder = positions.positions.net.filter(order => {
      return order.tradingsymbol == config.tradingsymbol && order.quantity > 0
    })[0];

    let orders = [...state.orders];

    let positionOrder = orders.filter(item => !item.order_id);
    if (positionOrder && openOrder) {
      orders = orders.filter(item => item.order_id);
      orders.push(getMappedOrder(openOrder));
    } else if (openOrder) {

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

  async function triggerOrderNow() {

    let orders = [...state.orders];
    let pendingOrders = [...state.pendingOrders]
    let buyOrder = await createTradeOrder({
      transactionType: "BUY",
      smartMode: true
    });
    if (buyOrder) {

      if (buyOrder.status == 'COMPLETE') {
        buyOrder.status = 'BUY_COMPLETE'
        orders.push(buyOrder);
      } else {
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

  return {
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