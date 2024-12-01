import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ImageUpload.css';

function ImageUpload() {
    const [file, setFile] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post('http://localhost:5000/api/upload', formData, {
                headers: { 
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                },
            });

            // Sort the results by confidence scores in ascending order
            const sortedResults = response.data.diagnosis;
            setResults(sortedResults);

        } catch (error) {
            console.error('Error:', error);
            setResults([{ label: 'Error processing image', score: 0 }]);
        }
        setLoading(false);
    };

    return (
        
        <div className="upload-container">
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <h2>Plant Disease Detection</h2>
            <form onSubmit={handleSubmit}>
                <input type="file" onChange={handleFileChange} />
                <button type="submit" disabled={loading}>Upload</button>
            </form>
            {loading && <p>Loading...</p>}
            <div className="results-container">
                {results.map((result, index) => (
                    <div key={index} className="result-box">
                        <h3>{result.label}</h3>
                        <p>Confidence: {(result.score * 100).toFixed(2)}%</p>                       
                    </div>
                ))}
            </div>

        </div>
    );
}

export default ImageUpload;