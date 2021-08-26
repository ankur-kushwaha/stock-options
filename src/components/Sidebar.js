import React from 'react'

export default function Sidebar({ onChange,hideSymbol }) {

    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    let { tradingsymbol, expiry } = params;

    function handleChange(e) {
        openUrl({
            newExpiry: e.target.value
        })

    }

    function openUrl({ newSymbol, newExpiry }) {
        
        let url = window.location.origin + window.location.pathname + "?tradingsymbol=" + (newSymbol || tradingsymbol) + "&expiry=" + (newExpiry || expiry||"")
        window.location.href = url;
    }

    function handleSymbolChange(e) {
        openUrl({
            newSymbol: e.target.value
        })
    }

    return (
        <div className="card">
            <div className="card-content">
                <div className="content">
                    {!hideSymbol && (<div>
                        TradingSymbol
                        <div className="select is-small is-pulled-right	" >
                            <select value={tradingsymbol} onChange={handleSymbolChange}>
                                <option>TATASTEEL</option>
                                <option>VEDL</option>
                                <option>TCS</option>
                                <option>INFY</option>
                                <option>MPHASIS</option>
                                <option>TECHM</option>
                                <option>TATACONSUM</option>
                                <option>JUBLFOOD</option>
                                <option>HINDALCO</option>
                            </select>
                        </div>
                    </div>)}
                    <br />
                    <div>
                        Expiry
                        <div  className="select is-small is-pulled-right	" >
                            <select value={expiry} onChange={handleChange}>
                                <option>2021-09-30</option>
                                <option>2021-08-26</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
