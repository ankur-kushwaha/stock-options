import React from 'react'
import { useCookies } from "react-cookie"
import { parseCookies } from '../helpers/index';

let API_KEY = 'ab8oz67ryftv7gx9'

export default function OptionsPage({ data }) {
    const [cookie, setCookie] = useCookies(["zerodha"])
console.log(data)
    return (
        <div>
            Options home 
        </div>
    )
}

export async function getServerSideProps({ req, res }) {

    const data = parseCookies(req)

    if (!data.zerodha) {
        
        res.writeHead(301, { Location: "https://kite.zerodha.com/connect/login?v=3&api_key="+API_KEY })
        res.end()
        
    }

    return {
        props:{
            data
        }
    }

}
