
import React, { useEffect } from 'react';
import TradingView from '../lib/TradingView';
import { SidebarComponent } from '../lib/Sidebar';




export function Index() {
  const defaultStocks = [{
    stockCode: 'RECLTD',
    ex: 'NSE'
  },{
    stockCode: 'PFC',
    ex: 'NSE'
  },{
    stockCode: 'LUPIN',
    ex: 'NSE'
  },{
    stockCode: 'HAL',
    ex: 'NSE'
  },{
    stockCode: 'GRANULES',
    ex: 'NSE'
  },{
    stockCode: 'POLYCAB',
    ex: 'NSE'
  }];

  const [stocks, setStocks] = React.useState<{
    stockCode: string;
    ex: string;
  }[]>([]);

  useEffect(()=>{
    let stocks = JSON.parse(window.localStorage.getItem('stocks')||'[]');
    if(stocks.length === 0){
      stocks = defaultStocks;
    }
    setStocks(stocks);
  },[])

  return (
    <div className="mt-4 mx-auto">
      <div className='flex '>
        <div>
          <SidebarComponent stocks={stocks} setStocks={setStocks}/>
        </div>
        <div className="flex flex-wrap gap-4">
        {stocks.map((stock) => (
          <div className='w-full px-4 ' key={stock.stockCode}>
          <TradingView stockCode={stock.stockCode} ex={stock.ex} />
        </div>
        ))}
      </div>
      </div>
      
    </div>
  );
}

export default Index;
