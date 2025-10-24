import { Link } from 'react-router-dom';
function Home() {
  return (
    <div className="home-container">
      <h1 className="home-title">Welcome to the UCSC Dining Menu!</h1>
      <Link to="/dining-halls"><button className="choose-dining-hall-button">Choose Dining Hall</button></Link>
    </div>
  );
}

export default Home;
