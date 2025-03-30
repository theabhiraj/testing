import React, { useEffect, useState } from "react";
import { db } from "../firebaseConfig";
import { ref, onValue } from "firebase/database";
import { useNavigate } from "react-router-dom";
import "./Admin.css"; // Reusing the same CSS from Admin page

const Home = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedDate, setSelectedDate] = useState("all"); // Default to showing all sales
  const [customDate, setCustomDate] = useState("");
  const [todayDate, setTodayDate] = useState("");
  const [allTotal, setAllTotal] = useState(0);

  useEffect(() => {
    const today = new Date();
    setTodayDate(today.toLocaleDateString());
    setCustomDate(formatDateForInput(today));

    // Fetch products from Firebase
    const productsRef = ref(db, "products");
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setProducts(Object.entries(data).map(([id, val]) => ({ id, ...val })));
      } else {
        setProducts([]);
      }
    });

    // Fetch sales from Firebase
    const salesRef = ref(db, "sales");
    onValue(salesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert to array with IDs and sort by timestamp descending (newest first)
        const salesArray = Object.entries(data).map(([id, val]) => ({
          id,
          ...val
        }));
        salesArray.sort((a, b) => b.timestamp - a.timestamp);
        setSales(salesArray);
        
        // Calculate total for all sales
        const total = salesArray.reduce((sum, sale) => {
          return sum + (sale.total || sale.entries.reduce((saleSum, entry) => saleSum + parseFloat(entry.price || 0), 0));
        }, 0);
        
        setAllTotal(total);
      } else {
        setSales([]);
        setAllTotal(0);
      }
    });
  }, []);

  // Format date for the date input field
  const formatDateForInput = (date) => {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    
    return [year, month, day].join('-');
  };

  // Date selection handlers
  const handleDateSelection = (option) => {
    setSelectedDate(option);
  };

  const handleCustomDateChange = (e) => {
    setCustomDate(e.target.value);
    setSelectedDate("custom");
  };

  // Group sales by date
  const salesByDate = sales.reduce((acc, sale) => {
    const date = new Date(sale.timestamp).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(sale);
    return acc;
  }, {});

  // Get filtered sales by selected date
  const getFilteredSales = () => {
    let targetDate;
    
    if (selectedDate === "today") {
      targetDate = new Date().toLocaleDateString();
    } else if (selectedDate === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      targetDate = yesterday.toLocaleDateString();
    } else if (selectedDate === "dayBefore") {
      const dayBefore = new Date();
      dayBefore.setDate(dayBefore.getDate() - 2);
      targetDate = dayBefore.toLocaleDateString();
    } else if (selectedDate === "custom" && customDate) {
      targetDate = new Date(customDate).toLocaleDateString();
    } else {
      // If no valid selection, return all sales grouped by date
      return salesByDate;
    }
    
    // Filter sales for the target date
    const filteredSales = sales.filter(sale => {
      const saleDate = new Date(sale.timestamp).toLocaleDateString();
      return saleDate === targetDate;
    });
    
    // Format as an object with the date as key
    const result = {};
    if (filteredSales.length > 0) {
      result[targetDate] = filteredSales;
    } else {
      result[targetDate] = [];
    }
    
    return result;
  };

  // Calculate total for selected date
  const getSelectedDateTotal = () => {
    let targetDate;
    
    if (selectedDate === "today") {
      targetDate = new Date().toLocaleDateString();
    } else if (selectedDate === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      targetDate = yesterday.toLocaleDateString();
    } else if (selectedDate === "dayBefore") {
      const dayBefore = new Date();
      dayBefore.setDate(dayBefore.getDate() - 2);
      targetDate = dayBefore.toLocaleDateString();
    } else if (selectedDate === "custom" && customDate) {
      targetDate = new Date(customDate).toLocaleDateString();
    } else {
      return 0;
    }
    
    // Calculate total for the filtered sales
    return sales
      .filter(sale => new Date(sale.timestamp).toLocaleDateString() === targetDate)
      .reduce((sum, sale) => {
        return sum + (sale.total || sale.entries.reduce((saleSum, entry) => saleSum + parseFloat(entry.price || 0), 0));
      }, 0);
  };

  // Get the sales data to display based on filter
  const salesDataToDisplay = selectedDate === "all" ? salesByDate : getFilteredSales();
  const selectedDateTotal = getSelectedDateTotal();

  return (
    <div className="admin-container">
      <div className="header">
        <h1>Sales Dashboard</h1>
        
        <div className="navigation-buttons">
          <button onClick={() => navigate("/login")}>Admin Login</button>
        </div>
      </div>

      <div className="card">
        <div className="sales-header">
          <h2>Sales Records</h2>
          <div className="date-filter">
            <div className="totals-row">
              All Sales Total = ₹{allTotal.toFixed(2)} 
              {selectedDate !== "all" && (
                <span className="selected-date-total">
                  &nbsp;{"| "}{selectedDate === "today" ? "Today" : 
                       selectedDate === "yesterday" ? "Yesterday" : 
                       selectedDate === "dayBefore" ? "Day Before Yesterday" : 
                       new Date(customDate).toLocaleDateString()} Total: ₹{selectedDateTotal.toFixed(2)}
                </span>
              )}
            </div>
            <div className="date-selector">
              <span>Select Date: </span>
              <button 
                onClick={() => handleDateSelection("today")}
                className={selectedDate === "today" ? "date-btn active" : "date-btn"}
              >
                Today
              </button>
              <button 
                onClick={() => handleDateSelection("yesterday")}
                className={selectedDate === "yesterday" ? "date-btn active" : "date-btn"}
              >
                -1 Day
              </button>
              <button 
                onClick={() => handleDateSelection("dayBefore")}
                className={selectedDate === "dayBefore" ? "date-btn active" : "date-btn"}
              >
                -2 Days
              </button>
              <button 
                onClick={() => handleDateSelection("all")}
                className={selectedDate === "all" ? "date-btn active" : "date-btn"}
              >
                All
              </button>
              <input 
                type="date" 
                value={customDate}
                onChange={handleCustomDateChange}
                className="date-input"
              />
            </div>
          </div>
        </div>
        
        {Object.keys(salesDataToDisplay).length === 0 ? (
          <p className="no-data">No sales data available</p>
        ) : (
          Object.keys(salesDataToDisplay).map(date => (
            <div key={date}>
              <div className="date-header">
                <h3>
                  {date === todayDate ? "Today" : 
                   date === new Date(Date.now() - 86400000).toLocaleDateString() ? "Yesterday" : 
                   date === new Date(Date.now() - 172800000).toLocaleDateString() ? "Day Before Yesterday" : 
                   date}
                </h3>
              </div>
              
              {salesDataToDisplay[date].length === 0 ? (
                <p className="no-data">No sales data for this date</p>
              ) : (
                <table className="sales-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Items</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesDataToDisplay[date].map((sale) => {
                      const saleTotal = sale.total || sale.entries.reduce(
                        (sum, entry) => sum + parseFloat(entry.price || 0), 0
                      );
                      
                      return (
                        <tr key={sale.id}>
                          <td>{new Date(sale.timestamp).toLocaleTimeString()}</td>
                          <td>
                            <ul className="items-list">
                              {sale.entries.map((entry, idx) => (
                                <li key={idx}>{entry.productName} - ₹{entry.price}</li>
                              ))}
                            </ul>
                          </td>
                          <td>₹{saleTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </div>

      {/* <div className="card">
        <h2>Available Products</h2>
        <table className="products-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="2" className="no-data">No products available</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>₹{product.price}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div> */}
    </div>
  );
};

export default Home;