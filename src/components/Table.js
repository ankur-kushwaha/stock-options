import React from 'react'
import DataTable from 'react-data-table-component';
import Cell from './Cell';

const BaseExpandedComponent = ({ data }) => <pre>
  {JSON.stringify(data, null, 2)}</pre>;


export default function Table({ pagination=true,title,data,columns ,ExpandedComponent,expandableRows}) { 
  const handleClick = (item, type) => () => {
    let price = item.price,transactionType='BUY';
        
    if (type == 'SELL') {
      transactionType = 'SELL'
    } else if (type == 'AVG_BUY') {
      price = ((Number(item.sellPrice) + Number(item.buyPrice)) / 2).toFixed(1)
    }else {
      price = type;
    }
    
    window.open(`/api/createOrder?tradingsymbol=${item.tradingsymbol}&quantity=${item.lotSize}&price=${price}&transactionType=${transactionType}`, "_blank");
  }
  
  columns = columns || [
    {
      name: 'tradingsymbol',
      selector: 'tradingsymbol',
      sortable: true,
      cell:row=>(<a target={"_blank"} href={`https://kite.zerodha.com/chart/ext/ciq/NFO-OPT/${row.tradingsymbol}/${row.instrumentToken}`} rel="noreferrer">{row.tradingsymbol}</a>),
      grow:1
    },
    {
      name: 'strike',
      selector: 'strike',
      sortable: true,
      grow:0
    },
    {
      name: 'buyPrice',
      selector: 'buyPrice',
      cell:row=>(<a target="_blank" onClick={handleClick(row,row.buyPrice)}>{row.buyPrice}<br/>
            BE: {row.strike+row.buyPrice}({((row.strike+row.buyPrice-row.stockPrice)*100/row.stockPrice).toFixed(2)}%)
      </a>),
      sortable: true,
      grow:1
    },
    {
      name: 'sellPrice',
      selector: 'sellPrice',
      cell:row=>(<a target="_blank" onClick={handleClick(row,row.buyPrice)}>{row.sellPrice}<br/>
                BE: {row.strike+row.sellPrice}({((row.strike+row.sellPrice-row.stockPrice)*100/row.stockPrice).toFixed(2)}%)
      </a>),
      sortable: true,
      grow:1
    },
    {
      name: 'lotSize',
      selector: 'lotSize',
      sortable: true,
      grow:0
    },
    {
      name: 'investment',
      selector: 'investment',
      sortable: true,
      grow:0
    },
    {
      name: 'diff',
      selector: 'diff',
      cell:row=><Cell value={row.diff}/>,
      sortable: true,
      grow:0
    },
    {
      name: 'breakeven',
      selector: 'breakeven',
      sortable: true,
      cell:row=>(<a target="_blank" onClick={handleClick(row,row.breakeven)}>{row.breakeven}<br/>
                ({row.breakevenChg.toFixed(2)}%)
      </a>),
      grow:0
    },
        
    {
      name: "BUY/SELL",
      cell: item => (<div style={{ whiteSpace: "nowrap" }}>
        <button onClick={handleClick(item, 'AVG_BUY')}>BUY@AVG</button>&nbsp;
        <button onClick={handleClick(item, 'SELL')}>SELL</button>
      </div>)
    }
  ];

  const conditionalRowStyles = [
    {
      when: row => row.highlight == true,
      style: {
        backgroundColor: '#48c78e36'
      },
    },
  ];

  return (
    <div>
      <DataTable
        title={title}
        conditionalRowStyles={conditionalRowStyles}
        responsive={true}
        compact={true}
        noHeader={!title}
        fixedHeader={true}
        columns={columns}
        data={data}
        expandableRows={expandableRows||false}
        expandableRowsComponent={ExpandedComponent||<BaseExpandedComponent/>}
      />
    </div>
  )
}
