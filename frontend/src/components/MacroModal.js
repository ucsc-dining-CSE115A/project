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

// Minimal display-only implementation for showing 16 macro fields
const MacroModal = ({ itemName, macroData }) => {
    const [macros, setMacros] = useState(null);
    const [loading, setLoading] = useState(true);

    // Ordered field config aligned with Supabase column order
    // type=json fields are expected to have shape { amount: string, dv: string }
    const FIELD_CONFIG = [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'serving_size', label: 'Serving Size', type: 'text' },
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
        // These four are not JSON, they are text
        { key: 'vitamin_d', label: 'Vitamin D', type: 'text' },
        { key: 'calcium', label: 'Calcium', type: 'text' },
        { key: 'iron', label: 'Iron', type: 'text' },
        { key: 'potassium', label: 'Potassium', type: 'text' },
        // Omit long fields for cleaner modal per team decision
    ];

    // Format json nutrient fields into a friendly string
    function formatJsonField(val) {
        if (!val || typeof val !== 'object') return '—';
        const amount = typeof val.amount === 'string' ? val.amount : null;
        const dv = typeof val.dv === 'string' ? val.dv : null;
        if (amount && dv) return `${amount} (${dv})`;
        if (amount) return amount;
        if (dv) return dv;
        return '—';
    }

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

    // Display 16 fields in Supabase order
    console.log('📋 Displaying macro data:', macros);
    return (
        <div>
            <h2>{itemName}</h2>
            {FIELD_CONFIG.map(({ key, label, type }) => {
                const raw = macros ? macros[key] : null;
                const value = type === 'json' ? formatJsonField(raw) : (raw || '—');
                return (
                    <p key={key}>
                        {label}: {value}
                    </p>
                );
            })}
        </div>
    );
};

export default MacroModal;