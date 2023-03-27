
export function smartApi(method:string,body?:any){
  return fetch('/api/smartApi?method='+method,{
    body:JSON.stringify(body),
    method:"POST"
  }).then(res=>res.json()).then(res=>res.response)
}