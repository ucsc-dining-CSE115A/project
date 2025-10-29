import { Link } from 'react-router-dom';

function Home() {
  const diningHalls = [
    'JRL/C9',
    'Cowell/Stevenson',
    'Crown/Merrill',
    'Porter/Kresge',
    'RC/Oakes'
  ];
  const cafes = [
    'Oakes Cafe',
    'Global Village Cafe',
    'Owl\'s Nest Cafe',
    'Stevenson Coffee House',
    'Perk Coffee Bar',
    'Banana Joe\'s Cafe'

  ]

  return (
    <div className="home-container">
      <h1 className="dining-halls-page-title">Dining Halls</h1>
      <div className="dining-halls-grid">
        {diningHalls.map((hall, index) => (
          <Link key={index} to={`/menu/${hall}`}>
            <div className="dining-hall-card">
              <h2>{hall}</h2>
            </div>
          </Link>
        ))}
      </div>
      <div className="dining-halls-page-title">Cafes</div>
      <div className="dining-halls-grid">
        {cafes.map((cafe, index) => (
          <Link key={index} to={`/menu/${cafe}`}>
            <div className="dining-hall-card">
              <h2>{cafe}</h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Home;