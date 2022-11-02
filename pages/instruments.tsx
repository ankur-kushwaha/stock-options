import { GetServerSideProps } from 'next'
import React, { useContext, useEffect, useRef } from 'react'
import { AppContext } from '../lib/AppContext';
import InstrumentSidebar from '../components/instrument-sidebar';
import { ReactTable } from '../components/ReactTable';
import { useKite } from '../lib/useKite';
import { useToast } from '../lib/useToast';
import { useRouter } from 'next/router'
import { Button } from 'flowbite-react';


type Option = {
  expiry:string;
  tradingsymbol:string;
  strikeDiffPct:string;
  lot_size:string;
  price:string;
  sellPrice:string;
  timeValue:string;
}

export default function Instruments({ positions }) {
  const [options, setOptions] = React.useState<Option[]>([]);
  const stockQuotes = useRef({});
  const { selectedInstruments, config ,setSelectedInstruments} = useContext(AppContext);
  const { getInstruments, fetchStockQuotes } = useKite({ config, stockQuotes });
  const { showToast } = useToast();
  const {query} = useRouter()
  const {stock} = query;

  useEffect(()=>{
    if(stock && typeof stock == 'string'){
      setSelectedInstruments(
        {
          [stock]:true
        }
      )
      
      loadIndex({
        [stock]:true
      })
      
    }
  },[stock])

  
  useEffect(() => {
    fetchStockQuotes(selectedInstruments);
  }, [selectedInstruments])

  async function loadIndex(passedInstruments?:any) {
    const instruments = passedInstruments||selectedInstruments;
    setOptions([]);

    const promiseArr = []

    for (const stockCode of Object.keys(instruments)) {
      if (instruments[stockCode]) {
        promiseArr.push(getInstruments({
          stockCode: stockCode,
          singleOption: config.singleOption
        }))
      }
    }

    const output = await Promise.all(promiseArr);

    const out = output.flat().sort((a, b) => b.timeValue - a.timeValue).map(item=>{
      const position = item;
      item.absoluteTimeValue = (position.timeValue*1000000/(position.lot_size * stockQuotes.current[position.name].last_price)).toFixed(2);
      return item;
    })
    setOptions(out);
  }

  async function getAllOptions({mode}) {
    
    showToast("Getting all options")
    setOptions([]);

    let response ;
    if(mode == 'ALL'){
      response = (await fetch('/api/option-instruments').then(res => res.json())).data;
    }else{
      response = ["ADANIENT","LALPATHLAB","ZEEL","GNFC","ADANIPORTS","IDFCFIRSTB","IDEA","BAJFINANCE","IBULHSGFIN","IRCTC","PVR","HAL","TATAMOTORS","GMRINFRA","PNB","MINDTREE"];
    }
    await fetchStockQuotes(response.reduce((a, b) => {
      a[b] = true
      return a;
    }, {}));

    for (const instrument of response) {
      showToast("Fetching " + instrument)
      
      const option = await getInstruments({
        stockCode: instrument,
        singleOption: true
      });

      setOptions(options => [...options, ...option].sort((a, b) => b.timeValue - a.timeValue).map(item=>{
        const position = item;
        item.absoluteTimeValue = (position.timeValue*1000000/(position.lot_size * stockQuotes.current[position.name].last_price)).toFixed(2);
        return item;
      }))
    }
  }

  function loadAllStocks(){
    getAllOptions({
      mode:"ALL"
    })
  }

  function loadSelectedStocks(){
    getAllOptions({mode:"SELECTED"})
  }

  const columns = React.useMemo(() => {
    return [
      {
        Header: 'Instrument',
        accessor: 'tradingsymbol', // accessor is the "key" in the data
        Cell: ({ row }) => {
          const position = row.original;
          
          return (
            <div>
              <a href={`https://kite.zerodha.com/chart/ext/ciq/${position.segment}/${position.tradingsymbol}/${position.instrument_token}`} target={'_blank'} rel="noreferrer">
                {position.tradingsymbol}
              </a>
              <br />
              <a href={"/instruments?stock="+position.name} className='text-xs text-blue-600'>View all</a>
            </div>
          )
        }
      },
      {
        Header: 'Stock',
        accessor: 'stock',
        Cell: ({ row }) => {
          const position = row.original;
          return (<a href={`https://kite.zerodha.com/chart/ext/ciq/NSE/${position.name}/${stockQuotes.current[position.name]?.instrument_token}`} target={'_blank'} rel="noreferrer">
            {position.name}
            <br />
            ₹<span className='text-xs'>{stockQuotes.current[position.name]?.last_price}</span>
            &nbsp;<span className={`text-xs ${(stockQuotes.current[position.name]?.change < 0 ? 'text-red-600':'text-green-600')}`}>({stockQuotes.current[position.name]?.change})</span>
          </a>)
        }
      },
      {
        Header: 'Expiry',
        accessor: 'expiry', // accessor is the "key" in the data
      },
      {
        Header: 'Strike Diff',
        accessor: 'strikeDiffPct', // accessor is the "key" in the data
      },
      {
        Header: 'Lot Size',
        accessor: 'lot_size', // accessor is the "key" in the data
      },
      {
        Header: 'Buy',
        accessor: 'price', // accessor is the "key" in the data
      },
      {
        Header: 'Sell',
        accessor: 'sellPrice', // accessor is the "key" in the data
      },
      {
        Header: 'Time Value',
        accessor: 'timeValue', // accessor is the "key" in the data
      },
      {
        Header: 'TimeValue/10L',
        accessor: 'absoluteTimeValue'
      },
    ]
  }, [])

  return (
    <div className="card mt-4 mx-auto max-w-screen-xl	">
      <>
        <div className='flex flex-row gap-4 mb-4'>
          <Button onClick={loadAllStocks}>Load all</Button>
          <Button onClick={loadSelectedStocks}>Load selected</Button>
          <Button onClick={()=>loadIndex()}>Load Index</Button>
        </div>
        <div className="flex lg:flex-row flex-col">
          <div className='w-full lg:w-1/3'>
            <InstrumentSidebar/>
          </div>
          <div className='w-full lg:pl-6'>
            <ReactTable<Option> columns={columns} data={options}></ReactTable>
          </div>
        </div>
      </>
    </div>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {

  return {
    props: {

    }
  }
}