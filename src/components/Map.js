import React from 'react'

export default function Map({tradingSymbol}) {
    return (
        <div>
            <iframe width={"100%"} height={"800px"} src={"https://www.moneycontrol.com/mc/stock/chart?scId=MC20&exchangeId="+tradingSymbol+"&ex=NSE"} 
                frameBorder="0"></iframe>
        </div>
    )
}
