import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import HomeNavbar from '../components/common/HomeNavbar';
import Sidebar from '../components/home/Sidebar';
import FilterPanel from '../components/home/FilterPanel';
import MentorCard from '../components/home/MentorCard';
import Footer from '../components/common/Footer';
import { mentorAPI } from '../services/api';
import { useLayout } from '../contexts/LayoutContext';
import './Mentors.css';

const Mentors = () => {
  const navigate = useNavigate();
  const { getLayoutClass } = useLayout();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState({
    query: '',
    sort: 'experience-desc',
    domains: [],
    companies: [],
  });

  // Fetch mentors from API with pagination
  const fetchMentors = async (pageNum = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params = {
        page: pageNum,
        limit: 12,
        search: filters.query || undefined,
        sort: filters.sort || undefined,
      };

      const response = await mentorAPI.getAllMentors(params);

      const newMentors = response.mentors || [];
      const total = response.total || newMentors.length;
      const currentPage = response.page || pageNum;
      const limit = response.limit || 12;

      if (append) {
        setMentors(prev => [...prev, ...newMentors]);
      } else {
        setMentors(newMentors);
      }

      setTotalCount(total);
      setHasMore(newMentors.length === limit && mentors.length + newMentors.length < total);
      setPage(currentPage);
      setError(null);
    } catch (err) {
      console.error('Error fetching mentors:', err);
      setError(err.message || 'Failed to load mentors');
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchMentors(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when search or sort changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (!loading) {
        setPage(1);
        fetchMentors(1, false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, filters.sort]);

  // Load more mentors
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      fetchMentors(nextPage, true);
    }
  };

  // Client-side filtering for domains and companies
  const filtered = useMemo(() => {
    let list = [...mentors];

    // Filter by domains
    if (filters.domains.length > 0) {
      list = list.filter(m => {
        const mentorDomains = [
          m.primaryDomain,
          m.secondaryDomain,
          ...(m.domains || [])
        ].filter(Boolean);

        return filters.domains.some(d =>
          mentorDomains.some(md => md && md.toLowerCase().includes(d.toLowerCase()))
        );
      });
    }

    // Filter by companies
    if (filters.companies.length > 0) {
      list = list.filter(m => {
        const company = m.company || '';
        return filters.companies.includes(company);
      });
    }

    // Client-side sort (in case backend doesn't support it)
    if (filters.sort) {
      if (filters.sort === 'recent') {
        // Recently joined - sort by ID descending (assuming higher ID = more recent)
        list.sort((a, b) => {
          const idA = a._id || a.id || 0;
          const idB = b._id || b.id || 0;
          return String(idB).localeCompare(String(idA));
        });
      } else {
        const [field, order] = filters.sort.split('-');

        list.sort((a, b) => {
          let aVal, bVal;

          switch (field) {
            case 'experience': {
              const getExp = (m) => {
                const exp = m.primaryExperience || m.experience || '0';
                const match = String(exp).match(/\d+/);
                return match ? parseInt(match[0]) : 0;
              };
              aVal = getExp(a);
              bVal = getExp(b);
              break;
            }
            case 'followers':
              aVal = a.user?.followersCount || a.followersCount || 0;
              bVal = b.user?.followersCount || b.followersCount || 0;
              break;
            case 'mentees':
              aVal = a.menteesCount || a.activeMentees?.length || 0;
              bVal = b.menteesCount || b.activeMentees?.length || 0;
              break;
            case 'name': {
              const nameA = a.user?.name || a.name || '';
              const nameB = b.user?.name || b.name || '';
              return order === 'asc'
                ? nameA.localeCompare(nameB)
                : nameB.localeCompare(nameA);
            }
            default:
              return 0;
          }

          return order === 'desc' ? bVal - aVal : aVal - bVal;
        });
      }
    }

    return list;
  }, [mentors, filters]);

  // Extract unique domains and companies from fetched mentors for FilterPanel
  const availableDomains = useMemo(() => {
    const domainsSet = new Set();
    mentors.forEach(m => {
      if (m.primaryDomain) domainsSet.add(m.primaryDomain);
      if (m.secondaryDomain) domainsSet.add(m.secondaryDomain);
      if (m.domains && Array.isArray(m.domains)) {
        m.domains.forEach(d => domainsSet.add(d));
      }
    });
    return Array.from(domainsSet).sort();
  }, [mentors]);

  const availableCompanies = useMemo(() => {
    const companiesSet = new Set();
    mentors.forEach(m => {
      if (m.company) companiesSet.add(m.company);
    });
    return Array.from(companiesSet).sort();
  }, [mentors]);

  // Loading skeleton
  const renderSkeletonCards = (count = 6) => {
    return Array.from({ length: count }).map((_, idx) => (
      <div key={`skeleton-${idx}`} className="mentor-card-skeleton">
        <div className="skeleton-header">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-text-group">
            <div className="skeleton-line skeleton-line-title"></div>
            <div className="skeleton-line skeleton-line-subtitle"></div>
          </div>
        </div>
        <div className="skeleton-line skeleton-line-bio"></div>
        <div className="skeleton-line skeleton-line-bio short"></div>
        <div className="skeleton-stats">
          <div className="skeleton-stat"></div>
          <div className="skeleton-stat"></div>
        </div>
        <div className="skeleton-buttons">
          <div className="skeleton-button"></div>
          <div className="skeleton-button"></div>
        </div>
      </div>
    ));
  };

  return (
    <>
      <HomeNavbar />
      <div className="mentors-page-wrapper">
        <div className={getLayoutClass()}>
          <Sidebar />

          <main className="home-main">
            <div className="main-header">
              <div className="title">Our Mentors</div>
              <p className="subtitle">
                Discover the latest additions to our Mentors community! Meet the fresh faces ready to guide and inspire you on your journey
              </p>
            </div>

            <div className="toolbar">
              <input
                className="search"
                placeholder="Search by name, role, or skills..."
                value={filters.query}
                onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              />
              <select
                className="sort"
                value={filters.sort}
                onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              >
                <option value="experience-desc">Sort By: Experience (High to Low)</option>
                <option value="experience-asc">Sort By: Experience (Low to High)</option>
                <option value="followers-desc">Sort By: Followers (High to Low)</option>
                <option value="followers-asc">Sort By: Followers (Low to High)</option>
                <option value="mentees-desc">Sort By: Mentees (High to Low)</option>
                <option value="mentees-asc">Sort By: Mentees (Low to High)</option>
                <option value="name-asc">Sort By: Name (A-Z)</option>
                <option value="name-desc">Sort By: Name (Z-A)</option>
                <option value="recent">Sort By: Recently Joined</option>
              </select>
            </div>

            {/* Results count */}
            {!loading && (
              <div className="results-count">
                Showing {filtered.length} of {totalCount} mentors
              </div>
            )}

            <div className="cards">
              {loading && !loadingMore ? (
                renderSkeletonCards(6)
              ) : error && mentors.length === 0 ? (
                <div className="error-message-box">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <h3>Failed to load mentors</h3>
                  <p>{error}</p>
                  <button className="retry-btn" onClick={() => fetchMentors(1, false)}>
                    Retry
                  </button>
                </div>
              ) : filtered.length > 0 ? (
                filtered.map((m) => (
                  <MentorCard
                    key={m._id || m.id}
                    mentor={m}
                    onClick={() => {
                      if (m._id) {
                        navigate(`/mentors/${m._id}`);
                      } else {
                        console.error('Mentor ID is missing:', m);
                        alert('Unable to view this mentor profile - ID is missing');
                      }
                    }}
                  />
                ))
              ) : (
                <div className="no-results-box">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <h3>No mentors found</h3>
                  <p>
                    {filters.query || filters.domains.length > 0 || filters.companies.length > 0
                      ? 'Try adjusting your filters or search query'
                      : 'No mentors have registered yet'}
                  </p>
                  {(filters.query || filters.domains.length > 0 || filters.companies.length > 0) && (
                    <button
                      className="clear-filters-btn"
                      onClick={() => setFilters({ query: '', sort: 'experience-desc', domains: [], companies: [] })}
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Loading more skeletons */}
            {loadingMore && (
              <div className="cards">
                {renderSkeletonCards(6)}
              </div>
            )}

            {/* See More Button */}
            {!loading && hasMore && filtered.length > 0 && (
              <div className="see-more-wrap">
                <button
                  className="see-more"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading...' : `See More (${totalCount - filtered.length} remaining)`} ▸
                </button>
              </div>
            )}

            {/* End of results message */}
            {!loading && !hasMore && mentors.length > 0 && (
              <div className="end-of-results">
                <p>You've reached the end of the list</p>
              </div>
            )}

            {/* Footer inside main for correct responsive width */}
            <Footer />
          </main>

          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            availableDomains={availableDomains}
            availableCompanies={availableCompanies}
          />
        </div>
      </div>
    </>
  );
};

export default Mentors;
