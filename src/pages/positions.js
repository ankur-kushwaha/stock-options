import React from 'react'
import Header from '../components/Header';
import Table, { Column } from '../components/Table';
import useZerodha from '../helpers/useZerodha';
import { getKiteClient } from '../helpers/kiteConnect';
import currencyFormatter from 'currency-formatter';
import getTicks from '../helpers/getTicks';
import Price from '../components/Price';
import Head from 'next/head'


export default function holdings({
  userProfile,
  positions,
  quotes }) {

  let [tickerQuotes, setTickerQuotes] = React.useState(quotes);

  React.useEffect(() => {
    console.log("positions", positions);
    let quotesInstruments = Object.values(quotes).map(item => item.instrument_token);

    getTicks(quotesInstruments, (ticks) => {
      setTickerQuotes(ticks);
    });
  }, [])

  const { createOrder } = useZerodha();

  // console.log('quotes',quotes);
  // console.log('tickerquotes',tickerQuotes);
  // console.log('positions',positions);

  let totalProfit = 0,
    netExpiryPnl = 0;

  let data = positions
    .map(item => {
      let { stockCode, strike } = getStockCode(item.tradingsymbol);
      let stockInstrumentToken = quotes[`NSE:${stockCode}`]?.instrument_token;

      let stockQuote = tickerQuotes[stockInstrumentToken] || tickerQuotes[`NSE:${stockCode}`];
      let optionTicker = tickerQuotes[item.instrument_token]

      return {
        ...item,
        strike,
        bidPrice: optionTicker?.depth.buy[0].price,
        offerPrice: optionTicker?.depth.sell[0].price,
        price: item.average_price,
        stockCode,
        buyValue: item?.average_price * item.quantity,
        stockPriceChg: stockQuote?.change,
        stockPrice: stockQuote?.last_price,
      }
    }).map(item => {
      let breakeven, breakevenChg, pnl, expiryPnL, strikeDiff
      if (item.tradingsymbol.endsWith("CE")) {
        breakeven = item.strike + item.average_price;
        if (item.quantity > 0) {
          // CALL BUY
          pnl = (item.bidPrice - item.price) * item.quantity;
          breakevenChg = (item.stockPrice - breakeven) / item.stockPrice * 100
          expiryPnL = item.quantity * Math.max(-item.price, item.stockPrice - item.strike - item.price)
        } else {
          // CALL SELL
          breakevenChg = (breakeven - item.stockPrice) / item.stockPrice * 100
          pnl = (item.price - item.offerPrice) * item.quantity * -1;
          expiryPnL = item.quantity * (Math.max(item.price, item.strike - item.strike + item.price)) * -1
        }
      } else {
        breakeven = item.strike - item.price;
        if (item.quantity > 0) {
          //PUT BUY
          breakevenChg = (breakeven - item.stockPrice) / item.stockPrice * 100
          pnl = item.quantity * (item.bidPrice - item.price);
          expiryPnL = item.quantity * (Math.max(-item.price, (item.strike - item.stockPrice - item.price)))
          strikeDiff = (item.strike - item.stockPrice) / item.strike * 100
        } else {
          //PUT SELL
          breakevenChg = (item.stockPrice - breakeven) / item.stockPrice * 100
          pnl = item.quantity * (item.price - item.offerPrice) * -1;
          expiryPnL = item.quantity * (Math.min(item.price, item.stockPrice - item.strike + item.price)) * -1
          strikeDiff = (item.stockPrice - item.strike) / item.strike * 100
        }
      }

      netExpiryPnl += expiryPnL;
      totalProfit += pnl

      return {
        ...item,
        breakeven,
        expiryPnL,
        breakevenChg,
        pnl,
        strikeDiff
      }
    })

  let peData = data.filter(item => {
    return item.quantity < 0
  })
  let ceData = data.filter(item => {
    return item.quantity > 0
  })


  let columns = [
    {
      name: 'Option',
      wrap: false,
      grow: 3,
      selector: 'tradingsymbol',
      sortable: true,
      cell: row => <a className={"has-text-link"} href={'/options2?tradingsymbols=' + row.stockCode} target="_blank" rel="noreferrer">{row.tradingsymbol}</a>
    },
    {
      name: 'Stock',
      selector: 'stockCode',
      sortable: true,
      grow: 2,
      cell: row => <><a className="has-text-link	" href={`https://kite.zerodha.com/chart/web/ciq/NSE/${row.stockCode}/${row.stockInstrumentToken}`}
        target="_blank" rel="noreferrer">{row.stockCode}</a></>
    },
    {
      name: 'Stock Price',
      selector: 'stockPriceChg',
      sortable: true,
      cell: row => <div>{row.stockPrice}<br />(<Price>{row.stockPriceChg}</Price>)</div>
    },
    {
      name: 'Breakeven',
      selector: 'breakevenChg',
      wrap: true,
      sortable: true,
      cell: row => <div>{row.breakeven}<br />(<Price>{row.breakevenChg}</Price>)</div>
    },
    {
      name: 'Strike',
      selector: 'strike',
      wrap: true,
      sortable: true,
      cell: row => <div>{row.strike}<br />(<Price>{row.strikeDiff}</Price>)</div>
    },
    {
      name: 'Quantity',
      selector: 'quantity', wrap: true,
      sortable: true
    },

    {
      name: 'Buy Value',
      selector: 'buyValue', wrap: true,
      sortable: true
    },
    {
      name: 'Bid Price',
      selector: 'bidPrice', wrap: true,
      sortable: true,
      cell: row => <div>
        <a className="has-text-link	" onClick={createOrder({
          transactionType: "SELL", tradingsymbol: row.tradingsymbol, quantity: row.quantity, price: (row.bidPrice)
        })}>{row.bidPrice}</a> <br />

        (<Price small  >{(row.bidPrice - row.price) * 100 / row.price}</Price>%)

      </div>
    },
    {
      name: 'Buy/Sell Price', wrap: true,
      selector: 'price',
      sortable: true
    },
    {
      name: 'Offer Price',
      selector: 'offerPrice', wrap: true,
      sortable: true,
      cell: row => <div><a className="has-text-link	" onClick={createOrder({
        transactionType: "SELL", tradingsymbol: row.tradingsymbol, quantity: row.quantity, price: (row.offerPrice - 0.5)
      })}>{row.offerPrice}</a>  <br />
        (<Price small  >{(row.offerPrice - row.price) * 100 / row.price}</Price>%)
      </div>
    },

    {
      name: 'P&L (Expiry)',
      selector: 'pnl',
      sortable: true, wrap: true,
      cell: row => <div>
        <Price>{row.pnl}</Price><br />
        <Price>{row.expiryPnL}</Price>
      </div>
    },
  ]



  return (
    <div >
      <Head>
        <title>PnL: {totalProfit.toFixed(2)}</title>
      </Head>
      <Header userProfile={userProfile} tab="positions"></Header>

      <div className="container mt-4">

        <article className="message is-info">
          <div className="message-body">
            <div>
              Net PnL: <span className={(totalProfit > 0) ? 'has-text-success' : 'has-text-danger'}>{currencyFormatter.format(totalProfit, { code: 'INR' })}</span>
            </div>
            <div>
              Net PnL (Expiry): <Price>{netExpiryPnl}</Price>

            </div>
          </div>
        </article>



      </div>

      <div className="container mt-5">
        <Table data={ceData} columns={columns} />
        <Table data={peData} >
          <Column selector="tradingsymbol" name="Option">
            {row => <a className={"has-text-link"} href={'/options2?tradingsymbols=' + row.stockCode} target="_blank" rel="noreferrer">{row.tradingsymbol}</a>}
          </Column>
          <Column selector="stockCode" name="Stock">
            {row => <><a className="has-text-link	" href={`https://kite.zerodha.com/chart/web/ciq/NSE/${row.stockCode}/${row.stockInstrumentToken}`}
              target="_blank" rel="noreferrer">{row.stockCode}</a></>}
          </Column>

          <Column selector={"stockPriceChg"} name="Stock Price" >
            {row => <div>{row.stockPrice}<br />(<Price>{row.stockPriceChg}</Price>)</div>}
          </Column>
          <Column selector={"breakevenChg"} name="Breakeven" >
            { row => <div>{row.breakeven}<br />(<Price>{row.breakevenChg}</Price>)</div>}
          </Column>
          <Column selector={"strike"} name="Strike" >
            {row => <div>{row.strike}<br />(<Price>{row.strikeDiff}</Price>)</div>}
          </Column>
          <Column selector={"quantity"} name="Quantity" />
          <Column selector={"buyValue"} name="Buy Value" />
          <Column selector={"bidPrice"} name="Bid Price">
            {row => <div>
              <a className="has-text-link	" onClick={createOrder({
                transactionType: "SELL", tradingsymbol: row.tradingsymbol, quantity: row.quantity, price: (row.bidPrice)
              })}>{row.bidPrice}</a> <br />

              (<Price small reverseColoring >{(row.bidPrice - row.price) * 100 / row.price}</Price>%)

            </div>}
          </Column>

          <Column selector={"price"} name="Buy/Sell Price" />
          <Column selector={"offerPrice"} name="Offer Price">
            {row => <div><a className="has-text-link	" onClick={createOrder({
              transactionType: "SELL", tradingsymbol: row.tradingsymbol, quantity: row.quantity, price: (row.offerPrice - 0.5)
            })}>{row.offerPrice}</a>  <br />
              (<Price small reverseColoring >{(row.offerPrice - row.price) * 100 / row.price}</Price>%)
            </div>}
          </Column>
          <Column selector={"pnl"} name={"P&L (Expiry)"}>
            {row => <div>
              <Price>{row.pnl}</Price><br />
              <Price>{row.expiryPnL}</Price>
            </div>}
          </Column>




        </Table>
      </div>

    </div>
  )
}

