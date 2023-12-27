import React, { useEffect, useRef, memo } from 'react';

function TradingViewWidget(props: { stockCode: string , ex: string}) {
  return (
    <iframe height={'500px'} width={'100%'} src={"https://www.moneycontrol.com/mc/stock/chart?exchangeId="+props.stockCode+"&ex="+props.ex}/>
  );
}

export default memo(TradingViewWidget);
