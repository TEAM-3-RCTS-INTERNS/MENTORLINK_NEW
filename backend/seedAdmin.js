const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const adminEmail = 'admin@mentorlink.com';
        const adminPassword = 'adminpassword123';

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin user already exists');

            // Update password - let the pre-save hook handle hashing
            existingAdmin.password = adminPassword;
            existingAdmin.role = 'admin';
            existingAdmin.isVerified = true;
            await existingAdmin.save();
            console.log('Admin password and role updated');
        } else {
            // Create new admin - password will be hashed by pre-save hook
            const newAdmin = await User.create({
                name: 'Admin User',
                username: 'admin',
                email: adminEmail,
                password: adminPassword,
                role: 'admin',
                isVerified: true,
                bio: 'System Administrator',
                gender: 'other'
            });
            console.log('Admin user created successfully');
        }

        console.log('-----------------------------------');
        console.log('Admin Credentials:');
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log('-----------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
