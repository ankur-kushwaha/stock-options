import { Table } from "flowbite-react";
import React, { ReactElement } from "react";
import { useTable, useSortBy } from 'react-table'

export const ReactTable = function ReactTable<T extends object>({ data, columns }: { data: T[], columns: any }) {

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable<T>({ columns, data }, useSortBy)

  return (
    <Table {...getTableProps()} >
      <thead>
        {headerGroups.map((headerGroup, i) => (
          <tr key={i} {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column, j) => (
              <Table.HeadCell key={j}
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                //@ts-ignore
                {...column.getHeaderProps(column.getSortByToggleProps())}
              >
                {column.render('Header')}
                <span>
                  {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                  {/* @ts-ignore */}
                  {column.isSorted ? column.isSortedDesc
                    ? ' 🔽'
                    : ' 🔼'
                    : ''}
                </span>
              </Table.HeadCell>
            ))}
          </tr>
        ))}
      </thead>


      <Table.Body {...getTableBodyProps()} className="divide-y">
        {
          rows.map((row, i) => {
            prepareRow(row)
            return (
              <Table.Row {...row.getRowProps()} key={i} className="bg-white dark:border-gray-700 dark:bg-gray-800">
                {row.cells.map((cell, j) => {
                  return (
                    <Table.Cell key={j} {...cell.getCellProps()} className="whitespace-nowrap font-medium text-gray-900 dark:text-white">
                      {cell.render('Cell')}
                    </Table.Cell>
                  )
                })}
              </Table.Row>
            )
          }
          )
        }
      </Table.Body>
    </Table>
  );
}