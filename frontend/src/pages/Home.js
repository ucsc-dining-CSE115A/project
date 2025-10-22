// Home.js
import { Link } from 'react-router-dom';
function Home() {
  return (
    <div>
      <h1>Welcome to the UCSC Dining Menu!</h1>
      <Link to="/college-menus"><button>Menus for dining halls at different colleges</button></Link>
    </div>
  );
}

export default Home;
