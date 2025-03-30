import React, { useState, useEffect } from "react";
import { db, auth } from "../firebaseConfig";
import { ref, push, onValue, remove, set } from "firebase/database";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import "./Admin.css";

const Admin = () => {
    const navigate = useNavigate();
    const [sales, setSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [saleEntries, setSaleEntries] = useState([{ productName: "", price: "" }]);
    const [view, setView] = useState("sales"); // Toggle between 'sales' and 'products'
    const [newProduct, setNewProduct] = useState({ name: "", price: "" });
    const [dailyTotal, setDailyTotal] = useState(0);
    const [todayDate, setTodayDate] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [editSaleData, setEditSaleData] = useState(null);
    const [selectedDate, setSelectedDate] = useState("today"); // 'today', 'yesterday', 'custom'
    const [customDate, setCustomDate] = useState("");

    useEffect(() => {
        const today = new Date();
        setTodayDate(today.toLocaleDateString());
        setCustomDate(formatDateForInput(today));

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
                
                // Calculate today's total
                const todaySales = salesArray.filter(sale => {
                    const saleDate = new Date(sale.timestamp).toLocaleDateString();
                    return saleDate === today.toLocaleDateString();
                });
                
                const total = todaySales.reduce((sum, sale) => {
                    const saleTotal = sale.entries.reduce((saleSum, entry) => saleSum + parseFloat(entry.price || 0), 0);
                    return sum + saleTotal;
                }, 0);
                
                setDailyTotal(total);
            } else {
                setSales([]);
                setDailyTotal(0);
            }
        });

        const productsRef = ref(db, "products");
        onValue(productsRef, (snapshot) => {
            const data = snapshot.val();
            setProducts(data ? Object.entries(data).map(([id, val]) => ({ id, ...val })) : []);
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

    const handleAddSaleEntry = () => {
        setSaleEntries([...saleEntries, { productName: "", price: "" }]);
    };

    const handleChange = (index, field, value) => {
        const newEntries = [...saleEntries];
        newEntries[index][field] = value;
        setSaleEntries(newEntries);
    };

    const handleDeleteSaleEntry = (index) => {
        const newEntries = [...saleEntries];
        newEntries.splice(index, 1);
        // Ensure there's at least one entry form
        if (newEntries.length === 0) {
            newEntries.push({ productName: "", price: "" });
        }
        setSaleEntries(newEntries);
    };

    const handleSelectProduct = (product) => {
        setSaleEntries((prevEntries) => {
            const newEntry = { productName: product.name, price: product.price };
            return prevEntries.some(entry => entry.productName === "") 
                ? prevEntries.map(entry => (entry.productName === "" ? newEntry : entry)) 
                : [...prevEntries, newEntry];
        });
    };

    const handleSubmit = () => {
        const validEntries = saleEntries.filter(entry => entry.productName.trim() !== "");
        if (validEntries.length === 0) return;
        
        // Calculate total for this sale
        const total = validEntries.reduce((sum, entry) => sum + parseFloat(entry.price || 0), 0);
        
        if (editMode && editSaleData) {
            // Update existing sale with the original timestamp
            set(ref(db, `sales/${editSaleData.id}`), {
                timestamp: editSaleData.timestamp,
                entries: validEntries,
                total: total
            });
            setEditMode(false);
            setEditSaleData(null);
        } else {
            // Create new sale
            push(ref(db, "sales"), { 
                timestamp: Date.now(), 
                entries: validEntries,
                total: total
            });
        }
        
        setSaleEntries([{ productName: "", price: "" }]);
    };

    const handleAddProduct = () => {
        if (newProduct.name.trim() && newProduct.price.trim()) {
            push(ref(db, "products"), newProduct);
            setNewProduct({ name: "", price: "" });
        }
    };

    const handleDeleteProduct = (id) => {
        remove(ref(db, `products/${id}`));
    };

    const handleDeleteSale = (id) => {
        remove(ref(db, `sales/${id}`));
    };

    const handleModifySale = (sale) => {
        // Set the current entries to the form for modification
        setSaleEntries(sale.entries);
        // Store the original sale data
        setEditSaleData(sale);
        // Enable edit mode
        setEditMode(true);
        // Switch to sales view if not already there
        setView("sales");
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        setEditSaleData(null);
        setSaleEntries([{ productName: "", price: "" }]);
    };

    const handleLogout = () => {
        signOut(auth).then(() => navigate("/"));
    };

    // Date selection handlers
    const handleDateSelection = (option) => {
        setSelectedDate(option);
    };

    const handleCustomDateChange = (e) => {
        setCustomDate(e.target.value);
        setSelectedDate("custom");
    };

    // Get the date to display based on selection
    const getDisplayDate = () => {
        if (selectedDate === "today") {
            return new Date().toLocaleDateString();
        } else if (selectedDate === "yesterday") {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday.toLocaleDateString();
        } else if (selectedDate === "dayBefore") {
            const dayBefore = new Date();
            dayBefore.setDate(dayBefore.getDate() - 2);
            return dayBefore.toLocaleDateString();
        } else if (selectedDate === "custom" && customDate) {
            return new Date(customDate).toLocaleDateString();
        }
        return todayDate;
    };

    // Filter sales by selected date
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
            return dailyTotal;
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

    // Group sales by date
    const salesByDate = sales.reduce((acc, sale) => {
        const date = new Date(sale.timestamp).toLocaleDateString();
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(sale);
        return acc;
    }, {});

    // Calculate total for all sales
    const allTotal = sales.reduce((sum, sale) => {
        return sum + (sale.total || sale.entries.reduce((saleSum, entry) => saleSum + parseFloat(entry.price || 0), 0));
    }, 0);

    // Get the sales data to display based on filter
    const salesDataToDisplay = selectedDate === "all" ? salesByDate : getFilteredSales();
    const selectedDateTotal = getSelectedDateTotal();

    return (
        <div className="admin-container">
          <div className="header">
            <h1>Admin Panel</h1>
            <button onClick={handleLogout}>Logout</button>
          </div>
            <div className="navigation-buttons">
                {/* <button onClick={handleLogout}>Logout</button> */}
                <button onClick={() => setView("products")}>Products</button>
                <button onClick={() => setView("sales")}>Sales</button>
            </div>
            
            {view === "sales" && (
                <>
                    <div className="card">
                        <h2>{editMode ? "Edit Sale" : "Add Sale"}</h2>
                        <div className="products-list">
                            {products.map((product) => (
                                <button 
                                    key={product.id} 
                                    onClick={() => handleSelectProduct(product)}
                                    className="product-button"
                                >
                                    {product.name} - ₹{product.price}
                                </button>
                            ))}
                        </div>
                        {saleEntries.map((entry, index) => (
                            <div key={index} className="input-row">
                                <input
                                    type="text"
                                    placeholder="Product Name"
                                    value={entry.productName}
                                    onChange={(e) => handleChange(index, "productName", e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="Price"
                                    value={entry.price}
                                    onChange={(e) => handleChange(index, "price", e.target.value)}
                                />
                                {/* Only show delete button if the row has content or there are multiple entries */}
                                {(saleEntries.length > 1 || entry.productName.trim() !== '' || entry.price.trim() !== '') && (
                                    <button 
                                        onClick={() => handleDeleteSaleEntry(index)}
                                        className="btn-danger"
                                    >
                                        Delete
                                    </button>
                                )}
                            </div>
                        ))}
                        <div className="form-actions">
                            <button onClick={handleAddSaleEntry}>Add More</button>
                            <button onClick={handleSubmit} className="btn-success">
                                {editMode ? "Update Sale" : "Submit Sale"}
                            </button>
                            {editMode && (
                                <button onClick={handleCancelEdit} className="btn-warning">
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="card">
                        <div className="sales-header">
                            <h2>Sales Records</h2>
                            <div className="date-filter">
                                <div className="totals-row">
                                    All Total = ₹{allTotal.toFixed(2)} 
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
                        
                        {Object.keys(salesDataToDisplay).map(date => (
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
                                                <th>Actions</th>
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
                                                        <td>
                                                            <button 
                                                                onClick={() => handleModifySale(sale)} 
                                                                className="btn-warning"
                                                            >
                                                                Modify
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteSale(sale.id)} 
                                                                className="btn-danger"
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {view === "products" && (
                <div className="card">
                    <h2>Products Management</h2>
                    <div className="add-product-form">
                        <input
                            type="text"
                            placeholder="Product Name"
                            value={newProduct.name}
                            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        />
                        <input
                            type="number"
                            placeholder="Price"
                            value={newProduct.price}
                            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                        />
                        <button onClick={handleAddProduct} className="btn-success">Add Product</button>
                    </div>
                    
                    <h3>Products List</h3>
                    <table className="products-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Price</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => (
                                <tr key={product.id}>
                                    <td>{product.name}</td>
                                    <td>₹{product.price}</td>
                                    <td>
                                        <button 
                                            onClick={() => handleDeleteProduct(product.id)}
                                            className="btn-danger"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Admin;