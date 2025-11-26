import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import MenuCard from '../components/MenuCard';
import MenuFilter from '../components/MenuFilter';
import TodayHours from '../components/TodayHours';
import CurrentMealBanner from '../components/CurrentMealBanner';
import { useCurrentMeal } from '../components/useCurrentMeal';
import { supabase } from '../supabaseClient';

function MenuDetail() {
  const { diningHallName } = useParams();
  const [menuData, setMenuData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showCalcModal, setShowCalcModal] = useState(false); // add calculator
  const [calcLoading, setCalcLoading] = useState(false); // calculator loadding
  const [calcError, setCalcError] = useState(null); // calculator error
  const [calcTotals, setCalcTotals] = useState(null); // 10 nutritional information items
  const [calcStats, setCalcStats] = useState({ selected: 0, aggregated: 0, missing: 0 }); //summary of selected items
  const [calcSelectedNames, setCalcSelectedNames] = useState([]); // Store the name of the selected items when calculate
  const macroCacheRef = useRef(new Map()); //cache for per-item macros

  const decodedName = decodeURIComponent(diningHallName);
  
  // Alias mapping to handle variations in data source keys (e.g., Crown/Merrill)
  // This maps route keys to actual keys present in menu_data.json when names differ
  const aliasMap = {
    "Crown & Merrill Dining Hall": "Crown & Merrill Dining Hall and Banana Joe's", // Map old key to current data key
  };

  const { sortedMeals } = useCurrentMeal(decodedName);

  useEffect(() => {
    const fetchMenuData = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://ucsc-dining-cse115a.github.io/project/menu_data.json');
        if (!response.ok) {
          throw new Error('Failed to fetch menu data');
        }
        const data = await response.json();
        setMenuData(data.halls || data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuData();
  }, []);

  //The background is blurred when the calculation pop-up window is opened
  useEffect(() => {
    if (showCalcModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => document.body.classList.remove('modal-open');
  }, [showCalcModal]);

  const organizeMenuByMealType = (menuDataForHall) => {
    // New JSON format: already an object keyed by meal (Breakfast, Lunch, etc.)
    if (
      menuDataForHall &&
      typeof menuDataForHall === 'object' &&
      !Array.isArray(menuDataForHall)
    ) {
      return menuDataForHall;
    }

    // Legacy flat array format (meal headers + items)
    const standardMealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Late Night'];
    const organizedMenu = {};
    const isMealType = (item) =>
      standardMealTypes.includes(item) || item.startsWith('Late Night @');

    let currentMealType = null;

    menuDataForHall.forEach((item) => {
      if (isMealType(item)) {
        currentMealType = item;
        organizedMenu[currentMealType] = [];
      } else if (currentMealType) {
        organizedMenu[currentMealType].push(item);
      }
    });

    return organizedMenu;
  };

  //extract numeric value from strings like "1.4g", "160mg"
  //Take only the numerical part ignore the %
  const extractNumber = (val) => {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim();
    const m = str.match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : 0;
  };

  // Fields involved in summation, exclude %only field, intotal 10 fields
  const SUM_FIELDS = [
    { key: 'calories', label: 'Calories', type: 'text' },
    { key: 'total_fat', label: 'Total Fat', type: 'json' },
    { key: 'sat_fat', label: 'Sat Fat', type: 'json' },
    { key: 'trans_fat', label: 'Trans Fat', type: 'json' },
    { key: 'cholesterol', label: 'Cholesterol', type: 'json' },
    { key: 'sodium', label: 'Sodium', type: 'json' },
    { key: 'total_carb', label: 'Total Carb', type: 'json' },
    { key: 'dietary_fiber', label: 'Dietary Fiber', type: 'json' },
    { key: 'sugars', label: 'Sugars', type: 'json' },
    { key: 'protein', label: 'Protein', type: 'json' },
  ];

  //unit for summed fields
  const SUM_UNITS = {
    total_fat: 'g',
    sat_fat: 'g',
    trans_fat: 'g',
    cholesterol: 'mg',
    sodium: 'mg',
    total_carb: 'g',
    dietary_fiber: 'g',
    sugars: 'g',
    protein: 'g',
  };

  //header for calculation summary, like "Two items are selected: A, B"
  const numberToWords = (n) => {
    const words = [
      'Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
      'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen','Twenty'
    ];
    return n >= 0 && n <= 20 ? words[n] : String(n);
  };

  const formatSelectionHeader = (names, count) => {
    const countWord = numberToWords(count);
    const itemLabel = count === 1 ? 'item' : 'items';
    const verb = count === 1 ? 'is' : 'are';
    return `${countWord} ${itemLabel} ${verb} selected: ${names.join(', ')}`;
  };

  // Retrieve the nutritional data for selected items from the macros table in Supabase for later use——summation
  const fetchMacrosForItem = async (itemName) => {
    if (!itemName) return null;
    const cache = macroCacheRef.current;
    if (cache.has(itemName)) return cache.get(itemName);
    try {
      // try exact match first
      const { data: exactData, error: exactErr } = await supabase
        .from('macros')
        .select('*')
        .eq('name', itemName)
        .single();

      if (!exactErr && exactData) {
        cache.set(itemName, exactData);
        return exactData;
      }

      //return exactData
      const { data: likeData, error: likeErr } = await supabase
        .from('macros')
        .select('*')
        .ilike('name', `%${itemName}%`)
        .limit(1);

      if (!likeErr && Array.isArray(likeData) && likeData.length > 0) {
        cache.set(itemName, likeData[0]);
        return likeData[0];
      }
    } catch (e) {
      //If match is not found, return null
    }
    return null;
  };

  //Sum 10 fields over a list of macro information
  const sumFields = (records) => {
    const totals = {};
    SUM_FIELDS.forEach(({ key }) => (totals[key] = 0));
    records.forEach((rec) => {
      if (!rec) return;
      SUM_FIELDS.forEach(({ key, type }) => {
        const raw = rec[key];
        if (type === 'json' && raw && typeof raw === 'object') {
          totals[key] += extractNumber(raw.amount);
        } else {
          totals[key] += extractNumber(raw);
        }
      });
    });
    return totals;
  };

  const filterItems = (items) => {
    if (selectedFilters.length === 0) {
      return items;
    }
    return items.filter(item => {
      const dietaryRestrictions = typeof item === 'object' ? item.dietary_restrictions : null;
      if (!dietaryRestrictions) {
        return false;
      }
      let restrictionsArray = [];
      if (Array.isArray(dietaryRestrictions)) {
        restrictionsArray = dietaryRestrictions;
      } else if (typeof dietaryRestrictions === 'string') {
        restrictionsArray = dietaryRestrictions
          .split(/[\,\s]+/)
          .map(tag => tag.trim().toUpperCase())
          .filter(tag => tag.length > 0);
      }
      return selectedFilters.every(filter => 
        restrictionsArray.includes(filter.toUpperCase())
      );
    });
  };

  const toggleItemSelection = (itemName) => {
    setSelectedItems(prev => {
      if (prev.includes(itemName)) {
        return prev.filter(item => item !== itemName);
      } else {
        return [...prev, itemName];
      }
    });
  };

  const handleCalculate = async () => {
    //calculate totals and open calculator module
    setCalcError(null);
    setCalcLoading(true);
    try {
      const names = selectedItems.slice();
      const results = await Promise.all(names.map((n) => fetchMacrosForItem(n)));
      const aggregated = results.filter((r) => !!r);
      const totals = sumFields(aggregated);
      setCalcTotals(totals);
      setCalcStats({ selected: names.length, aggregated: aggregated.length, missing: names.length - aggregated.length });
      //show the names in modal header line
      setCalcSelectedNames(names); 
      setShowCalcModal(true);
    } catch (e) {
      setCalcError('Failed to calculate totals');
    } finally {
      setCalcLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="menu-detail-container">
        <div className="loading">Loading menu...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="menu-detail-container">
        <div className="error">Error: {error}</div>
        <Link to="/" className="back-button">Back to Dining Halls</Link>
      </div>
    );
  }

  // Resolve source key using alias map when direct key not found
  const sourceKey = menuData[decodedName] ? decodedName : (aliasMap[decodedName] || decodedName); // Pick actual key if name changed
  const diningHallMenu = menuData[sourceKey];
  if (!diningHallMenu) {
    return (
      <div className="menu-detail-container">
        <div className="error">Menu not found for {decodedName}</div>
        <Link to="/" className="back-button">Back to Dining Halls</Link>
      </div>
    );
  }

  const organizedMenu = organizeMenuByMealType(diningHallMenu);

  // Determine if no items match filters across all meal types and subcategories
  const noResults = selectedFilters.length > 0 && Object.values(organizedMenu).every((value) => {
    if (Array.isArray(value)) {
      return filterItems(value).length === 0;
    }
    if (value && typeof value === 'object') {
      return Object.values(value).every((items) => filterItems(items).length === 0);
    }
    return true;
  });

  const orderedMealEntries = Object.entries(organizedMenu).sort(
    ([mealTypeA], [mealTypeB]) => {
      const idxA = sortedMeals.indexOf(mealTypeA);
      const idxB = sortedMeals.indexOf(mealTypeB);
      const safeA = idxA === -1 ? 999 : idxA;
      const safeB = idxB === -1 ? 999 : idxB;
      return safeA - safeB;
    }
  );

  return (
    <div className="menu-detail-container">
      <Link to="/" className="back-button">← Back to Dining Halls</Link>
      <h1>{decodedName}</h1>

      <CurrentMealBanner hallName={decodedName} />

      <div className="menu-detail-content">
        <MenuFilter 
          selectedFilters={selectedFilters}
          onFilterChange={setSelectedFilters}
        />
        <div className="menu-main-content">
          <div className="menu-content">
          {orderedMealEntries.map(([mealType, value]) => {
            const isSubcategoryObject = value && typeof value === 'object' && !Array.isArray(value);

            if (!isSubcategoryObject) {
              const filteredItems = filterItems(Array.isArray(value) ? value : []);
              if (filteredItems.length === 0) return null;
              return (
                <div key={mealType} className="menu-section">
                  <h2>{mealType}</h2>
                  <div className="menu-cards-grid">
                    {filteredItems.map((item, index) => {
                      const itemName = typeof item === 'string' ? item : item.name;
                      const dietaryRestrictions = typeof item === 'object' ? item.dietary_restrictions : null;
                      const price = typeof item === 'object' ? item.price : null;
                      const averageRating = typeof item === 'object' ? item.avg_rating : null;
                      return (
                        <MenuCard
                          key={index}
                          itemName={itemName}
                          dietaryRestrictions={dietaryRestrictions}
                          price={price}
                          averageRating={averageRating}
                          diningHall={decodedName}
                          isSelected={selectedItems.includes(itemName)}
                          onToggleSelect={toggleItemSelection}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            }

           // With subcategories (Soups, Entrees, etc.)
           const subcategories = Object.entries(value);
           const anySubHasItems = subcategories.some(([_, items]) => {
             const filteredSubItems = filterItems(items);
             return filteredSubItems.length > 0;
           });
           if (!anySubHasItems) return null;

            return (
              <div key={mealType} className="menu-section">
                <h2>{mealType}</h2>
                {subcategories.map(([subCategory, items]) => {
                  const filteredSubItems = filterItems(items);
                  if (filteredSubItems.length === 0) return null;
                  return (
                    <div key={subCategory}>
                      <h3 style={{ color: '#003C6C', margin: '8px 0' }}>{subCategory}</h3>
                      <div className="menu-cards-grid">
                        {filteredSubItems.map((item, index) => {
                          const itemName = typeof item === 'string' ? item : item.name;
                          const dietaryRestrictions = typeof item === 'object' ? item.dietary_restrictions : null;
                          const price = typeof item === 'object' ? item.price : null;
                          const averageRating = typeof item === 'object' ? item.avg_rating : null;
                          return (
                            <MenuCard
                              key={index}
                              itemName={itemName}
                              dietaryRestrictions={dietaryRestrictions}
                              price={price}
                              averageRating={averageRating}
                              diningHall={decodedName}
                              isSelected={selectedItems.includes(itemName)}
                              onToggleSelect={toggleItemSelection}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {noResults && (
            <div className="no-results">
              No items match the selected filters. Try adjusting your selections.
            </div>
          )}
          </div>
          <TodayHours diningHallName={decodedName} />
        </div>
      </div>

      {/* Sticky Calculate Button */}
      {selectedItems.length > 0 && (
        <button 
          className="calculate-button"
          onClick={handleCalculate}
        >
          Calculate ({selectedItems.length})
        </button>
      )}

      {/*Macro Calculator module to show*/}
      {showCalcModal && (
        <div className="popup-overlay" onClick={() => setShowCalcModal(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <button className="popup-close" onClick={() => setShowCalcModal(false)}>×</button>
            <div>
              <h2>Total Nutrition</h2>
              {calcLoading && <p>Calculating...</p>}
              {calcError && <p style={{ color: 'red' }}>{calcError}</p>}
              {!calcLoading && calcTotals && (
                <>
                  {/*show selected item names*/}
                  <p>{formatSelectionHeader(calcSelectedNames, calcStats.selected)}</p>
                  {SUM_FIELDS.map(({ key, label }) => {
                    const val = Number.isFinite(calcTotals[key]) ? calcTotals[key] : 0;
                    const unit = SUM_UNITS[key] || '';
                    return (
                      <p key={key}>
                        {label}: {val}{unit ? ` ${unit}` : ''}
                      </p>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MenuDetail;
