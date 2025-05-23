import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import {
  getDiffFromStrike,
  mergeData,
  extractUniqueExpiry,
  filterUniqueUnderlying,
} from "../utils";
import Nifty50 from "../data/nifty_50.json";
import AllFNO from "../data/allfno.json";
import axios from "axios";
import Bottleneck from "bottleneck";

const INSTRUMENT_OPTIONS = [
  { label: "Nifty 50", value: "nifty_50" },
  { label: "All FNO", value: "all_fno" },
];
const baseUrl = "https://api.upstox.com/v2";

const limiter = new Bottleneck({
  minTime: 50, // 200ms delay between requests (5 req/sec)
  maxConcurrent: 3, // Max 3 requests at a time
});
export default function OptionChain() {
  const [activeTab, setActiveTab] = useState("CE");
  const [openAccordions, setOpenAccordions] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingChain, setLoadingChain] = useState(true);
  const [instruments, setInstruments] = useState("all_fno");
  const [expiryDates, setExpiryDates] = useState();
  const [expiry, setExpiry] = useState();
  const [lotSize, setLotSize] = useState(localStorage.getItem('lot_size') || 15);
  const [callOptions, setCallOptions] = useState();
  const [putOptions, setPutOptions] = useState();
  const [optionContract, setOptionContract] = useState();
  const [optionChainMargin, setOptionChainMargin] = useState();
  const [filteredOptionsMargin, setFilteredOptionsMargin] = useState();
  const [error, setError] = useState("");
  const token = localStorage?.getItem("access_token");
  const contractUrl = "/option/contract";
  const chainUrl = "/option/chain";
  const marginUrl = "/charges/margin";
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const toggleAccordion = (index) => {
    setOpenAccordions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  async function getExpirtDates() {
    try {
      const response = await axios?.get(
        `${baseUrl}${contractUrl}?instrument_key=NSE_EQ|INE002A01018`,
        { headers }
      );
      const dates = extractUniqueExpiry(response?.data).reverse();
      setExpiryDates(dates);
      setExpiry(dates[0]?.value);
      setLoading(false);
    } catch (error) {
      if (error?.status === 401) {
        localStorage.removeItem("access_token");
        location.href = location.origin;
      }
    }
  }
  async function getOptionChainData() {
    setLoadingChain(true);
    setError("");
    const optionChainPromise = (
      instruments === "nifty_50" ? Nifty50 : AllFNO
    )?.map((n50) =>
      limiter.schedule(() =>
        axios?.get(
          `${baseUrl}${chainUrl}?instrument_key=${n50?.instrument_key}&expiry_date=${expiry}`,
          { headers }
        )
      )
    );
    Promise.allSettled(optionChainPromise)
      .then((responses) => {        
        const { callOptions, putOptions } = mergeData(
          responses?.filter((c)=>c?.status==='fulfilled')?.map((c) => c?.value?.data?.data)?.flat(),
          AllFNO,
          lotSize
        );
        callOptions &&
          setCallOptions(
            filterUniqueUnderlying(
              callOptions?.sort(
                (a, b) =>
                  b?.market_data?.bid_price *
                    optionContract?.[b?.underlying_info?.instrument_key]
                      ?.lot_size -
                  a?.market_data?.bid_price *
                    optionContract?.[a?.underlying_info?.instrument_key]?.lot_size
              )
            )
          );
        putOptions &&
          setPutOptions(
            filterUniqueUnderlying(
              putOptions?.sort(
                (a, b) =>
                  b?.market_data?.bid_price *
                    optionContract?.[b?.underlying_info?.instrument_key]
                      ?.lot_size -
                  a?.market_data?.bid_price *
                    optionContract?.[a?.underlying_info?.instrument_key]?.lot_size
              )
            )
          );
      })
      .catch((error) => {
        console.error("Error:", error);
        setLoadingChain(false);
        setError("Something went wrong");
      });
  }
  async function getOptionChainMargin(options) {    
    const instruments = options?.map((fo) => ({
      instrument_key: fo?.instrument_key,
      quantity: optionContract?.[fo?.underlying_info?.instrument_key]?.lot_size,
      transaction_type: "SELL",
      product: "D",
    }));
    const marginPromise = [];
    if (options?.length > 0) {
      while (instruments?.length > 0) {
        const slicedInstruments = instruments?.splice(0, 20);

        const data = {
          instruments: slicedInstruments,
        };
        marginPromise.push(
          limiter.schedule(() =>
            axios.post(`${baseUrl}${marginUrl}`, data, { headers })
          )
        );
      }
      Promise.allSettled(marginPromise)
        .then((responses) => {
          const margins = responses?.filter((c)=>c?.status==='fulfilled')
            ?.map((res) => res?.value?.data?.data?.margins)
            ?.flat();
          setOptionChainMargin(
            margins
              ?.map((margin, index) => {
                return {
                  ...margin,
                  ...options[index],
                  maxProfit: (
                    options[index]?.market_data?.bid_price *
                    optionContract?.[
                      options?.[index]?.underlying_info?.instrument_key
                    ]?.lot_size
                  ).toFixed(2),
                  maxProfitPercentage: (
                    ((options[index]?.market_data?.bid_price *
                      optionContract?.[
                        options?.[index]?.underlying_info?.instrument_key
                      ]?.lot_size) /
                      margin?.total_margin) *
                    100
                  ).toFixed(2),
                };
              })
              ?.sort((a, b) => b?.maxProfitPercentage - a?.maxProfitPercentage)
          );
          setLoadingChain(false);
        })
        .catch((error) => {
          console.log(error);
          setLoadingChain(false);
          setError("Something went wrong");
        });
    }
  }

  useEffect(() => {
    getExpirtDates();
  }, []);
  useEffect(() => {
    const optionContractData = localStorage.getItem("option_contract");
    if (!optionContractData && expiry) {
      const optionContractPromise = AllFNO?.map((n50) =>
        limiter.schedule(() =>
          axios?.get(
            `${baseUrl}${contractUrl}?instrument_key=${n50?.instrument_key}&expiry_date=${expiry}`,
            { headers }
          )
        )
      );
      Promise.allSettled(optionContractPromise)
        .then((responses) => {
          const chainData = {};
          responses?.filter((c)=>c?.status==='fulfilled').forEach((contract) => {
            chainData[contract?.value?.data?.data[0]?.underlying_key] = {
              lot_size: contract?.value?.data?.data?.[0]?.lot_size,
            };
          });
          localStorage.setItem("option_contract", JSON.stringify(chainData));
          setOptionContract(chainData);
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    } else {
      setOptionContract(JSON.parse(optionContractData));
    }
  }, [expiry]);
  useEffect(() => {
    if (expiry && !callOptions && !putOptions) {
      getOptionChainData();
    }
  }, [expiry]);

  useEffect(() => {
    if (callOptions && putOptions && optionContract) {
      getOptionChainMargin([...callOptions, ...putOptions]);
    }
  }, [callOptions, putOptions, optionContract]);
  useEffect(() => {
    if (optionChainMargin) {
      setFilteredOptionsMargin(
        optionChainMargin?.filter((ocm) => ocm?.instrument_type === activeTab)
      );
    }
  }, [optionChainMargin, activeTab]);

  return (
    <div className="container max-w-lg mx-auto p-4 bg-white text-gray-900 shadow-md rounded-md border border-gray-200">
      {loading ? (
        <div className="flex justify-center items-center py-6">
          <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="sticky top-0 bg-white z-10 shadow-md p-2 rounded-md mb-4 flex">
            <button
              onClick={() => setActiveTab("CE")}
              className={`w-1/2 text-center py-2 rounded-md ${
                activeTab === "CE" ? "bg-blue-500 text-white" : "text-blue-500"
              }`}
            >
              Call
            </button>
            <button
              onClick={() => setActiveTab("PE")}
              className={`w-1/2 text-center py-2 rounded-md ${
                activeTab === "PE" ? "bg-red-500 text-white" : "text-red-500"
              }`}
            >
              Put
            </button>
          </div>

          <div className="container max-w-lg mb-4 flex items-center gap-1">
            <input
              type="number"
              value={lotSize}
              onChange={(e) =>{ setLotSize(e.target.value); localStorage.setItem('lot_size', e.target.value)}}
              className="bg-gray-100 text-gray-700 px-3 py-2 border border-gray-300 rounded-md w-15"
              placeholder="Lot Size"
            />
            <select
              value={instruments}
              onChange={(e) => setInstruments(e.target.value)}
              className="bg-gray-100 text-gray-700 px-3 py-2 border border-gray-300 rounded-md"
            >
              {INSTRUMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              className="bg-gray-100 text-gray-700 px-3 py-2 border border-gray-300 rounded-md"
            >
              {expiryDates?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              onClick={getOptionChainData}
              className="bg-gray-100 text-gray-700 px-3 py-2 border border-gray-300 rounded-md flex items-center gap-1"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {loadingChain ? (
            <div className="flex justify-center items-center py-6">
              <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !error ? (
            <div>
              {filteredOptionsMargin?.map((option, index) => (
                <div key={index} className="border-b border-gray-200 py-2">
                  <button
                    className="w-full flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
                    onClick={() => toggleAccordion(index)}
                  >
                    <span className="font-medium text-gray-900">
                      {`${option?.underlying_info?.tradingsymbol} ${option?.strike_price} ${activeTab}  ${option?.expiry}`}
                    </span>
                    <span className="font-medium text-green-600 text-right">
                      MP: ₹
                      {option?.maxProfit + `(${option?.maxProfitPercentage}%)`}
                      {getDiffFromStrike(
                        option?.instrument_type,
                        option?.underlying_spot_price,
                        option?.strike_price
                      )}
                    </span>
                    {openAccordions[index] ? (
                      <ChevronUp size={20} className="text-blue-500" />
                    ) : (
                      <ChevronDown size={20} className="text-blue-500" />
                    )}
                  </button>
                  {openAccordions[index] && (
                    <div className="p-4 bg-gray-100 rounded-md mt-2 border border-gray-300 shadow-sm">
                      <p className="text-lg font-semibold text-blue-900">
                        Market Data
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <p>LTP: ₹{option.market_data.ltp}</p>
                        <p>Close: ₹{option.market_data.close_price}</p>
                        <p>Volume: {option.market_data.volume}</p>
                        <p>OI: {option.market_data.oi}</p>
                        <p>
                          Bid: ₹{option.market_data.bid_price} (
                          {option.market_data.bid_qty})
                        </p>
                        <p>
                          Ask: ₹{option.market_data.ask_price} (
                          {option.market_data.ask_qty})
                        </p>
                      </div>
                      <p className="text-lg font-semibold text-blue-900 mt-4">
                        Option Greeks
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <p>IV: {option.option_greeks.iv}%</p>
                        <p>Delta: {option.option_greeks.delta}</p>
                        <p>Gamma: {option.option_greeks.gamma}</p>
                        <p>Theta: {option.option_greeks.theta}</p>
                        <p>Vega: {option.option_greeks.vega}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border-b border-gray-200 py-2">
              <h3>{error}</h3>
            </div>
          )}
        </>
      )}
    </div>
  );
}
