const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const admins = [
    {
        name: 'Admin User',
        username: 'admin',
        email: 'admin@mentorlink.com',
        password: 'Admin@123',
        bio: 'System Administrator - Primary',
        gender: 'other',
    },
    {
        name: 'Admin Manager',
        username: 'admin2',
        email: 'admin2@mentorlink.com',
        password: 'Admin2@123',
        bio: 'System Administrator - Secondary',
        gender: 'other',
    },
];

const createAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('                  ADMIN CREDENTIALS SETUP                   ');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        for (const adminData of admins) {
            const existingAdmin = await User.findOne({ email: adminData.email });
            
            if (existingAdmin) {
                console.log(`✓ Admin "${adminData.name}" already exists - updating...`);
                existingAdmin.password = adminData.password;
                existingAdmin.role = 'admin';
                existingAdmin.isVerified = true;
                await existingAdmin.save();
                console.log(`  Updated: ${adminData.email}`);
            } else {
                await User.create({
                    ...adminData,
                    role: 'admin',
                    isVerified: true,
                });
                console.log(`✓ Created new admin: ${adminData.name}`);
            }
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('                   ADMIN LOGIN CREDENTIALS                  ');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');
        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│  ADMIN 1 (Primary)                                      │');
        console.log('│  ─────────────────                                      │');
        console.log('│  Email:    admin@mentorlink.com                         │');
        console.log('│  Password: Admin@123                                    │');
        console.log('└─────────────────────────────────────────────────────────┘');
        console.log('');
        console.log('┌─────────────────────────────────────────────────────────┐');
        console.log('│  ADMIN 2 (Secondary - For Two-Person Rule)              │');
        console.log('│  ─────────────────────────────────────────              │');
        console.log('│  Email:    admin2@mentorlink.com                        │');
        console.log('│  Password: Admin2@123                                   │');
        console.log('└─────────────────────────────────────────────────────────┘');
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  NOTE: Two admins are required for the Two-Person Rule    ');
        console.log('  to approve critical actions like user deletion.          ');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('Error creating admins:', error);
        process.exit(1);
    }
};

createAdmins();
