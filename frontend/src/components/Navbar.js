import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import logo from '../slug-grub-logo-h40.png';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-links">
        <Link to="/" className="nav-link logo-link">
          <img src={logo} width="50" height="auto" alt="Logo" className="logo-img" />
        </Link>
        
        <SearchBar />
        
        <Link to="/favorites" className="nav-link" style={{ fontFamily: 'monospace' }}>
          Favorites
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;