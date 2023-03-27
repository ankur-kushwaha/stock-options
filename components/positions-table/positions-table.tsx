import { Button, Table } from "flowbite-react";
import React from "react";
import { smartApi } from "../../lib/smartConnect";
import { ReactTable } from "../ReactTable";


/* eslint-disable-next-line */
export interface PositionsTableProps {
  positions: any
}

type Position = {
  symboltoken: string
  symbolname: string
  instrumenttype: string
  priceden: string
  pricenum: string
  genden: string
  gennum: string
  precision: string
  multiplier: string
  boardlotsize: string
  exchange: string
  producttype: string
  tradingsymbol: string
  symbolgroup: string
  strikeprice: string
  optiontype: string
  expirydate: string
  lotsize: string
  cfbuyqty: string
  cfsellqty: string
  cfbuyamount: string
  cfsellamount: string
  buyavgprice: string
  sellavgprice: string
  avgnetprice: string
  netvalue: string
  netqty: string
  totalbuyvalue: string
  totalsellvalue: string
  cfbuyavgprice: string
  cfsellavgprice: string
  totalbuyavgprice: string
  totalsellavgprice: string
  netprice: string
  buyqty: string
  sellqty: string
  buyamount: string
  sellamount: string
  pnl: string
  realised: string
  unrealised: string
  ltp: string
  close: string
}


export function PositionsTable({ positions }: PositionsTableProps) {
  console.log(positions);

  async function createStoploss(row: Position) {
    console.log(row);

    if (Number(row.netqty) < 0) {
      let data = {
        "tradingsymbol": row.tradingsymbol,
        "symboltoken": row.symboltoken,
        "exchange": row.exchange,
        "producttype": row.producttype,
        "transactiontype": 'BUY',
        "price": 10,
        "qty": -1 * Number(row.netqty),
        "disclosedqty": -1 * Number(row.netqty),
        "triggerprice": 200000,
        "timeperiod": 90
      }
      console.log(data);
      let res = await smartApi('createRule', data)
      console.log(res);

    } else {
      alert('BUY order not supported')
    }

  }
  const netPositions = positions.sort((a: any, b: any) => b.pnl - a.pnl)

  const columns = React.useMemo(
    () => [
      {
        Header: 'Instrument',
        accessor: 'tradingsymbol', // accessor is the "key" in the data
      },
      {
        Header: 'Quantity',
        accessor: 'netqty', // accessor is the "key" in the data
      },
      {
        Header: 'Avg Price',
        accessor: 'netprice', // accessor is the "key" in the data
      },
      {
        Header: 'Price',
        accessor: 'ltp', // accessor is the "key" in the data
      },
      {
        Header: 'PnL',
        accessor: 'pnl', // accessor is the "key" in the data
      },
      {
        Header: "Actions",
        Cell: ({ row }: any) => {
          return (<>
            {row.original.netqty < 0 &&
              <Button onClick={() => createStoploss(row.original)}>Create stoploss</Button>
            }
          </>)
        }

      }
    ],
    []
  )


  return <ReactTable columns={columns} data={netPositions}></ReactTable>
}

export default PositionsTable;
