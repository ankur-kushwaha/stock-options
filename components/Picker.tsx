import { Label, TextInput } from 'flowbite-react'
import React, { useEffect, useMemo } from 'react'
import debounce from 'debounce';

export default function Picker({label, onChange,list }:any) {

  const [pickerList, setPickerList] = React.useState(list);
  const [searchText, setSearchText] = React.useState("");
  const [showDrowdown, setShowDropdown] = React.useState(false);


  function handleSearchTextChange(e:any) {
    setSearchText(e.target.value);
    const newPickerList = list.filter((item:any) => item.name.toLowerCase().indexOf(e.target.value.toLowerCase()) != -1);
    setPickerList(newPickerList)
  }

  const handleItemClick = (item:any, i:number) => () => {
    onChange?.(item.value, i);
    setShowDropdown(false)
    setSearchText("")
  }

  function handleTextBoxClick() {
    setShowDropdown(true);
  }

  function handleTextBlur(){
    setTimeout(()=>{
      setShowDropdown(false);
    },100)
  }

  return (
    <>
      <div>
        <div className="mb-2 block">
          <Label
            htmlFor="small"
            value={label}
          />
        </div>
        <TextInput
          onBlur={handleTextBlur}
          onClick={handleTextBoxClick}
          onChange={handleSearchTextChange}
          value={searchText}
          id="small"
          type="text"
          sizing="sm"
        />
      </div>

      {showDrowdown && pickerList.length>0 &&
        <div id="dropdown" className=" z-10 w-44 bg-white rounded divide-y divide-gray-100 shadow dark:bg-gray-700">
          <ul className="py-1 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownDefault">
            {pickerList?.map((item:any, i:number) => (
              <li key={item.value} onClick={handleItemClick(item, i)}>
                <span className="block cursor-pointer py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">{item.name}</span>
              </li>
            ))}
          </ul>
        </div>
      }
    </>
  )
}
