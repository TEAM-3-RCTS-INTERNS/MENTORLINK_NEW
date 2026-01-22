import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import HomeNavbar from "../components/common/HomeNavbar";
import Sidebar from "../components/home/Sidebar";
import FilterPanel from "../components/home/FilterPanel";
import StudentCard from "./StudentCard";
import Footer from "../components/common/Footer";
import { studentAPI } from "../services/api";
import { useLayout } from "../contexts/LayoutContext";
import "./Students.css";

const Students = () => {
  const navigate = useNavigate();
  const { getLayoutClass } = useLayout();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  const [filters, setFilters] = useState({
    query: "",
    domains: [],
    companies: [],
  });

  // Fetch students from API
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getAllStudents();
      const fetchedStudents = response.students || [];
      setStudents(fetchedStudents);
      setTotalCount(fetchedStudents.length);
      setError(null);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter logic
  const filtered = useMemo(() => {
    let list = [...students];
    const q = filters.query.trim().toLowerCase();

    if (q) {
      list = list.filter(
        (s) => {
          const name = s.user?.name || s.name || "";
          const role = s.roleStatus || "";
          const fields = s.mentorshipField || [];
          const goal = s.goal || "";

          return (
            name.toLowerCase().includes(q) ||
            role.toLowerCase().includes(q) ||
            goal.toLowerCase().includes(q) ||
            fields.some((f) => f.toLowerCase().includes(q))
          );
        }
      );
    }

    // Filter by domains
    if (filters.domains.length) {
      list = list.filter((s) =>
        s.mentorshipField?.some((d) => filters.domains.includes(d))
      );
    }

    return list;
  }, [students, filters]);

  // Extract unique domains from students
  const availableDomains = useMemo(() => {
    const domainsSet = new Set();
    students.forEach(s => {
      if (s.mentorshipField && Array.isArray(s.mentorshipField)) {
        s.mentorshipField.forEach(d => domainsSet.add(d));
      }
    });
    return Array.from(domainsSet).sort();
  }, [students]);

  // Loading skeleton
  const renderSkeletonCards = (count = 6) => {
    return Array.from({ length: count }).map((_, idx) => (
      <div key={`skeleton-${idx}`} className="student-card-skeleton">
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
        </div>
        <div className="skeleton-buttons">
          <div className="skeleton-button"></div>
        </div>
      </div>
    ));
  };

  return (
    <>
      <HomeNavbar />
      <div className="students-page">
        <div className={getLayoutClass()}>
          <Sidebar />

          <main className="home-main">
            <div className="main-header">
              <div className="title">Our Students</div>
              <p className="subtitle">
                Explore our community of learners and career switchers! Each
                student is looking to grow, learn, and connect with mentors.
              </p>
            </div>

            <div className="toolbar">
              <input
                className="search"
                placeholder="Search students by name, role, or skills..."
                value={filters.query}
                onChange={(e) =>
                  setFilters({ ...filters, query: e.target.value })
                }
              />
            </div>

            {/* Results count */}
            {!loading && (
              <div className="results-count">
                Showing <strong>{filtered.length}</strong> of <strong>{totalCount}</strong> students
              </div>
            )}

            <div className="cards">
              {loading ? (
                renderSkeletonCards(6)
              ) : error && students.length === 0 ? (
                <div className="error-message-box">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <h3>Failed to load students</h3>
                  <p>{error}</p>
                  <button className="retry-btn" onClick={fetchStudents}>
                    Retry
                  </button>
                </div>
              ) : filtered.length > 0 ? (
                filtered.map((s) => (
                  <StudentCard
                    key={s._id || s.id}
                    student={s}
                    onClick={() => {
                      if (s._id) {
                        navigate(`/students/${s._id}`);
                      } else {
                        console.error('Student ID is missing:', s);
                        alert('Unable to view this student profile - ID is missing');
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
                  <h3>No students found</h3>
                  <p>
                    {students.length === 0
                      ? "No students have registered yet. Check back soon!"
                      : "Try adjusting your search or filters to find more students."}
                  </p>
                  {filters.query && (
                    <button
                      className="clear-filters-btn"
                      onClick={() => setFilters({ query: "", domains: [], companies: [] })}
                    >
                      Clear Search
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* Footer inside main for correct responsive width */}
            <Footer />
          </main>

          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            availableDomains={availableDomains}
          />
        </div>
      </div>
    </>
  );
};

export default Students;
