
  export function mergeData(data1, data2, percentageThreshold) {
    // Create a lookup map from data2 for quick access
    const data2Map = new Map();
  
    data2.forEach(d => {
      data2Map.set(d.instrument_key, d);
    });
  
    const callOptions = [];
    const putOptions = [];
  
    data1.forEach(item => {
      const underlyingData = data2Map.get(item.underlying_key);
      if (underlyingData) {
        const priceDifference = ((item.strike_price - item.underlying_spot_price) / item.underlying_spot_price) * 100;
        
        if (item.call_options && priceDifference >= percentageThreshold && item.call_options?.market_data?.ltp>0) {
          callOptions.push({
            ...item.call_options,
            underlying_info: underlyingData,
            expiry: item.expiry,
            strike_price: item.strike_price,
            underlying_spot_price: item.underlying_spot_price,
            instrument_type: "CE"
          });
        }
        if (item.put_options && priceDifference <= -percentageThreshold && item.put_options?.market_data?.ltp>0) {
          putOptions.push({
            ...item.put_options,
            underlying_info: underlyingData,
            expiry: item.expiry,
            strike_price: item.strike_price,
            underlying_spot_price: item.underlying_spot_price,
            instrument_type: "PE"
          });
        }
      }
    });
  
    return { callOptions, putOptions };
  }
  
  export function getDiffFromStrike(type, spot, strike){
    // if(type==='PE'){
    //     return (((spot/strike) * 100) - 100).toFixed(1)
    // }
    return (((strike/spot) * 100) - 100).toFixed(1)

  }

  export function extractUniqueExpiry(response) {
    const uniqueExpirySet = new Set(response.data.map(item => item.expiry));
    
    return [...uniqueExpirySet].map(expiry => ({
      value: expiry,
      label: expiry
    }));
  }

 export function filterUniqueUnderlying(data) {
    const seen = new Set();
    return data.filter(item => {
      const underlyingKey = item.underlying_info.instrument_key;
      if (!seen.has(underlyingKey)) {
        seen.add(underlyingKey);
        return true;
      }
      return false;
    });
  }