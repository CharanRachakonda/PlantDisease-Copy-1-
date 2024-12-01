import './style3.css';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, NavLink } from 'react-router-dom';

const HistoryPage = () => {
  const [diagnosisHistory, setDiagnosisHistory] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDiagnosisHistory = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found. Please log in again.');
        navigate('/login'); // Redirect to login if token is missing
        return;
      }

      try {
        const response = await axios.get('http://localhost:5000/diagnosis-history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDiagnosisHistory(response.data);
      } catch (error) {
        console.error('Error fetching diagnosis history:', error);
      }
    };

    fetchDiagnosisHistory();
  }, [navigate]);

  return (
    <div className="container">
      <aside className="sidebar">
        <h1>CallDash</h1>
        <ul>
          <li><NavLink to="/dashboard">Dashboard</NavLink></li>
          <li><NavLink to="/history">History</NavLink></li>
          <li><NavLink to="/team">Team</NavLink></li>
          <li><NavLink to="/pricing">Pricing</NavLink></li>
          <li><NavLink to="/support">Support</NavLink></li>
        </ul>
      </aside>
      <main>
        <header>
          <h2>History</h2>
          <div className="user-profile">
            <img src="https://via.placeholder.com/40" alt="User" />
          </div>
        </header>
        <section className="cards">
          {diagnosisHistory.length > 0 ? (
            diagnosisHistory.map((record) => (
              <div key={record._id} className="history-item card">
                <img
                  src={record.imageUrl || "https://via.placeholder.com/200"} // Updated field
                  alt="Diagnosis"
                  style={{ maxWidth: '200px', maxHeight: '200px' }}
                />
                <div className="history-details">
                  {record.diagnosis.map((result, diagnosisIndex) => (
                    <div key={diagnosisIndex}>
                      <p>
                        {result.label}: {(result.score * 100).toFixed(2)}%
                      </p>
                    </div>
                  ))}
                  <p>Date: {new Date(record.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))
          ) : (
            <p>No diagnosis history found.</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default HistoryPage;