function getStockCode(tradingsymbol) {
  let regex = /([A-Z]*)+(\d*)([A-Z]*)(.*)[C|P]E/;
  if (tradingsymbol.indexOf('NIFTY') >= 0) {
    regex = /([A-Z]*)+(\d*).*(.{5})[C|P]E/;
    let out = tradingsymbol.match(regex);
    return {
      stockCode: "NIFTY 50",
      strike: out[3]
    }
  }
  let out = tradingsymbol.match(regex);
  let stockCode;
  try {
    stockCode = out[1];
    if (stockCode == 'NIFTY') {
      stockCode = 'NIFTY 50';
    }
    if (stockCode == 'BANKNIFTY') {
      stockCode = 'NIFTY BANK'
    }

  } catch (e) {
    console.log('tradingsymbol', tradingsymbol);
    throw e;
  }
  let strike = Number(out[4]);
  return {
    stockCode,
    strike
  }
}

export async function getServerSideProps(ctx) {
  let { req, res } = ctx;
  let userProfile, positions = {}, quotes = [];
  let kc
  try {
    kc = await getKiteClient(req.cookies);
    userProfile = await kc.getProfile();
  } catch (e) {
    console.log('error')
  }

  if (!userProfile) {
    res.writeHead(307, { Location: `/api/login` })
    return res.end()
  }

  try {
    positions = await kc.getPositions();
    positions = positions.net.filter(item => item.exchange == 'NFO' && item.quantity != 0);

    let stockCodes = Array.from(new Set(positions
      .map(item => {
        return getStockCode(item.tradingsymbol).stockCode
      }))).map(item => `NSE:${item}`);

    let instruments = [...positions.map(item => item.instrument_token), ...stockCodes]
    quotes = (await kc.getQuote(instruments))

    Object.values(quotes).map(item => {
      delete item.timestamp
      delete item.last_trade_time;
    });

  } catch (e) {
    console.log(e)
  }


  return {
    props: {
      userProfile,
      positions: positions,
      quotes
    }
  }
}
