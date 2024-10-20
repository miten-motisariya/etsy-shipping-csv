import React, { useState, useEffect, useCallback } from "react";  
import Papa from 'papaparse';
import { exportToShipGlobalCSV } from './csvUtils';
import { exportToShipRocketCSV } from './exportShipRocket';

const HomeComponent = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ country: '', startDate: '', endDate: '' });
    const [startInvoice, setStartInvoice] = useState(''); // Added state for startInvoice
    const [exportType, setExportType] = useState('');

    const applyFiltersAndSearch = useCallback(() => {
        let filteredData = orders;

        if (searchTerm) {
            filteredData = filteredData.filter(order =>
                (order.orderId ? order.orderId.toString().includes(searchTerm) : false) ||
                (order.fullName ? order.fullName.toLowerCase().includes(searchTerm.toLowerCase()) : false)
            );
        }

        if (filters.country) {
            filteredData = filteredData.filter(order =>
                order.country && order.country.toLowerCase().includes(filters.country.toLowerCase())
            );
        }

        if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            filteredData = filteredData.filter(order => {
                const orderDate = new Date(order.saleDate.split('/').reverse().join('/'));
                return orderDate >= startDate;
            });
        }

        if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            filteredData = filteredData.filter(order => {
                const orderDate = new Date(order.saleDate.split('/').reverse().join('/'));
                return orderDate <= endDate;
            });
        }

        setFilteredOrders(filteredData);
    }, [orders, searchTerm, filters]);

    useEffect(() => {
        applyFiltersAndSearch();
    }, [applyFiltersAndSearch]);

    useEffect(() => {
        // Update selected orders based on the current filtered orders
        const updatedSelectedOrders = new Set();
        filteredOrders.forEach(order => {
            if (selectedOrders.has(order.orderId)) {
                updatedSelectedOrders.add(order.orderId);
            }
        });
        setSelectedOrders(updatedSelectedOrders);
    }, [filteredOrders, selectedOrders]); // Include selectedOrders in dependency array

    const handleImport = ($event) => {
        const files = $event.target.files;
        if (files.length) {
            const file = files[0];
            Papa.parse(file, {
                header: true,
                // dynamicTyping: true,
                dynamicTyping: (field) => {
                    // Ensure that 'Order ID' and 'Zip Code' are not automatically parsed as numbers
                    return field !== 'Order ID' && field !== 'Ship Zipcode';
                },
                transform: (value, field) => {
                    // Ensure the 'Ship Zipcode' remains a string
                    if (field === 'Ship Zipcode') {
                        return value.toString().padStart(5, '0'); // Make sure the zip code is treated as a 5-character string
                    }
                    return value;
                },
                complete: (results) => {
                    const rows = results.data;
                    const validRows = rows.filter(row => Object.values(row).some(value => value !== null && value !== ''));
                    const selectedColumns = validRows.map(row => ({
                        saleDate: formatDate(row['Sale Date']),
                        orderId: row['Order ID'],
                        firstName: row['First Name'],
                        lastName: row['Last Name'],
                        fullName: row['Full Name'],
                        noOfItems: row['Number of Items'],
                        addressLine1: row['Street 1'],
                        addressLine2: row['Street 2'],
                        city: row['Ship City'],
                        state: row['Ship State'],
                        zipCode: row['Ship Zipcode'],
                        country: row['Ship Country'],
                        orderValue: row['Order Value'],
                        email: null,
                        mobileNo: null
                    }));
                    setOrders(selectedColumns);
                },
                error: (error) => {
                    console.error('Error parsing CSV:', error);
                }
            });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        return date.toLocaleDateString('en-GB');
    };

    const handleRowSelect = (orderId) => {
        const updatedSelectedOrders = new Set(selectedOrders);
        if (updatedSelectedOrders.has(orderId)) {
            updatedSelectedOrders.delete(orderId);
        } else {
            updatedSelectedOrders.add(orderId);
        }
        setSelectedOrders(updatedSelectedOrders);
    };

    const handleSelectAll = (event) => {
        if (event.target.checked) {
            const allOrderIds = filteredOrders.map(order => order.orderId);
            setSelectedOrders(new Set(allOrderIds));
        } else {
            setSelectedOrders(new Set());
        }
    };

    const handleExport = () => {

        if (!exportType) {
            alert('Please select an export type.');
            return;
        }
        if (!startInvoice) {
            alert('Please enter a Start Invoice number before exporting.'); // Display alert if startInvoice is empty
            return;
        }

        const exportData = filteredOrders.filter(order => selectedOrders.has(order.orderId));
        if (exportType === 'shipRocket') {
            exportToShipRocketCSV(exportData, startInvoice);
        } else if (exportType === 'shipGlobal') {
            exportToShipGlobalCSV(exportData, startInvoice);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sortedOrders = [...filteredOrders].sort((a, b) => {
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setFilteredOrders(sortedOrders);
    };

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleFilterChange = (event) => {
        const { name, value } = event.target;
        setFilters(prevFilters => ({ ...prevFilters, [name]: value }));
    };

    const handleClear = () => {
        setSearchTerm('');
        setFilters({ country: '', startDate: '', endDate: '' });
        setStartInvoice(''); // Clear startInvoice
    };

    return (
        <>
        <div className="container mt-5">
            <div className="row mb-4">
                <div className="col-md-4">
                    <div className="input-group">
                        {/* <div className="custom-file"> */}
                            <input 
                                type="file" 
                                className="form-control" 
                                id="inputGroupFile" 
                                required 
                                onChange={handleImport} 
                                accept=".csv"
                            />
                            {/* <label className="input-group-text" htmlFor="inputGroupFile">Choose file</label> */}
                        </div>
                    {/* </div> */}
                </div>
                <div className="col-md-4 text-end">
                    <select
                        className={`form-select ${!exportType ? 'is-invalid' : ''}`}
                        value={exportType}
                        onChange={(e) => setExportType(e.target.value)}
                    >
                        <option value="">Select Export Type</option>
                        <option value="shipRocket">Ship Rocket</option>
                        <option value="shipGlobal">Ship Global</option>
                    </select>
                </div>
                <div className="col-md-4 text-end">
                    <button 
                        onClick={handleExport} 
                        className="btn btn-primary"
                    >
                        Export <i className="fa fa-download"></i>
                    </button>
                </div>
            </div>
    
            <div className="row mb-4">
                <div className="col-md-3">
                    <input 
                        type="text" 
                        placeholder="Search by Order ID or Full Name" 
                        value={searchTerm}
                        onChange={handleSearch}
                        className="form-control"
                    />
                </div>
                <div className="col-md-3">
                    <input 
                        type="text" 
                        name="country"
                        placeholder="Country" 
                        value={filters.country} 
                        onChange={handleFilterChange}
                        className="form-control"
                    />
                </div>
                <div className="col-md-3">
                    <input 
                        type="date" 
                        name="startDate"
                        value={filters.startDate} 
                        onChange={handleFilterChange}
                        className="form-control"
                    />
                </div>
                <div className="col-md-3">
                    <input 
                        type="date" 
                        name="endDate"
                        value={filters.endDate} 
                        onChange={handleFilterChange}
                        className="form-control"
                    />
                </div>
                <div className="col-md-3 mt-2">
                    <input 
                        type="text" 
                        name="startInvoice"
                        placeholder="Start Invoice" 
                        value={startInvoice} // Use startInvoice state
                        onChange={(e) => setStartInvoice(e.target.value)} // Update startInvoice state
                        className={`form-control ${!startInvoice ? 'is-invalid' : ''}`}
                    />
                </div>
            </div>

            <div className="row mb-4">
                <div className="col-md-3">
                    <button 
                        onClick={handleClear} 
                        className="btn btn-secondary"
                    >
                        Clear
                    </button>
                </div>
            </div>
    
            <div className="table-responsive">
                <table className="table table-striped">
                    <thead>
                        <tr>
                            <th scope="col">
                                <input
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length}
                                />
                            </th>
                            <th scope="col" onClick={() => handleSort('saleDate')}>Sale Date</th>
                            <th scope="col" onClick={() => handleSort('orderId')}>Order ID</th>
                            <th scope="col" onClick={() => handleSort('fullName')}>Full Name</th>
                            <th scope="col" onClick={() => handleSort('noOfItems')}>No Of Items</th>
                            <th scope="col" onClick={() => handleSort('addressLine1')}>Address Line 1</th>
                            <th scope="col" onClick={() => handleSort('addressLine2')}>Address Line 2</th>
                            <th scope="col" onClick={() => handleSort('city')}>City</th>
                            <th scope="col" onClick={() => handleSort('state')}>State</th>
                            <th scope="col" onClick={() => handleSort('zipCode')}>Zip Code</th>
                            <th scope="col" onClick={() => handleSort('country')}>Country</th>
                            <th scope="col" onClick={() => handleSort('orderValue')}>Order Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            filteredOrders.length
                                ? filteredOrders.map(order => (
                                    <tr key={order.orderId}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedOrders.has(order.orderId)}
                                                onChange={() => handleRowSelect(order.orderId)}
                                            />
                                        </td>
                                        <td>{order.saleDate}</td>
                                        <td>{order.orderId}</td>
                                        <td>{order.fullName}</td>
                                        <td>{order.noOfItems}</td>
                                        <td>{order.addressLine1}</td>
                                        <td>{order.addressLine2}</td>
                                        <td>{order.city}</td>
                                        <td>{order.state}</td>
                                        <td>{order.zipCode}</td>
                                        <td>{order.country}</td>
                                        <td>{order.orderValue}</td>
                                    </tr>
                                ))
                                : <tr>
                                    <td colSpan="12" className="text-center">No Orders Found.</td>
                                </tr>
                        }
                    </tbody>
                </table>
            </div>
        </div>
    </>
    );
};

export default HomeComponent;
