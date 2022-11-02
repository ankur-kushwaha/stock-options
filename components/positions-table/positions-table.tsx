import { Table } from "flowbite-react";
import React from "react";
import { ReactTable } from "../ReactTable";


/* eslint-disable-next-line */
export interface PositionsTableProps {
  positions: any
}

export function PositionsTable({ positions }: PositionsTableProps) {

  const netPositions = positions.data.net.sort((a:any,b:any)=>b.pnl-a.pnl)

  const columns = React.useMemo(
    () => [
      {
        Header: 'Instrument',
        accessor: 'tradingsymbol', // accessor is the "key" in the data
      },
      {
        Header: 'Quantity',
        accessor: 'quantity', // accessor is the "key" in the data
      },
      {
        Header: 'Avg Price',
        accessor: 'average_price', // accessor is the "key" in the data
      },
      {
        Header: 'Price',
        accessor: 'last_price', // accessor is the "key" in the data
      },
      {
        Header: 'PnL',
        accessor: 'pnl', // accessor is the "key" in the data
      }
    ],
    []
  )

  
  return <ReactTable columns={columns} data={netPositions}></ReactTable>
}

export default PositionsTable;
