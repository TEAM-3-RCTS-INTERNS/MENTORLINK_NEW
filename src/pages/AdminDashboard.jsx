import React, { useState, useEffect } from 'react';
import HomeNavbar from '../components/common/HomeNavbar';
import Sidebar from '../components/home/Sidebar';
import { useAuth } from '../contexts/AuthContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        if (activeTab === 'users') {
            fetchUsers();
        }
    }, [activeTab, page, searchTerm]);

    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/admin/stats', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/admin/users?page=${page}&search=${searchTerm}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            setUsers(data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            fetchUsers();
            fetchStats();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    return (
        <div className="admin-dashboard-page">
            <HomeNavbar />
            <div className="app-container">
                <Sidebar />
                <div className="admin-content">
                    <div className="admin-header">
                        <h1>Admin Dashboard</h1>
                        <div className="admin-tabs">
                            <button
                                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                                onClick={() => setActiveTab('overview')}
                            >
                                Overview
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                                onClick={() => setActiveTab('users')}
                            >
                                User Management
                            </button>
                        </div>
                    </div>

                    {activeTab === 'overview' && stats && (
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>Total Users</h3>
                                <p className="stat-value">{stats.totalUsers}</p>
                            </div>
                            <div className="stat-card">
                                <h3>Total Mentors</h3>
                                <p className="stat-value">{stats.totalMentors}</p>
                            </div>
                            <div className="stat-card">
                                <h3>Active Mentorships</h3>
                                <p className="stat-value">{stats.activeMentorships}</p>
                            </div>
                            <div className="stat-card">
                                <h3>Total Sessions</h3>
                                <p className="stat-value">{stats.totalSessions}</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="users-section">
                            <div className="users-controls">
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                            </div>
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user._id}>
                                            <td>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.role}</td>
                                            <td>
                                                <button
                                                    className="delete-btn"
                                                    onClick={() => handleDeleteUser(user._id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
