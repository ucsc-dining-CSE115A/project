import { Link } from 'react-router-dom';

function Home() {
  // Map display names to actual JSON keys
  const diningHalls = [
    { display: 'JRL/C9', key: 'John R. Lewis & College Nine Dining Hall' },
    { display: 'Cowell/Stevenson', key: 'Cowell & Stevenson Dining Hall' },
    { display: 'Crown/Merrill', key: 'Crown & Merrill Dining Hall' },
    { display: 'Porter/Kresge', key: 'Porter & Kresge Dining Hall' },
    { display: 'RC/Oakes', key: 'Rachel Carson & Oakes Dining Hall' }
  ];

  const cafes = [
    { display: 'Oakes Cafe', key: 'Oakes Cafe' },
    { display: 'Global Village Cafe', key: 'Global Village Cafe' },
    { display: 'Owl\'s Nest Cafe', key: 'Owl\'s Nest Cafe' },
    { display: 'Stevenson Coffee House', key: 'Stevenson Coffee House' },
    { display: 'Perk Coffee Bar', key: 'Perk Coffee Bar' },
    { display: 'Banana Joe\'s Cafe', key: 'Banana Joe\'s Cafe' }
  ];

  return (
    <div className="home-container">
      <h1 className="dining-halls-page-title">Dining Halls</h1>
      <div className="dining-halls-grid">
        {diningHalls.map((hall, index) => (
          <Link key={index} to={`/menu/${encodeURIComponent(hall.key)}`}>
            <div className="dining-hall-card">
              <h2>{hall.display}</h2>
            </div>
          </Link>
        ))}
      </div>
      
      <h1 className="dining-halls-page-title">Cafes</h1>
      <div className="dining-halls-grid">
        {cafes.map((cafe, index) => (
          <Link key={index} to={`/menu/${encodeURIComponent(cafe.key)}`}>
            <div className="dining-hall-card">
              <h2>{cafe.display}</h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Home;