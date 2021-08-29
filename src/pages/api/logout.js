import { parseCookies, setCookie, destroyCookie } from 'nookies'

export default function handler(req, res) {
  setCookie({res}, 'accessToken',"", {
    maxAge: 0,
    path: '/',
  })
  res.writeHead(307, { Location: "/" })
  res.end()
} 
  