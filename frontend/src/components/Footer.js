import React from 'react';
import '../styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>UCSC Dining</h3>
          <p>Your guide to campus dining halls and menus</p>
        </div>
        
        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="https://dining.ucsc.edu/" target="_blank" rel="noopener noreferrer">Official UCSC Dining</a></li>
            <li><a href="https://nutrition.sa.ucsc.edu/" target="_blank" rel="noopener noreferrer">Nutrition Services</a></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Information</h4>
          <ul>
            <li>Menu data updated daily</li>
            <li>Ratings powered by student feedback</li>
            <li>Dietary info provided for your safety</li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h4>Contact</h4>
          <p>Questions or feedback?</p>
          <p>Contact UCSC Dining Services</p>
          <p className="footer-phone">📞 (831) 459-2691</p>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} UCSC Dining Menu App. Made with 💙 for Slugs.</p>
        <p className="footer-disclaimer">Nutritional information is approximate. Please verify with dining staff for allergen concerns.</p>
      </div>
    </footer>
  );
};

export default Footer;
