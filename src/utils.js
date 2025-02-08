// export function mergeDataOptimized(optionContract = [], optionChain = []) {
//     // Create a lookup map from data2 for quick access
//     const data2Map = new Map();
  
//     optionChain?.forEach(d => {
//       data2Map.set(d?.call_options?.instrument_key, {
//         market_data: d?.call_options?.market_data,
//         option_greeks: d?.call_options?.option_greeks,
//         underlying_spot_price: d.underlying_spot_price
//       });
//       data2Map.set(d.put_options.instrument_key, {
//         market_data: d.put_options.market_data,
//         option_greeks: d.put_options.option_greeks,
//         underlying_spot_price: d.underlying_spot_price
//       });
//     });
  
//     return optionContract.map(item => {
//       const match = data2Map.get(item.instrument_key);
//       if (match) {
//         item.market_data = match.market_data;
//         item.option_greeks = match.option_greeks;
//         item.underlying_spot_price = match.underlying_spot_price;
//       }
//       return item;
//     });
//   }
// export function mergeDataOptimized(optionContract = [], optionChain = [], percentageThreshold) {
//     // Create a lookup map from data2 for quick access
//     const data2Map = new Map();
  
//     optionChain.forEach(d => {
//       data2Map.set(d.call_options.instrument_key, {
//         market_data: d.call_options.market_data,
//         option_greeks: d.call_options.option_greeks,
//         underlying_spot_price: d.underlying_spot_price,
//         strike_price: d?.strike_price
//       });
//       data2Map.set(d.put_options.instrument_key, {
//         market_data: d.put_options.market_data,
//         option_greeks: d.put_options.option_greeks,
//         underlying_spot_price: d.underlying_spot_price,
//         strike_price: d?.strike_price
//       });
//     });
  
//     return optionContract.filter(item => {
//       const match = data2Map.get(item.instrument_key);
//       if (match) {
//         item.market_data = match.market_data;
//         item.option_greeks = match.option_greeks;
//         item.underlying_spot_price = match.underlying_spot_price;
//         item.strike_price= match?.strike_price;

//         const priceDifference = ((item.strike_price - match.underlying_spot_price) / match.underlying_spot_price) * 100;
//         if (item?.market_data?.ltp>0 && ((item.instrument_type === 'CE' && priceDifference >= percentageThreshold) ||
//             (item.instrument_type === 'PE' && priceDifference <= -percentageThreshold))) {
//           return true;
//         }
//       }
//       return false;
//     });
//   }
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
    if(type==='PE'){
        return (((spot/strike) * 100) - 100).toFixed(1)
    }
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