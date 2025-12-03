import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Menu from './pages/Menu';
import About from './pages/About';
import CollegeMenus from './pages/CollegeMenus';
import DiningHalls from './pages/DiningHalls';
import MenuDetail from './pages/MenuDetail';
import Favorite from './pages/Favorite';


function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/about" element={<About />} />
        <Route path="/college-menus" element={<CollegeMenus />} />
        <Route path="/dining-halls" element={<DiningHalls />} />
        <Route path="/menu/:diningHallName" element={<MenuDetail />} />
        <Route path="/favorites" element={<Favorite />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
