import React from 'react';
import './loadingOverlay.css';

const LoadingOverlay = ({ message = 'Loading...' }) => {
    return (
        <div className="loading-overlay">
            <div className="loading-modal">
                <div className="loading-spinner"></div>
                <p className="loading-message">{message}</p>
            </div>
        </div>
    );
};

export default LoadingOverlay;