import { postData } from "../../helpers/fetch";

export default async function handler(req, res) {
  // Authorization:'token '+accessToken,
  // 'X-Kite-Version':3
//   console.log(req.headers)

  console.log('https://api.kite.trade/margins/basket?consider_positions=false&mode=compact', req.body,{
    Authorization:req.headers.authorization,
    'X-Kite-Version':req.headers['x-kite-version']
  })
  let response = await postData('https://api.kite.trade/margins/basket?consider_positions=false&mode=compact', req.body,{
    Authorization:req.headers.authorization,
    'X-Kite-Version':req.headers['x-kite-version']
  })
  res.status(200).json(response)
      
}
  