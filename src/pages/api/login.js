import nookies from 'nookies'

let API_KEY = 'ab8oz67ryftv7gx9'

export default function handler(req, res) {
    res.writeHead(301, { Location: "https://kite.zerodha.com/connect/login?v=3&api_key=" + API_KEY })
    res.end()
}
  