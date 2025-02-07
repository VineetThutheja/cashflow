import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getDiffFromStrike, mergeDataOptimized } from "../utils";
import Nifty50 from "../data/nifty_50.json";
import AllFNO from "../data/allfno.json";
import axios from "axios";
import pLimit from "p-limit";
import Bottleneck from "bottleneck";

const SORT_OPTIONS = [
  { label: "Nifty 50", value: "nifty_50" },
  { label: "All FNO", value: "all_fno" },
];
const baseUrl = "https://api.upstox.com/v2";
const limit = pLimit(10);
const limiter = new Bottleneck({
  minTime: 50, // 200ms delay between requests (5 req/sec)
  maxConcurrent: 20 // Max 3 requests at a time
});
export default function OptionChain() {
  const [activeTab, setActiveTab] = useState("CE");
  const [openAccordions, setOpenAccordions] = useState({});
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState("nifty_5");
  const [sortOrder, setSortOrder] = useState("asc");
  const [optionContracts, setOptionContracts] = useState();
  const [optionChains, setOptionChains] = useState();
  const [filteredOptionsMargin, setFilteredOptionsMargin] = useState();
  const [filteredOptions, setFilteredOptions] = useState();
  const token = localStorage?.getItem("access_token");
  const contractUrl = "/option/contract";
  const chainUrl = "/option/chain";
  const marginUrl = "/charges/margin";
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    setLoading(true);
    const optionContractPromise = (sortKey==="nifty_50"?Nifty50:AllFNO)?.map((n50) =>
      limiter.schedule(() =>
        axios?.get(
          `${baseUrl}${contractUrl}?instrument_key=${
            n50?.instrument_key
          }&expiry_date=${"2025-02-27"}`,
          { headers }
        )
      )
    );
    Promise.all(optionContractPromise)
      .then((responses) => {
        setOptionContracts(
          responses?.map((response) => response?.data?.data).flat()
        );
        console.log("contract", responses);
        
      })
      .catch((error) => {
        console.error("Error:", error);
      });
    const optionChainPromise = (sortKey==="nifty_50"?Nifty50:AllFNO)?.map((n50) =>
      limiter.schedule(() =>
        axios?.get(
          `${baseUrl}${chainUrl}?instrument_key=${
            n50?.instrument_key
          }&expiry_date=${"2025-02-27"}`,
          { headers }
        )
      )
    );
    Promise.all(optionChainPromise)
      .then((responses) => {
        console.log("chain", responses);
        
        setOptionChains(
          responses?.map((response) => response?.data?.data).flat()
        );
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }, [sortKey, activeTab]);
  useEffect(() => {
    setLoading(true);
    const optionsData =
      mergeDataOptimized(optionContracts, optionChains, 15) || [];

    setFilteredOptions(
      optionsData?.filter((option) => option.instrument_type === activeTab)
    );
  }, [optionChains, optionContracts]);

  const toggleAccordion = (index) => {
    setOpenAccordions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  useEffect(() => {
    const instruments = filteredOptions?.map((fo) => ({
      instrument_key: fo?.instrument_key,
      quantity: fo?.lot_size,
      transaction_type: "SELL",
      product: "D",
    }));

    const marginPromise = [];
    if (filteredOptions?.length > 0) {
      while (instruments?.length > 0) {
        const slicedInstruments = instruments?.splice(0, 20);

        const data = {
          instruments: slicedInstruments,
        };
        marginPromise.push(
          axios.post(`${baseUrl}${marginUrl}`, data, { headers })
        );

        Promise.all(marginPromise)
          .then((responses) => {
            const marginsData = responses
              ?.map((res) => res?.data?.data?.margins)
              ?.flat();
            setFilteredOptionsMargin(
              marginsData
                ?.map((md, index) => ({
                  ...md,
                  ...filteredOptions[index],
                  maxProfit: (
                    filteredOptions[index]?.market_data?.bid_price *
                    filteredOptions[index]?.lot_size
                  ).toFixed(2),
                  maxProfitPercentage: (
                    ((filteredOptions[index]?.market_data?.bid_price *
                      filteredOptions[index]?.lot_size) /
                      md?.total_margin) *
                    100
                  ).toFixed(2),
                }))
                ?.sort(
                  (a, b) => b?.maxProfitPercentage - a?.maxProfitPercentage
                )
            );
            setLoading(false);
          })
          .catch((error) => {
            console.log(error);
          });
      }
    }
  }, [filteredOptions]);

  return (
    <div className="max-w-lg mx-auto p-4 bg-white text-gray-900 shadow-md rounded-md mt-6 border border-gray-200">
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

          <div className="mb-4 flex items-center justify-between">
            <p className="text-gray-700 font-medium">Sort By:</p>
            <div className="flex items-center gap-2">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="bg-gray-100 text-gray-700 px-3 py-2 border border-gray-300 rounded-md"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="bg-gray-100 text-gray-700 px-3 py-2 border border-gray-300 rounded-md"
              >
                {sortOrder === "asc" ? "Ascending" : "Descending"}
              </button>
            </div>
          </div>

          <div>
            {filteredOptionsMargin?.map((option, index) => (
              <div key={index} className="border-b border-gray-200 py-2">
                <button
                  className="w-full flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-all"
                  onClick={() => toggleAccordion(index)}
                >
                  <span className="font-medium text-gray-900">
                    {option?.trading_symbol}
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
        </>
      )}
    </div>
  );
}
