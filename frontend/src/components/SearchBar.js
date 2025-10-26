import { useState } from 'react';

function SearchBar() {
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className = "search-container">
            <input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
                style = {{fontFamily: 'monospace'}}
            />
        </div>
    );
}

export default SearchBar;