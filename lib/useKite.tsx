//@ts-nocheck 
export function useKite({stockQuotes,config}:any){

  async function fetchQuotes(tradingsymbols:any, exchange = 'NFO') {
    tradingsymbols = tradingsymbols.map((item:any) => `i=${exchange}:${item}`).join("&")
    const res = await fetch("/api/kiteConnect?api=quote", {
      method: "POST",
      body: JSON.stringify({
        queryParam: tradingsymbols
      })
    }).then(res => res.json())
    return res.response.data;
  }


  async function getInstruments({ stockCode,singleOption }:any) {

    let code=stockCode;
    
    if(stockCode=="NIFTY 50"){ 
      code = 'NIFTY'
    }

    if(stockCode=="NIFTY BANK"){
      code = 'BANKNIFTY'
    }
        
    const res = await fetch("/api/options?name=" + (code)).then(res => res.json())
    let options = res.data.filter((item:any) => {
      const stockPrice = stockQuotes.current[stockCode]?.last_price;
      if(!stockPrice){
        return false;
      }
      item.strikeDiff = item.strike - stockPrice;
      item.strikeDiffPct = ((item.strikeDiff / stockPrice) * 100).toFixed(2)
    
      return item.instrument_type == 'PE' && item.strike < stockPrice && (-item.strikeDiffPct > config.minStrike);
    })
    
    
    if(options.length>200){
      options = options.sort((a,b)=>b.strike-a.strike);
      options.length=200;
    }
    
    const tradingsymbols = options.map(item => item.tradingsymbol);
    
    const quotes = await fetchQuotes(tradingsymbols)
    
    options = options.filter(item=>quotes[`${item.exchange}:${item.tradingsymbol}`]).map(item => {
      let optionBuyPrice,optionSellPrice;
      item.quote = quotes[`${item.exchange}:${item.tradingsymbol}`]
      if (config.liveMarket) {
        optionBuyPrice = item.quote.depth.buy[0].price;
        optionSellPrice = item.quote.depth.sell[0].price;
      } else {
        optionBuyPrice = item.quote.last_price
        optionSellPrice = item.quote.last_price
      }
      item.price = optionBuyPrice;
      item.sellPrice = optionSellPrice
      // item.strikeDiff = item.strike - stockQuotes.current[stockCode];
    
      if (item.strikeDiff < 0) {
        item.timeValue = optionBuyPrice * item.lot_size;
      }
      // item.strikeDiffPct = ((item.strikeDiff / stockQuotes.current[stockCode]) * 100).toFixed(2)
      return item;
    }).filter(item => item.price > 0 
          && item.timeValue > config.minTimeValue
    )
    
    if(options.length==0){
      return [];
    }
    if(singleOption){
      return [options.sort((a,b)=>b.timeValue-a.timeValue)[0]]
    }
    
    return options;
  }

  function getSelectedInstruments(selectedInstruments) {
    const instruments = []
    for (const stockCode of Object.keys(selectedInstruments)) {
      if (selectedInstruments[stockCode]) {
        instruments.push(stockCode);
      }
    }
    return instruments;
  }

  async function fetchStockQuotes(instruments) {
    const tradingsymbols = getSelectedInstruments(instruments)
    if(tradingsymbols.length == 0){
      return;
    }
    const quotes = await fetchQuotes(tradingsymbols, 'NSE');
        
    stockQuotes.current = tradingsymbols.reduce((a, b) => {

      a[b] = quotes[`NSE:${b}`];
      if(a[b]){
        const ohlc = a[b].ohlc;
        a[b].change = ((a[b].last_price-ohlc.close)/ohlc.close*100).toFixed(2)
      }
      
      return a;
    }, {})
  }

      
  return {
    fetchStockQuotes,
    getInstruments,
    fetchQuotes
  }

}