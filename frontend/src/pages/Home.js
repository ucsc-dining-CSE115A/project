import { Link } from 'react-router-dom';

function Home() {
  const diningHalls = [
    'John R. Lewis & College Nine Dining Hall',
    'Cowell & Stevenson Dining Hall',
    'Crown & Merrill Dining Hall',
    'Porter & Kresge Dining Hall',
    'Rachel Carson & Oakes Dining Hall'
  ];

  return (
    <div className="home-container">
      <br />
      <h1 className="dining-halls-page-title">Dining Halls</h1>
      
      <div className="dining-halls-grid">
        {diningHalls.map((hall, index) => (
          <Link key={index} to={`/menu/${encodeURIComponent(hall)}`}>
            <div className="dining-hall-card">
              <h2>{hall.replace(' Dining Hall', '').replace(' & ', '/')}</h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Home;