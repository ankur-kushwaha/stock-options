import React, { MouseEvent } from 'react'
import DataTable from 'react-data-table-component';
import Cell from './Cell';

const BaseExpandedComponent = ({ data }) => <pre>
  {JSON.stringify(data, null, 2)}</pre>;


type ColumnProps={
  changeSortOrder?:(selector:string)=>(event:MouseEvent)=>void,
  item?:any,
  children?:any,
  selector:string,
  onClick?:(event: MouseEvent)=>void
}

function Column({changeSortOrder,item}:ColumnProps){
  return <th onClick={changeSortOrder(item.selector)} key={item.name}>{item.name}</th>
}

export {
  Column
}

type TableProps = {
  columns?:any,
  data:any,
  children?:any,
  title?:any
}

export default function Table({columns,data,children=[],title=""}:TableProps){
  let [sortOrder,setSortOrder ] = React.useState({
    key:null,
    order:true
  })

  const changeSortOrder = (key)=>()=>{
    setSortOrder({
      key,
      order:!sortOrder.order
    }) 
  }

  data = data
    .map(item=>{
      for(let key in item){
        if(typeof item[key] == 'number'){
          item[key] = item[key].toFixed(2)
        }
      }
      return item;
    });

  if(sortOrder.key){
    data = data.sort((a,b)=>{
      if(isNaN(Number(a[sortOrder.key]))){
        if(sortOrder.order){
          return (a[sortOrder.key])<(b[sortOrder.key])?1:-1
        }else{
          return (b[sortOrder.key])>(a[sortOrder.key])?-1:1
        }
      }else{
        if(sortOrder.order){
          return Number(a[sortOrder.key])-Number(b[sortOrder.key])>0?1:-1
        }else{
          return Number(a[sortOrder.key])-Number(b[sortOrder.key])>0?-1:1
        }
      }
      
    });
  }
  

  return (
    <div className="table-container">
      <h3 className="title is-5">{title}</h3>

      <table width={"100%"} className="table">
        <thead>
          <tr>{
            columns && columns.map(item=><th onClick={changeSortOrder(item.selector)} key={item.name}>{item.name}</th>)
          }
          {children && children.map((item,i)=><th onClick={changeSortOrder(item.props.selector)} key={i}>{item.props.name||item.props.selector}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((item,i)=>
            <tr key={i}>
              {columns && columns.map((cell,j)=>
                <td key={j}>
                  {cell.cell?<cell.cell {...item}/>:
                    item[cell.selector]}
                </td>)}

              {children && children.map((cell,j)=><td key={j}>
                {cell.props.children ?cell.props.children(item) : item[cell.props.selector]}
              </td>)}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export function Table2({ pagination=true,title,data,columns ,ExpandedComponent,expandableRows}) { 
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
