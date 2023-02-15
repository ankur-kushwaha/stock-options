import { log } from 'console';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import React, { useContext, useEffect, useRef } from 'react';
import { ReactTable } from '../components/ReactTable';
import { AppContext } from '../lib/AppContext';
import { useKite } from '../lib/useKite';
import { useToast } from '../lib/useToast';

export interface Ohlc {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Buy {
  price: number;
  quantity: number;
  orders: number;
}

export interface Sell {
  price: number;
  quantity: number;
  orders: number;
}

export interface Depth {
  buy: Buy[];
  sell: Sell[];
}

export interface Quote {
  instrument_token: number;
  timestamp: string;
  last_trade_time: string;
  last_price: number;
  last_quantity: number;
  buy_quantity: number;
  sell_quantity: number;
  volume: number;
  average_price: number;
  oi: number;
  oi_day_high: number;
  oi_day_low: number;
  net_change: number;
  lower_circuit_limit: number;
  upper_circuit_limit: number;
  ohlc: Ohlc;
  depth: Depth;
}

export interface Option {
  _id: string;
  instrument_token: number;
  exchange_token: number;
  tradingsymbol: string;
  name: string;
  last_price: number;
  expiry: string;
  strike: number;
  tick_size: number;
  lot_size: number;
  instrument_type: string;
  segment: string;
  exchange: string;
}

const minProfit1L = 7000;
const minDiffPct = 5;

export default function Instruments({ positions }: any) {
  const stockQuotes = useRef<Record<string, any>>({});
  const { config } = useContext(AppContext);
  const { fetchStockQuotes, getMargin, fetchQuotes } = useKite({ config, stockQuotes });
  const isRunning = React.useRef(false);
  const [table, setTable] = React.useState<any[]>([]);

  function getFilteredOptions(stockCode: string, res: any) {

    return (res.data as Option[]).map((item: Option) => {
      const stockPrice = stockQuotes.current[stockCode]?.last_price;
      const strikePrice = item.strike;

      return {
        ...item,
        stockPrice,
        strikePrice,
        strikePriceDiff: ((strikePrice - stockPrice) * 100 / stockPrice)
      }
    }).filter((item) => {

      if (item.instrument_type != 'PE') {
        return false;
      }

      if (item.strikePriceDiff > - minDiffPct) {
        return false;
      }

      return true;
    })
  }

  async function fetchOptionQuotes(optionCodes: string[]) {
    if (optionCodes.length > 0) {
      const optionQuotes: Record<string, Quote> = await fetchQuotes(optionCodes, 'NFO');
      return optionQuotes
    }
  }

  async function analyzeOption(stock: string) {
    let res = await fetch("http://localhost:4200/api/options?name=" + stock, {
      "method": "GET",
    }).then(res => res.json());

    const options = getFilteredOptions(stock, res);
    if (!options.length) {
      console.error('No matching options for ', stock)
      return;
    }
    let lotSize = options[0].lot_size;

    let optionQuotes = await fetchOptionQuotes(options.map((item: any) => item.tradingsymbol)) || {}

    let optionsWithMargin = await Promise.all(options
      .map(item => {
        return {
          ...item,
          quote: optionQuotes["NFO:" + item.tradingsymbol]
        }
      })
      .filter(item => {
        return (item.quote.depth.buy[0].price > 0)
      })
      .map(async option => {
        let price = option.quote.depth.buy[0].price;
        let margin = await getMargin({
          tradingsymbol: option.tradingsymbol,
          lotSize,
          price
        })
          .then(res => res.total)
        return {
          ...option,
          lotSize,
          price,
          margin
        };
      }))

    let filteredOptions = optionsWithMargin.map((item) => {
      let maxProfit = item["lotSize"] * item["price"]
      let maxProfit1L = maxProfit / item.margin * 100000
      return {
        ...item,
        maxProfit,
        maxProfit1L
      }
    }).filter(item => item.maxProfit1L > minProfit1L)


    return filteredOptions.map(item => {

      return {
        buy: item.quote.depth.buy[0].price,
        sell: item.quote.depth.sell[0].price,
        score: Number((item.maxProfit * (-item.strikePriceDiff) / item.margin).toFixed(2)),
        margin: item.margin,
        maxProfit1L: item.maxProfit1L,
        stockPrice: item.stockPrice,
        strikePriceDiff: item.strikePriceDiff,
        tradingsymbol: item.tradingsymbol,
      }
    })

  }

  async function analyzeOptions() {


    let stocks = [ "LALPATHLAB", "ZEEL", "GNFC", "ADANIPORTS", "IDFCFIRSTB", "IDEA", "BAJFINANCE", "IBULHSGFIN", "IRCTC", "PVR", "HAL", "TATAMOTORS", "GMRINFRA", "PNB", "TATASTEEL", "BHARTIARTL","BANKBARODA","SBIN","IDFC","MOTHERSON","SAIL","BHEL","HINDALCO","RELIANCE","BEL","VEDL","ITC","TATAPOWER","HDFCLIFE","IOC","FEDERALBNK","NATIONALUM","ONGC","CANBK","NTPC","GAIL","ICICIBANK","HDFCBANK","INFY","WIPRO","APOLLOTYRE","PNB","ASTRAL"];
    // let stocks = (await fetch('/api/option-instruments').then(res => res.json())).data;

    await fetchStockQuotes(stocks.reduce((a: any, b: any) => {
      a[b] = true
      return a;
    }, {})).then(res => {
      stockQuotes.current = res;
    });


    let output = []
    for (let stock of stocks) {
      let options = await analyzeOption(stock)
      if (options?.length) {
        console.log(stock)
        console.table(options)
        output.push(...(options || []))
        setTable(prev => {
          return [
            ...prev,
            ...options || []
          ]
        })
      }
    }
    console.table(output.sort((a, b) => b.score - a.score))
  }

  useEffect(() => {

    if (!isRunning.current) {
      isRunning.current = true;
      analyzeOptions().finally(() => {
        isRunning.current = false;
      })
    }

  }, [])
  const columns = [{
    Header: 'Instrument',
    accessor: 'tradingsymbol',
  },{
    Header: 'Buy',
    accessor: 'buy',
  },{
    Header: 'Sell',
    accessor:"sell"
  },{
    Header: 'Score',
    accessor:"score"
  },{
    Header: 'Margin',
    accessor:"margin"
  },{
    Header: 'StockPrice',
    accessor:"stockPrice"
  },{
    Header: 'strikePriceDiff',
    accessor:"strikePriceDiff"
  },{
    Header:"maxProfit1L",
    accessor:"maxProfit1L"
  }]

  return (

    <div className="relative overflow-x-auto">    
      <ReactTable<Option> columns={columns} data={table.sort((a,b)=>b.score-a.score)}></ReactTable>
    </div>

  )

}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {


  return {
    props: {

    }
  }
}