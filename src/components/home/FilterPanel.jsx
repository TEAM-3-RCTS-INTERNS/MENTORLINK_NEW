import React, { useState } from "react";
import { FiChevronRight, FiFilter } from "react-icons/fi";
import { useLayout } from "../../contexts/LayoutContext";
import "./FilterPanel.css";

const FilterPanel = ({ filters, setFilters, availableDomains = [], availableCompanies = [] }) => {
  const [domainSearch, setDomainSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const { filterCollapsed, toggleFilter } = useLayout();

  // Use provided domains/companies or fallback to defaults
  const allDomains = availableDomains.length > 0 ? availableDomains : [
    "Tech Mentor",
    "Startup Mentor",
    "Professor",
    "UI/UX Developer",
  ];

  const companies = availableCompanies.length > 0 ? availableCompanies : [
    "Google",
    "Microsoft",
    "Facebook",
    "Amazon"
  ];

  const toggleDomain = (d) => {
    const exists = filters.domains.includes(d);
    const next = exists
      ? filters.domains.filter((x) => x !== d)
      : [...filters.domains, d];
    setFilters({ ...filters, domains: next });
  };

  const toggleCompany = (c) => {
    const exists = filters.companies.includes(c);
    const next = exists
      ? filters.companies.filter((x) => x !== c)
      : [...filters.companies, c];
    setFilters({ ...filters, companies: next });
  };

  const filteredDomains = allDomains.filter((d) =>
    d.toLowerCase().includes(domainSearch.toLowerCase())
  );
  const filteredCompanies = companies.filter((c) =>
    c.toLowerCase().includes(companySearch.toLowerCase())
  );

  // Collapsed state - show only toggle button
  if (filterCollapsed) {
    return (
      <button 
        className="filter-panel__expand-btn"
        onClick={toggleFilter}
        title="Show filters"
        aria-label="Show filters"
      >
        <FiFilter />
      </button>
    );
  }

  return (
    <aside className="filter-panel">
      <button 
        className="filter-panel__toggle"
        onClick={toggleFilter}
        title="Hide filters"
        aria-label="Hide filters"
      >
        <FiChevronRight />
      </button>
      <div className="filter-panel__title">Filter by</div>

      <div className="filter-group">
        <label className="filter-label">Domain</label>
        <input
          className="filter-input"
          placeholder="Search for Domain"
          value={domainSearch}
          onChange={(e) => setDomainSearch(e.target.value)}
        />
        <div className="chip-list">
          {filteredDomains.map((d) => (
            <button
              key={d}
              className={`chip ${filters.domains.includes(d) ? "chip--active" : ""}`}
              onClick={() => toggleDomain(d)}
              type="button"
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label">Company</label>
        <input
          className="filter-input"
          placeholder="Search for Company"
          value={companySearch}
          onChange={(e) => setCompanySearch(e.target.value)}
        />
        <div className="chip-list">
          {filteredCompanies.map((c) => (
            <button
              key={c}
              className={`chip ${filters.companies.includes(c) ? "chip--active" : ""}`}
              onClick={() => toggleCompany(c)}
              type="button"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default FilterPanel;
