import React, { useState } from 'react';
import { Range } from 'react-range';
import styles from './ProductFilter.module.css';

const ProductFilter = ({ categories, onFilterUpdate, initialFilters }) => {
  const [priceRange, setPriceRange] = useState({
    min: initialFilters?.priceRange?.min || 0,
    max: initialFilters?.priceRange?.max || 1000
  });
  const [selectedCategories, setSelectedCategories] = useState(
    initialFilters?.categories || []
  );

  const handleSliderChange = (values) => {
    const min = Math.floor(values[0]);
    const max = Math.ceil(values[1]);
    setPriceRange({ min, max });
  };

  const handleInputPriceChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseInt(value, 10);

    if (isNaN(numValue)) return;

    setPriceRange((prev) => {
      let newPrice = { ...prev, [name]: numValue };
      if (name === 'min') newPrice.max = Math.max(newPrice.max, numValue);
      if (name === 'max') newPrice.min = Math.min(newPrice.min, numValue);
      return newPrice;
    });
  };

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  const handleApply = () => {
    onFilterUpdate({
      priceRange: { min: priceRange.min, max: priceRange.max },
      categories: selectedCategories
    });
  };

  const handleReset = () => {
    setPriceRange({ min: 0, max: 100000 });
    setSelectedCategories([]);
    onFilterUpdate({ priceRange: { min: 0, max: 100000 }, categories: [] });
  };

  return (
    <div className={styles.productFilter}>
      <div className={styles.filterSection}>
        <h2>Price Range</h2>
        <div className={styles.rangeSlider}>
          <Range
            values={[priceRange.min, priceRange.max]}
            onChange={handleSliderChange}
            min={0}
            max={100000}
            step={100}
            renderTrack={({ props, children }) => (
              <div {...props} className={styles.rangeTrack}>{children}</div>
            )}
            renderThumb={({ props }) => (
              <div {...props} className={styles.rangeThumb} />
            )}
          />
        </div>
        <div className={styles.priceInputs}>
          <input
            type="number"
            name="min"
            value={priceRange.min}
            onChange={handleInputPriceChange}
            placeholder="Min"
            min={0}
            className={styles.priceInput}
          />
          <input
            type="number"
            name="max"
            value={priceRange.max}
            onChange={handleInputPriceChange}
            placeholder="Max"
            min={priceRange.min}
            className={styles.priceInput}
          />
        </div>
      </div>

      <div className={styles.filterSection}>
        <h2>Categories</h2>
        <div className={styles.categoryList}>
          {categories.map(category => (
            <label key={category} className={styles.categoryItem}>
              <input
                type="checkbox"
                value={category}
                checked={selectedCategories.includes(category)}
                onChange={handleCategoryChange}
                className={styles.categoryCheckbox}
              />
              <span className={styles.categoryLabel}>{category}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <button className={`${styles.btn} ${styles.apply}`} onClick={handleApply}>Apply Filters</button>
        <button className={`${styles.btn} ${styles.reset}`} onClick={handleReset}>Reset Filters</button>
      </div>
    </div>
  );
};

export default ProductFilter;
