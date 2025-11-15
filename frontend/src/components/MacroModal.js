import React from 'react';
import { supabase } from '../supabaseClient';
import { useState, useEffect } from 'react';

async function fetchMacroData(itemName) {
    console.log('🔍 Fetching macro data for:', itemName);
    console.log('🔍 Search pattern:', `%${itemName}%`);
    
    // First, let's see what's actually in the database
    const { data: allItems, error: allError } = await supabase
        .from('macros')
        .select('name');
    
    console.log('📋 ALL items in database:', allItems);
    console.log('📋 Looking for match with:', itemName);
    
    // Check if any item contains the search term
    if (allItems) {
        const matches = allItems.filter(item => 
            item.name && item.name.toLowerCase().includes(itemName.toLowerCase())
        );
        console.log('🔎 Manual filter matches:', matches);
    }
    
    const { data, error } = await supabase
        .from('macros')
        .select('*')
        .ilike('name', `%${itemName}%`);

    if (error) {
        console.error('❌ Error fetching macro data:', error);
        return null;
    }

    console.log('✅ Macro data received:', data);
    console.log('✅ Number of results:', data ? data.length : 0);
    console.log('✅ First result:', data && data.length > 0 ? data[0] : 'none');
    return data;
}

const MacroModal = ({ itemName, macroData }) => {
    const [macros, setMacros] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        console.log('📡 MacroModal mounted for item:', itemName);
        setLoading(true);
        fetchMacroData(itemName).then(result => {
            console.log('📊 Result from fetchMacroData:', result);
            console.log('📊 First item in result:', result ? result[0] : null);
            setMacros(result ? result[0] : null);
            setLoading(false);
        });
    }, [itemName]);

    // Handle loading state
    if (loading) {
        console.log('⏳ Loading macro data...');
        return <div><h2>{itemName}</h2><p>Loading macro data...</p></div>;
    }

    // Handle no data found
    if (!macros) {
        console.log('⚠️ No macro data found for:', itemName);
        return <div><h2>{itemName}</h2><p>No nutritional information available</p></div>;
    }

    // Display macro data
    console.log('📋 Displaying macro data:', macros);
    return (
        <div>
            <h2>{itemName}</h2>
            <p>Name: {macros.name}</p>
            <p>Calories: {macros.calories}</p>
            <p>Serving Size: {macros.serving_size}</p>
            {/* Add more macro fields as needed */}
        </div>
    );
};

export default MacroModal;