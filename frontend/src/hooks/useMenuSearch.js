import { useState, useEffect, useMemo } from 'react';

// Custom hook for menu search functionality
const useMenuSearch = () => {
  const [allMenuData, setAllMenuData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch menu data from all dining halls
  useEffect(() => {
    const fetchAllMenuData = async () => {
      try {
        setLoading(true);
        const response = await fetch('https://ucsc-dining-cse115a.github.io/project/menu_data.json');
        if (!response.ok) {
          throw new Error('Failed to fetch menu data');
        }
        const data = await response.json();
        
        // Flatten all menu items from all dining halls
        const flattenedItems = [];
        const halls = data.halls || data;
        
        Object.entries(halls).forEach(([diningHallName, menuData]) => {
          if (menuData && typeof menuData === 'object') {
            Object.entries(menuData).forEach(([mealType, categories]) => {
              if (categories && typeof categories === 'object') {
                Object.entries(categories).forEach(([category, items]) => {
                  if (Array.isArray(items)) {
                    items.forEach((item, index) => {
                      if (item && item.name) {
                        flattenedItems.push({
                          id: `${diningHallName}-${mealType}-${category}-${index}`,
                          itemName: item.name,
                          diningHall: diningHallName,
                          mealType: mealType,
                          category: category,
                          dietaryRestrictions: item.dietary_restrictions || [],
                          averageRating: item.avg_rating || 0
                        });
                      }
                    });
                  }
                });
              }
            });
          }
        });
        
        setAllMenuData(flattenedItems);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMenuData();
  }, []);

  // Word boundary matching function - matches only whole words or word beginnings
  const isWordMatch = (text, searchWord) => {
    // Split text into words by spaces, hyphens, parentheses, slashes
    const words = text.toLowerCase().split(/[\s\-\(\)\/]+/);
    const searchLower = searchWord.toLowerCase();
    
    return words.some(word => {
      // Exact word match or word beginning match
      return word === searchLower || word.startsWith(searchLower);
    });
  };

  // Search function with word boundary matching
  const searchMenuItems = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    const searchLower = searchTerm.toLowerCase();
    const keywords = searchLower.split(' ').filter(keyword => keyword.length > 0);

    return allMenuData.filter(item => {
      // Check if all keywords match as whole words or word beginnings
      return keywords.every(keyword => isWordMatch(item.itemName, keyword));
    }).slice(0, 15); // Limit results to 15 items
  };

  return {
    searchMenuItems,
    loading,
    error,
    totalItems: allMenuData.length
  };
};

export default useMenuSearch;