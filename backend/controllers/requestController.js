const mongoose = require('mongoose');
const MentorshipRequest = require('../models/MentorshipRequest');
const User = require('../models/User');
const Mentor = require('../models/Mentor');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');

// @desc    Submit a mentorship request
// @route   POST /api/requests/:mentorId
// @access  Private (Student)
const submitRequest = async (req, res) => {
  try {
    const studentUserId = req.user._id;
    const mentorUserId = req.params.mentorId;

    // Validate inputs
    const { message, bio, reasonForMentorship, currentPriorities, supportAreas, attachedFiles, contactInfo } = req.body;

    if (!message || !bio || !reasonForMentorship || !currentPriorities || !supportAreas) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if mentor exists
    const mentorUser = await User.findById(mentorUserId);
    if (!mentorUser || mentorUser.role !== 'mentor') {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    // Check if student has already sent a request to this mentor
    const existingRequest = await MentorshipRequest.findOne({
      student: studentUserId,
      mentor: mentorUserId,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending or accepted request with this mentor' });
    }

    // Get student profile
    const studentProfile = await Student.findOne({ user: studentUserId });

    // Create new request
    const newRequest = await MentorshipRequest.create({
      student: studentUserId,
      mentor: mentorUserId,
      message,
      bio,
      reasonForMentorship,
      currentPriorities,
      supportAreas,
      attachedFiles: attachedFiles || [],
      contactInfo: contactInfo || {},
      studentProfile: studentProfile?._id,
    });

    await newRequest.populate('student', 'name email profileImage');

    res.status(201).json({
      message: 'Mentorship request submitted successfully',
      request: newRequest,
    });
  } catch (error) {
    console.error('Error in submitRequest:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all mentorship requests for logged-in mentor
// @route   GET /api/requests?status=pending
// @access  Private (Mentor)
const getMentorRequests = async (req, res) => {
  try {
    const mentorUserId = req.user._id;
    const { status } = req.query;

    // Build query
    const query = { mentor: mentorUserId };
    if (status) {
      query.status = status;
    }

    const requests = await MentorshipRequest.find(query)
      .populate('student', 'name email profileImage bio location')
      .populate('studentProfile')
      .sort({ createdAt: -1 });

    res.json({
      requests,
      count: requests.length,
    });
  } catch (error) {
    console.error('Error in getMentorRequests:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a specific mentorship request by ID
// @route   GET /api/requests/:requestId
// @access  Private (Mentor)
const getRequestById = async (req, res) => {
  try {
    const { requestId } = req.params;
    const mentorUserId = req.user._id;

    const request = await MentorshipRequest.findOne({
      _id: requestId,
      mentor: mentorUserId,
    })
      .populate('student', 'name email profileImage bio location')
      .populate('studentProfile');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json({ request });
  } catch (error) {
    console.error('Error in getRequestById:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept a mentorship request
// @route   PUT /api/requests/:requestId/accept
// @access  Private (Mentor)
// @desc    Accept a mentorship request
// @route   PUT /api/requests/:requestId/accept
// @access  Private (Mentor)
const acceptRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const mentorUserId = req.user._id;

    const request = await MentorshipRequest.findOne({
      _id: requestId,
      mentor: mentorUserId,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({ message: 'Pending request not found' });
    }

    // Create conversation
    const conversation = await Conversation.findOrCreateConversation(mentorUserId, request.student);

    // Update request status and details
    request.status = 'accepted';
    request.startDate = new Date();
    request.role = 'current';
    request.chatId = conversation ? conversation._id : null;
    request.meta = {
      acceptedBy: mentorUserId,
      acceptedAt: new Date()
    };

    await request.save();

    // Add student to mentor's activeMentees (Legacy support)
    const mentor = await Mentor.findOne({ user: mentorUserId });
    if (mentor) {
      if (!mentor.activeMentees) {
        mentor.activeMentees = [];
      }
      // Fix: Use proper ObjectId comparison
      const studentExists = mentor.activeMentees.some(
        (menteeId) => menteeId.toString() === request.student.toString()
      );

      if (!studentExists) {
        mentor.activeMentees.push(request.student);
        // Update mentees count
        mentor.menteesCount = mentor.activeMentees.length;
        await mentor.save();
      }
    }

    // Get mentor and student details for notifications
    const mentorUser = await User.findById(mentorUserId);
    const studentUser = await User.findById(request.student);

    // Create notification for student
    await Notification.createNotification(request.student, {
      type: 'request',
      title: 'Mentorship Request Accepted!',
      message: `${mentorUser.name} has accepted your mentorship request. You can now chat and schedule sessions!`,
      link: `/mentor-profile/${mentor._id}`,
      icon: 'check-circle',
      data: {
        mentorId: mentorUserId,
        mentorName: mentorUser.name,
        requestId: request._id,
      },
    });

    // Create notification for mentor
    await Notification.createNotification(mentorUserId, {
      type: 'request',
      title: 'Request Accepted',
      message: `You accepted ${studentUser.name}'s mentorship request. They are now your active mentee!`,
      link: `/mentor-profile`,
      icon: 'check-circle',
      data: {
        studentId: request.student,
        studentName: studentUser.name,
        requestId: request._id,
      },
    });

    await request.populate('student', 'name email profileImage');

    res.json({
      message: 'Request accepted successfully',
      request,
    });
  } catch (error) {
    console.error('Error in acceptRequest:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject a mentorship request
// @route   PUT /api/requests/:requestId/reject
// @access  Private (Mentor)
const rejectRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const mentorUserId = req.user._id;

    const request = await MentorshipRequest.findOne({
      _id: requestId,
      mentor: mentorUserId,
      status: 'pending',
    });

    if (!request) {
      return res.status(404).json({ message: 'Pending request not found' });
    }

    // Update request status
    request.status = 'rejected';
    await request.save();

    await request.populate('student', 'name email profileImage');

    res.json({
      message: 'Request rejected',
      request,
    });
  } catch (error) {
    console.error('Error in rejectRequest:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all requests submitted by logged-in student
// @route   GET /api/requests/my-requests?status=pending
// @access  Private (Student)
const getMyRequests = async (req, res) => {
  try {
    const studentUserId = req.user._id;
    const { status } = req.query;

    // Build query
    const query = { student: studentUserId };
    if (status) {
      query.status = status;
    }

    const requests = await MentorshipRequest.find(query)
      .populate('mentor', 'name email profileImage bio')
      .sort({ createdAt: -1 });

    // For each request, fetch the mentor profile
    const requestsWithMentorProfiles = await Promise.all(
      requests.map(async (request) => {
        if (request.mentor) {
          const mentorProfile = await Mentor.findOne({ user: request.mentor._id })
            .populate('user', 'name email profileImage bio location');

          return {
            ...request.toObject(),
            mentor: mentorProfile,
          };
        }
        return request.toObject();
      })
    );

    res.json({
      requests: requestsWithMentorProfiles,
      count: requestsWithMentorProfiles.length,
    });
  } catch (error) {
    console.error('Error in getMyRequests:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all mentors who accepted the student
// @route   GET /api/requests/my-mentors
// @access  Private (Student)
const getMyMentors = async (req, res) => {
  try {
    const studentUserId = req.user._id;

    // Find all accepted requests
    const acceptedRequests = await MentorshipRequest.find({
      student: studentUserId,
      status: 'accepted'
    }).populate('mentor', 'name email profileImage');

    // Get unique mentor user IDs
    const mentorUserIds = [...new Set(acceptedRequests.map(req => req.mentor?._id).filter(Boolean))];

    // Find mentor profiles for these users
    const mentorProfiles = await Mentor.find({
      user: { $in: mentorUserIds }
    }).populate('user', 'name email profileImage bio location');

    res.json({
      mentors: mentorProfiles,
      count: mentorProfiles.length,
    });
  } catch (error) {
    console.error('Error in getMyMentors:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Check if two users have an accepted mentorship connection
// @route   GET /api/requests/check-mentorship-status/:userId
// @access  Private
const checkMentorshipStatus = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;

    // Check if there's an accepted mentorship request between these users
    // Either current user is mentor and other is student, or vice versa
    const acceptedRequest = await MentorshipRequest.findOne({
      $or: [
        { mentor: currentUserId, student: otherUserId, status: 'accepted' },
        { mentor: otherUserId, student: currentUserId, status: 'accepted' }
      ]
    });

    // Also check if there's a pending request (for showing different UI states)
    const pendingRequest = await MentorshipRequest.findOne({
      $or: [
        { mentor: currentUserId, student: otherUserId, status: 'pending' },
        { mentor: otherUserId, student: currentUserId, status: 'pending' }
      ]
    });

    res.json({
      canMessage: !!acceptedRequest,
      hasAcceptedConnection: !!acceptedRequest,
      hasPendingRequest: !!pendingRequest,
      connectionStatus: acceptedRequest ? 'accepted' : (pendingRequest ? 'pending' : 'none')
    });
  } catch (error) {
    console.error('Error in checkMentorshipStatus:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  submitRequest,
  getMentorRequests,
  getRequestById,
  acceptRequest,
  rejectRequest,
  getMyRequests,
  getMyMentors,
  checkMentorshipStatus,
};
